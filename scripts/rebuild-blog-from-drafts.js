/**
 * =============================================================================
 * Rebuild static blog HTML from ALL drafts (any status) — read-only on status
 * =============================================================================
 *
 * What this script does:
 *   1. Reads every item in `drafts/pending-seo-pages.json` regardless of status
 *      (pending, approved, published, rejected, anything).
 *   2. For each item that has `body_markdown`, normalizes its `internal_links`,
 *      injects them into the markdown (idempotently — never inside an existing
 *      link, max one link per target), converts the markdown to HTML, and
 *      writes/overwrites `blog/{slug}/index.html` using the same page template
 *      as `publish-approved-blog-from-drafts.js`.
 *   3. Upserts every processed slug into `data/blog.json` (no duplicates;
 *      preserves the existing `featured` flag when a row already exists).
 *
 * What this script DOES NOT do:
 *   - It never mutates `status` in `drafts/pending-seo-pages.json`.
 *   - It never bumps `version` or rewrites the drafts file.
 *   - It never removes entries from `data/blog.json`.
 *
 * Usage:
 *   node scripts/rebuild-blog-from-drafts.js
 *   node scripts/rebuild-blog-from-drafts.js --verbose      # full link debug
 *   node scripts/rebuild-blog-from-drafts.js --dry-run      # don't touch disk
 *
 * Idempotent by design: rerunning produces byte-identical output for the same
 * inputs (only the daily `updatedDate` / `dateModified` strings refresh).
 *
 * Dependencies: Node.js core only (`fs`, `path`).
 * =============================================================================
 */

const fs = require("fs");
const path = require("path");

// ---------------------------------------------------------------------------
// Paths & config
// ---------------------------------------------------------------------------

const ROOT = path.resolve(__dirname, "..");
const DRAFTS_PATH = path.join(ROOT, "drafts", "pending-seo-pages.json");
const BLOG_JSON_PATH = path.join(ROOT, "data", "blog.json");
const SITE_ORIGIN = "https://calnexapp.com";

const DEBUG =
  process.argv.includes("--verbose") ||
  process.argv.includes("-v") ||
  process.env.PUBLISH_DEBUG === "1";

const DRY_RUN = process.argv.includes("--dry-run");

// ---------------------------------------------------------------------------
// Utilities: string / regex / slug
// ---------------------------------------------------------------------------

/**
 * Lowercase, trimmed status; used only for logging here.
 */
function normalizeDraftStatus(s) {
  return String(s == null ? "" : s)
    .trim()
    .toLowerCase();
}

/**
 * Sanitize a slug from a draft item: alphanumerics + hyphens, lowercased.
 */
function normSlug(item) {
  return String((item && item.slug) || "")
    .replace(/[^a-z0-9-]/gi, "")
    .toLowerCase();
}

/**
 * Escape characters that have HTML meaning.
 */
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Escape a literal string for use inside a RegExp.
 */
function escapeRegExp(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ---------------------------------------------------------------------------
// Markdown → HTML
// ---------------------------------------------------------------------------

/**
 * Inline markdown inside a single block: **bold** and [label](href).
 * Relative paths (/...) and absolute http(s) become <a> tags; anything else
 * renders as plain (escaped) text so we never emit broken hrefs.
 */
function inlineMarkdownToHtml(text) {
  let t = escapeHtml(text);
  t = t.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  t = t.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, href) => {
    const h = String(href).trim();
    if (!/^https?:\/\//i.test(h) && !h.startsWith("/")) {
      return escapeHtml(label);
    }
    return `<a href="${escapeHtml(h)}">${escapeHtml(label)}</a>`;
  });
  return t;
}

/**
 * Convert a markdown article body to HTML fragments.
 *   ## heading       → <h2>
 *   ### heading      → <h3>
 *   anything else    → <p> (single newlines inside the block are joined with spaces)
 */
function bodyMarkdownToHtml(md) {
  if (!md || typeof md !== "string") return "<p></p>";

  const chunks = md.split(/\n\n+/);
  const out = [];

  for (const raw of chunks) {
    const block = raw.trim();
    if (!block) continue;

    if (block.startsWith("### ")) {
      out.push(`<h3>${escapeHtml(block.slice(4).trim())}</h3>`);
    } else if (block.startsWith("## ")) {
      out.push(`<h2>${escapeHtml(block.slice(3).trim())}</h2>`);
    } else {
      const lines = block.split(/\n/).map((l) => l.trim()).filter(Boolean);
      const merged = lines.join(" ");
      out.push(`<p>${inlineMarkdownToHtml(merged)}</p>`);
    }
  }

  return out.join("\n        ");
}

// ---------------------------------------------------------------------------
// Internal-link injection (idempotent, body-safe)
// ---------------------------------------------------------------------------

/**
 * Extract the pathname from an absolute or relative URL string.
 */
function pathnameFromUrl(url, origin) {
  const u = String(url || "").trim();
  if (!u) return "";
  if (u.startsWith("/")) return u.split("?")[0].split("#")[0];
  try {
    const parsed = new URL(u);
    return parsed.pathname || "/";
  } catch {
    return u;
  }
}

/**
 * Produce a phrase list for matching in body markdown.
 * Order: full phrase first, then significant words (length > 2),
 * longest word first, deduplicated case-insensitively.
 */
function buildMatchPhrases(primary) {
  const text = String(primary || "").trim();
  if (!text) return [];

  const phrases = [];
  if (text.length >= 2) phrases.push(text);

  const words = text
    .split(/\s+/)
    .map((w) => w.replace(/^[^\w]+|[^\w]+$/g, ""))
    .filter((w) => w.length > 2);

  const byLen = [...new Set(words)].sort((a, b) => b.length - a.length);
  for (const w of byLen) phrases.push(w);

  const seen = new Set();
  const out = [];
  for (const p of phrases) {
    const k = p.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(p);
  }
  return out;
}

/**
 * Normalize one raw entry from draft.internal_links into a canonical spec.
 * Supports both shapes the project uses:
 *   { title, slug }                       (preferred / new)
 *   { url, anchor_text }                  (legacy)
 * Returns { targetKey, href, displayLabel, phrases[] } or null when unusable.
 *
 * `targetKey` is the dedupe identity:
 *   `blog:{slug}` for blog targets, `path:{href}` for other site paths.
 */
function normalizeInternalLinkEntry(raw, origin) {
  if (!raw || typeof raw !== "object") return null;

  if (raw.slug) {
    const slug = String(raw.slug).replace(/[^a-z0-9-]/gi, "").toLowerCase();
    if (!slug) return null;
    const display =
      String(raw.title || raw.anchor_text || slug.replace(/-/g, " ")).trim() || slug;
    return {
      targetKey: `blog:${slug}`,
      href: `/blog/${slug}/`,
      displayLabel: display,
      phrases: buildMatchPhrases(display)
    };
  }

  if (raw.url) {
    const pathname = pathnameFromUrl(raw.url, origin);
    const display = String(raw.anchor_text || pathname).trim();
    const blogMatch = pathname.match(/^\/blog\/([^/]+)\/?$/i);
    if (blogMatch) {
      const slug = blogMatch[1].replace(/[^a-z0-9-]/gi, "").toLowerCase();
      return {
        targetKey: `blog:${slug}`,
        href: `/blog/${slug}/`,
        displayLabel: display || slug,
        phrases: buildMatchPhrases(display || slug.replace(/-/g, " "))
      };
    }
    const href = pathname.startsWith("/") ? pathname : `/${pathname}`;
    return {
      targetKey: `path:${href}`,
      href,
      displayLabel: display || href,
      phrases: buildMatchPhrases(display || href)
    };
  }

  return null;
}

/**
 * Character ranges already inside `[label](href)` markdown links.
 * Used to guarantee we never re-link existing anchors (idempotent runs).
 */
function getMarkdownLinkRanges(md) {
  const ranges = [];
  const re = /\[[^\]]*\]\([^)]*\)/g;
  let m;
  while ((m = re.exec(md))) {
    ranges.push({ start: m.index, end: m.index + m[0].length });
  }
  return ranges;
}

function offsetInsideRanges(index, length, ranges) {
  const end = index + length;
  for (const r of ranges) {
    if (index < r.end && end > r.start) return true;
  }
  return false;
}

/**
 * Find the first regex match in `md` that is NOT inside any existing markdown link.
 */
function findFirstMatchOutsideLinks(md, regex) {
  const ranges = getMarkdownLinkRanges(md);
  // Always use a global clone so `lastIndex` advances between iterations and
  // we don't infinite-loop on a non-global regex passed by the caller.
  const flags = regex.flags.includes("g") ? regex.flags : regex.flags + "g";
  const re = new RegExp(regex.source, flags);
  let m;
  while ((m = re.exec(md))) {
    if (!offsetInsideRanges(m.index, m[0].length, ranges)) {
      return {
        match: m,
        before: md.slice(0, m.index),
        matched: m[0],
        after: md.slice(m.index + m[0].length)
      };
    }
    if (m.index === re.lastIndex) re.lastIndex++; // zero-width safety
  }
  return null;
}

/**
 * Inject internal links into a markdown string.
 *
 * Rules:
 *   - Deduplicate raw entries by targetKey (each destination linked at most once).
 *   - For each target, try phrases longest-first using two regex modes:
 *       1. `/(phrase)/i`                 (loose substring)
 *       2. `/\b(phrase)\b/i`             (word boundary)
 *   - Skip any match that lands inside an existing `[text](url)` span.
 *   - If a target still has no match, append it under a `## Related reading`
 *     list at the end of the markdown.
 *
 * Why this is idempotent on repeat runs:
 *   After the first pass, every target phrase now appears inside `[...](...)`,
 *   so `findFirstMatchOutsideLinks` skips it and the markdown is unchanged.
 *   The "Related reading" fallback section is appended only on the first run
 *   for any target that had no in-body match — and on subsequent runs the
 *   same fallback items are still wrapped in markdown links, so they're not
 *   re-appended.
 *
 * Returns { markdown, stats } where stats contains:
 *   { targets, injectedInBody, fallbackAppended, totalLinked }
 */
function injectInternalLinks(markdown, rawLinks) {
  const linksRaw = (Array.isArray(rawLinks) ? rawLinks : [])
    .map((r) => normalizeInternalLinkEntry(r, SITE_ORIGIN))
    .filter(Boolean);

  const seenKeys = new Set();
  const links = [];
  for (const L of linksRaw) {
    if (seenKeys.has(L.targetKey)) continue;
    seenKeys.add(L.targetKey);
    links.push(L);
  }

  const stats = {
    targets: links.length,
    injectedInBody: 0,
    fallbackAppended: 0,
    totalLinked: 0
  };

  if (!links.length) return { markdown: markdown || "", stats };

  let md = String(markdown || "");

  if (DEBUG) {
    const preview = md.length > 1200 ? md.slice(0, 1200) + "\n… [truncated]" : md;
    console.log("\n========== INTERNAL LINK DEBUG ==========");
    console.log("[internal-links] original markdown (preview):\n", preview);
    console.log(
      "[internal-links] targets:",
      links.map((l) => `${l.targetKey} → ${l.href}`)
    );
  }

  const fallbackLines = [];

  for (const L of links) {
    let linked = false;

    for (const phrase of L.phrases) {
      if (phrase.length < 2) continue;

      const esc = escapeRegExp(phrase);
      const candidates = [
        new RegExp(`(${esc})`, "i"),
        new RegExp(`\\b(${esc})\\b`, "i")
      ];

      for (const re of candidates) {
        const probe = findFirstMatchOutsideLinks(md, re);
        if (!probe) continue;

        const label = probe.match[1] != null ? probe.match[1] : probe.matched;
        md = probe.before + `[${label}](${L.href})` + probe.after;

        linked = true;
        stats.injectedInBody++;
        if (DEBUG) {
          console.log(
            `[internal-links] INJECTED ${L.targetKey} via phrase "${phrase}" (${
              re.source.includes("\\b") ? "word-boundary" : "substring"
            })`
          );
        }
        break;
      }

      if (linked) break;
    }

    if (!linked) {
      fallbackLines.push(`- [${L.displayLabel}](${L.href})`);
      stats.fallbackAppended++;
      if (DEBUG) {
        console.log(
          `[internal-links] FALLBACK queued for ${L.targetKey} (${L.href}) — no in-body phrase matched`
        );
      }
    }
  }

  if (fallbackLines.length) {
    md += `\n\n## Related reading\n\n${fallbackLines.join("\n")}\n`;
  }

  stats.totalLinked = stats.injectedInBody + stats.fallbackAppended;

  if (DEBUG) {
    console.log("[internal-links] summary:", stats);
    console.log("========== END INTERNAL LINK DEBUG ==========\n");
  }

  return { markdown: md, stats };
}

// ---------------------------------------------------------------------------
// FAQ helpers (HTML + JSON-LD)
// ---------------------------------------------------------------------------

function faqSectionHtml(faq) {
  if (!Array.isArray(faq) || !faq.length) return "";

  const items = faq
    .map((f) => {
      if (!f || !f.question) return "";
      return `<div class="faq-item"><h3 class="h4">${escapeHtml(f.question)}</h3><p>${inlineMarkdownToHtml(
        f.answer || ""
      )}</p></div>`;
    })
    .filter(Boolean)
    .join("\n        ");

  if (!items) return "";

  return `
      <section class="card">
        <h2>FAQ</h2>
        ${items}
      </section>`;
}

function faqJsonLd(faq) {
  if (!Array.isArray(faq) || !faq.length) return "";

  const mainEntity = faq
    .filter((f) => f && f.question)
    .map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer || "" }
    }));

  if (!mainEntity.length) return "";

  return `<script type="application/ld+json">
${JSON.stringify({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity }, null, 2)}
    </script>`;
}

// ---------------------------------------------------------------------------
// Metadata helpers
// ---------------------------------------------------------------------------

/**
 * Estimate read time as `${minutes} min read`, defaulting to 10 if no
 * `word_count_estimate` is provided. 220 wpm is the standard reading rate.
 */
function readMinutesFromItem(item) {
  const w = item && item.word_count_estimate;
  if (typeof w === "number" && w > 0) return Math.max(1, Math.round(w / 220));
  return 10;
}

/**
 * Category inferred from `primary_keyword`. Mirrors the publish script so
 * blog.json categories stay consistent across both pipelines.
 */
function inferCategory(item) {
  const kw = (item && item.primary_keyword || "").toLowerCase();
  if (/automat|operation|business management|crm|follow[- ]?up|smb|workflow|small business/.test(kw)) {
    return "Business Operations";
  }
  if (/mortgage|dti|housing|home|pmi|pre[- ]?approval|pre[- ]?qualif/.test(kw)) return "Mortgage";
  if (/car|auto|vehicle/.test(kw)) return "Auto Loans";
  if (/interest|apr|rate/.test(kw)) return "Interest Rates";
  return "Mortgage Planning";
}

// ---------------------------------------------------------------------------
// HTML page template
// ---------------------------------------------------------------------------

/**
 * Render a full static HTML document for a single blog post.
 * Same layout (header, article, FAQ, recommended calculators, footer) as
 * the production publish script so output files are interchangeable.
 */
function buildArticleHtml(item, enrichedMarkdown) {
  const slug = normSlug(item);
  if (!slug) return null;

  const title = item.title || item.h1 || slug;
  const h1 = item.h1 || title;
  const desc = item.meta_description || "";
  const canonical = `${SITE_ORIGIN}/blog/${slug}/`;
  const today = new Date().toISOString().slice(0, 10);
  const readTime = `${readMinutesFromItem(item)} min read`;
  const bodyHtml = bodyMarkdownToHtml(enrichedMarkdown);
  const faqHtml = faqSectionHtml(item.faq);
  const faqLd = faqJsonLd(item.faq);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)} | CalnexApp Blog</title>
    <meta name="description" content="${escapeHtml(desc)}" />
    <link rel="canonical" href="${canonical}" />
    <meta property="og:type" content="article" />
    <meta property="og:title" content="${escapeHtml(title)} | CalnexApp Blog" />
    <meta property="og:description" content="${escapeHtml(desc)}" />
    <meta property="og:url" content="${canonical}" />
    <meta property="og:site_name" content="CalnexApp" />
    <link rel="stylesheet" href="/assets/css/style.css" />
    <script type="application/ld+json">
${JSON.stringify(
        {
          "@context": "https://schema.org",
          "@type": "Article",
          headline: title,
          author: { "@type": "Person", name: "CalnexApp Editorial Team" },
          dateModified: today,
          datePublished: today,
          mainEntityOfPage: canonical,
          publisher: { "@type": "Organization", name: "CalnexApp" }
        },
        null,
        2
      )}
    </script>
    ${faqLd}
  </head>
  <body>
    <header class="site-header">
      <div class="container nav">
        <a href="/" class="brand">CalnexApp</a>
        <nav class="menu">
          <a href="/" data-nav-link>Home</a>
          <a href="/tools/loan-calculator/" data-nav-link>Tools</a>
          <a href="/blog/" data-nav-link>Blog</a>
          <a href="/about/" data-nav-link>About</a>
          <a href="/contact/" data-nav-link>Contact</a>
        </nav>
      </div>
    </header>

    <main class="container section-space article-layout">
      <section class="page-title">
        <p class="eyebrow">${escapeHtml(inferCategory(item))}</p>
        <h1>${escapeHtml(h1)}</h1>
        <div class="article-meta">
          <span>By CalnexApp Editorial Team</span>
          <span>Updated ${today}</span>
          <span>${escapeHtml(readTime)}</span>
        </div>
      </section>

      <article class="card article-body">
        ${bodyHtml}
      </article>
      ${faqHtml}

      <section class="card">
        <h2>Recommended calculators</h2>
        <ul class="toc-list">
          <li><a href="/tools/loan-calculator/">Loan Calculator</a></li>
          <li><a href="/tools/mortgage-calculator/">Mortgage Calculator</a></li>
          <li><a href="/tools/car-loan-calculator/">Car Loan Calculator</a></li>
        </ul>
      </section>
    </main>

    <footer class="site-footer">
      <div class="container footer-content">
        <p>&copy; <span id="year"></span> CalnexApp. All rights reserved.</p>
        <nav class="footer-links">
          <a href="/about/">About</a>
          <a href="/contact/">Contact</a>
          <a href="/blog/">Blog</a>
        </nav>
      </div>
    </footer>
    <script src="/assets/js/app.js" defer></script>
  </body>
</html>
`;
}

// ---------------------------------------------------------------------------
// blog.json upsert (idempotent)
// ---------------------------------------------------------------------------

/**
 * Build a manifest entry for `data/blog.json` from a draft item.
 * `featured` is intentionally omitted here so upsert can preserve any
 * existing flag without being overwritten.
 */
function buildManifestEntry(item, slug) {
  const title = item.title || item.h1 || slug;
  const excerpt =
    (item.meta_description && String(item.meta_description).slice(0, 220)) ||
    (item.body_markdown && String(item.body_markdown).replace(/\s+/g, " ").trim().slice(0, 180)) ||
    title;
  const today = new Date().toISOString().slice(0, 10);
  return {
    slug,
    title,
    excerpt,
    category: inferCategory(item),
    updatedDate: today,
    readTime: `${readMinutesFromItem(item)} min read`
  };
}

/**
 * Idempotent upsert: existing row is updated in place (preserving `featured`);
 * new row is appended with `featured: false`. Never removes rows.
 */
function upsertManifest(posts, entry) {
  const idx = posts.findIndex((p) => p && p.slug === entry.slug);
  if (idx >= 0) {
    const existing = posts[idx];
    posts[idx] = { ...existing, ...entry, featured: Boolean(existing.featured) };
    return "updated";
  }
  posts.push({ ...entry, featured: false });
  return "inserted";
}

// ---------------------------------------------------------------------------
// File I/O
// ---------------------------------------------------------------------------

function loadDrafts() {
  if (!fs.existsSync(DRAFTS_PATH)) {
    throw new Error(`Drafts file not found: ${DRAFTS_PATH}`);
  }
  return JSON.parse(fs.readFileSync(DRAFTS_PATH, "utf8"));
}

function loadBlogJson() {
  if (!fs.existsSync(BLOG_JSON_PATH)) return [];
  const data = JSON.parse(fs.readFileSync(BLOG_JSON_PATH, "utf8"));
  return Array.isArray(data) ? data : [];
}

function saveBlogJson(posts) {
  if (DRY_RUN) {
    console.log("[rebuild-blog][dry-run] would write", BLOG_JSON_PATH, "posts:", posts.length);
    return;
  }
  fs.writeFileSync(BLOG_JSON_PATH, JSON.stringify(posts, null, 2) + "\n", "utf8");
  console.log("[rebuild-blog] wrote", path.relative(ROOT, BLOG_JSON_PATH), "posts:", posts.length);
}

function writeArticleHtml(slug, html) {
  const dir = path.join(ROOT, "blog", slug);
  const outFile = path.join(dir, "index.html");
  if (DRY_RUN) {
    console.log("[rebuild-blog][dry-run] would write", path.relative(ROOT, outFile));
    return;
  }
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(outFile, html, "utf8");
  console.log("[rebuild-blog] wrote", path.relative(ROOT, outFile));
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

function main() {
  const doc = loadDrafts();
  const items = Array.isArray(doc.items) ? doc.items : [];

  console.log(
    `[rebuild-blog] loaded ${items.length} drafts from ${path.relative(ROOT, DRAFTS_PATH)}`
  );

  // Process every item with a body, regardless of status.
  const candidates = items.filter(
    (i) => i && typeof i.body_markdown === "string" && i.body_markdown.trim() !== ""
  );

  if (!candidates.length) {
    console.log("[rebuild-blog] no items with body_markdown; nothing to rebuild");
    return;
  }

  let posts = loadBlogJson();

  let totalProcessed = 0;
  let totalSkipped = 0;
  let totalInjectedInBody = 0;
  let totalFallback = 0;
  let totalManifestInserted = 0;
  let totalManifestUpdated = 0;

  for (const item of candidates) {
    const slug = normSlug(item);
    if (!slug) {
      console.warn("[rebuild-blog] skip item with invalid slug:", item && item.title);
      totalSkipped++;
      continue;
    }

    const status = normalizeDraftStatus(item.status) || "(empty)";

    const { markdown: enrichedMd, stats } = injectInternalLinks(
      item.body_markdown,
      item.internal_links
    );

    console.log(
      `[rebuild-blog] slug=${slug} status=${status} links: in-body=${stats.injectedInBody} fallback=${stats.fallbackAppended} total=${stats.totalLinked}/${stats.targets}`
    );

    const html = buildArticleHtml(item, enrichedMd);
    if (!html) {
      console.warn(`[rebuild-blog] skip slug=${slug}: HTML build returned null`);
      totalSkipped++;
      continue;
    }

    writeArticleHtml(slug, html);

    const manifestEntry = buildManifestEntry(item, slug);
    const op = upsertManifest(posts, manifestEntry);
    if (op === "inserted") totalManifestInserted++;
    else totalManifestUpdated++;

    totalProcessed++;
    totalInjectedInBody += stats.injectedInBody;
    totalFallback += stats.fallbackAppended;
  }

  saveBlogJson(posts);

  console.log(
    `[rebuild-blog] DONE processed=${totalProcessed} skipped=${totalSkipped} links: in-body=${totalInjectedInBody} fallback=${totalFallback}`
  );
  console.log(
    `[rebuild-blog] manifest: inserted=${totalManifestInserted} updated=${totalManifestUpdated} total=${posts.length}`
  );
  console.log("[rebuild-blog] drafts file untouched (status preserved)");
}

main();
