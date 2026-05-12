/**
 * Publish approved SEO drafts to static blog:
 * 1. Reads drafts/pending-seo-pages.json — ONLY items whose normalized status is "approved"
 * 2. Writes blog/{slug}/index.html from body_markdown + metadata
 * 3. Merges each into data/blog.json so /blog/ lists them
 * 4. Sets those items to status "published" in the drafts file (ONLY after HTML + blog.json succeed)
 *
 * Idempotent: second run with no "approved" rows does nothing. Re-run with same approved overwrites HTML/JSON safely.
 * Approve/reject live only in drafts JSON until this script runs (CI/build).
 *
 * Run: npm run publish-approved-blog
 * Cloudflare: ensure build runs this (see package.json "build").
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DRAFTS_PATH = path.join(ROOT, "drafts", "pending-seo-pages.json");
const BLOG_JSON_PATH = path.join(ROOT, "data", "blog.json");
const SITE_ORIGIN = "https://calnexapp.com";

/** Lowercase trim — ONLY this value is published (dashboard must not use other spellings for queue). */
function normalizeDraftStatus(s) {
  return String(s == null ? "" : s)
    .trim()
    .toLowerCase();
}

function normSlug(item) {
  return String((item && item.slug) || "").replace(/[^a-z0-9-]/gi, "");
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

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

function readMinutesFromItem(item) {
  const w = item.word_count_estimate;
  if (typeof w === "number" && w > 0) {
    return Math.max(1, Math.round(w / 220));
  }
  return 10;
}

function inferCategory(item) {
  const kw = (item.primary_keyword || "").toLowerCase();
  if (/mortgage|dti|housing|home/.test(kw)) return "Mortgage";
  if (/car|auto|vehicle/.test(kw)) return "Auto Loans";
  if (/interest|apr|rate/.test(kw)) return "Interest Rates";
  return "Mortgage Planning";
}

function buildArticleHtml(item) {
  const slug = String(item.slug || "").replace(/[^a-z0-9-]/gi, "");
  if (!slug) return null;
  const title = item.title || item.h1 || slug;
  const h1 = item.h1 || title;
  const desc = item.meta_description || "";
  const canonical = `${SITE_ORIGIN}/blog/${slug}/`;
  const today = new Date().toISOString().slice(0, 10);
  const readTime = `${readMinutesFromItem(item)} min read`;
  const bodyHtml = bodyMarkdownToHtml(item.body_markdown || "");
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

function loadDrafts() {
  if (!fs.existsSync(DRAFTS_PATH)) {
    console.warn("[publish-approved-blog] missing", DRAFTS_PATH);
    return { version: 1, items: [] };
  }
  return JSON.parse(fs.readFileSync(DRAFTS_PATH, "utf8"));
}

function loadBlogJson() {
  if (!fs.existsSync(BLOG_JSON_PATH)) return [];
  return JSON.parse(fs.readFileSync(BLOG_JSON_PATH, "utf8"));
}

function saveBlogJson(posts) {
  fs.writeFileSync(BLOG_JSON_PATH, JSON.stringify(posts, null, 2) + "\n", "utf8");
  console.log("[publish-approved-blog] wrote blog JSON file", path.relative(ROOT, BLOG_JSON_PATH));
}

function saveDraftsDoc(doc) {
  if (typeof doc.version !== "number" || !Number.isFinite(doc.version)) {
    doc.version = 1;
  } else {
    doc.version += 1;
  }
  fs.writeFileSync(DRAFTS_PATH, JSON.stringify(doc, null, 2) + "\n", "utf8");
  console.log(
    "[publish-approved-blog] wrote drafts file",
    path.relative(ROOT, DRAFTS_PATH),
    "version",
    doc.version
  );
}

function main() {
  const doc = loadDrafts();
  const items = Array.isArray(doc.items) ? doc.items : [];
  const approved = items.filter((i) => i && normalizeDraftStatus(i.status) === "approved");
  const byStatus = items.reduce(
    (acc, i) => {
      const k = normalizeDraftStatus(i && i.status) || "(empty)";
      acc[k] = (acc[k] || 0) + 1;
      return acc;
    },
    {}
  );
  console.log(
    "[publish-approved-blog] drafts version",
    doc.version,
    "items",
    items.length,
    "by-status",
    JSON.stringify(byStatus)
  );

  if (!approved.length) {
    console.log("[publish-approved-blog] no items with status===approved (after normalize); nothing to publish");
    return;
  }

  console.log(
    "[publish-approved-blog] queue",
    approved.length,
    "approved slug(s):",
    approved.map((a) => normSlug(a)).filter(Boolean).join(", ") || "(none valid)"
  );

  let posts = loadBlogJson();
  if (!Array.isArray(posts)) posts = [];

  const publishedSlugs = [];

  for (const item of approved) {
    const slug = normSlug(item);
    if (!slug) {
      console.warn("[publish-approved-blog] skip approved item with empty/invalid slug", item && item.title);
      continue;
    }

    const html = buildArticleHtml(item);
    if (!html) {
      console.warn("[publish-approved-blog] skip slug", slug, "(buildArticleHtml returned null)");
      continue;
    }

    const dir = path.join(ROOT, "blog", slug);
    fs.mkdirSync(dir, { recursive: true });
    const outFile = path.join(dir, "index.html");
    fs.writeFileSync(outFile, html, "utf8");
    console.log(
      "[publish-approved-blog] wrote static HTML",
      path.relative(ROOT, outFile),
      "(slug",
      slug + ")"
    );

    const title = item.title || item.h1 || slug;
    const excerpt =
      (item.meta_description && String(item.meta_description).slice(0, 220)) ||
      (item.body_markdown && String(item.body_markdown).replace(/\s+/g, " ").trim().slice(0, 180)) ||
      title;
    const category = inferCategory(item);
    const today = new Date().toISOString().slice(0, 10);
    const readTime = `${readMinutesFromItem(item)} min read`;

    const idx = posts.findIndex((p) => p.slug === slug);
    const entry = {
      slug,
      title,
      excerpt,
      category,
      updatedDate: today,
      readTime,
      featured: idx >= 0 ? Boolean(posts[idx].featured) : false
    };
    if (idx >= 0) posts[idx] = { ...posts[idx], ...entry };
    else posts.push(entry);

    publishedSlugs.push(slug);
  }

  if (!publishedSlugs.length) {
    console.warn(
      "[publish-approved-blog] no slugs published (invalid slugs or HTML build failed); skipping blog.json and drafts updates (idempotent)"
    );
    return;
  }

  saveBlogJson(posts);
  console.log(
    "[publish-approved-blog] updated blog JSON",
    path.relative(ROOT, BLOG_JSON_PATH),
    "posts count",
    posts.length
  );

  for (const it of doc.items) {
    if (!it) continue;
    const s = normSlug(it);
    if (publishedSlugs.indexOf(s) === -1) continue;
    if (normalizeDraftStatus(it.status) !== "approved") continue;
    const prev = it.status;
    it.status = "published";
    console.log(
      "[publish-approved-blog] status transition",
      JSON.stringify({ slug: s, from: prev, to: "published", note: "approved→published after HTML+blog.json" })
    );
  }
  saveDraftsDoc(doc);
}

main();
