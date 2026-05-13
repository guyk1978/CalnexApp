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

/** =========================
 *  INTERNAL LINK ENGINE - FIXED FOR MARKDOWN & HTML
 *  ========================= */

function escapeRegExp(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** מחליף titles בקישורים בתוך תוכן Markdown/HTML */
function injectInternalLinks(content, internalLinks = []) {
  if (!content || !internalLinks.length) return content;

  let result = content;
  const used = new Set();

  for (const link of internalLinks) {
    if (!link?.title || !link?.slug) continue;
    if (used.has(link.slug)) continue;

    const url = `/blog/${link.slug}/`;
    const title = link.title;

    // regex גמיש: לא מחפש word boundaries, מתעלם מ־Markdown formatting
    const regex = new RegExp(`(${escapeRegExp(title)})`, "i");

    result = result.replace(regex, (match) => {
      used.add(link.slug);
      return `[${match}](${url})`;
    });
  }

  return result;
}

function injectSmartDebug(content, internalLinks = []) {
  if (!content || !internalLinks.length) return content;

  const sentences = String(content).split(/(?<=[.!?])\s+/).filter(Boolean);
  const used = new Set();
  let index = 0;

  console.log("=== INJECTION DEBUG START ===");
  console.log("Original content:\n", content);
  console.log("Links to inject:", internalLinks.map(l => l.title));

  const out = sentences.map((sentence, i) => {
    let modified = sentence;

    for (const link of internalLinks) {
      if (!link?.title || !link?.slug) continue;
      if (used.has(link.slug)) continue;

      const url = `/blog/${link.slug}/`;
      const title = link.title;

      // גמיש: match חלקי של מילה מתוך הכותרת, case-insensitive
      const words = title.split(" ").filter(w => w.length > 2);
      for (const word of words) {
        const regex = new RegExp(`(${word})`, "i");
        if (regex.test(modified)) {
          modified = modified.replace(regex, `[${word}](${url})`);
          used.add(link.slug);
          console.log(`Injected link "${title}" into sentence:`, sentence);
          break; // מחזיקים רק קישור אחד לכל slug
        }
      }
    }

    // fallback: כל 3 משפטים מוסיפים קישור שלא נכנס
    if (i % 3 === 0 && index < internalLinks.length) {
      const link = internalLinks[index];
      if (!used.has(link.slug)) {
        modified += ` Learn more about [${link.title}](/blog/${link.slug}/).`;
        used.add(link.slug);
        console.log(`Fallback injected link "${link.title}" into sentence:`, sentence);
        index++;
      }
    }

    return modified;
  });

  console.log("=== INJECTION DEBUG END ===");
  return out.join(" ");
}



function injectSmartOptimized(content, internalLinks = []) {
  if (!content || !internalLinks.length) return content;

  const sentences = String(content).split(/(?<=[.!?])\s+/).filter(Boolean);
  const used = new Set();
  let totalLinksInjected = 0;

  console.log("=== INJECTION DEBUG START ===");
  console.log("Links to inject:", internalLinks.map(l => l.title));

  const enrichedSentences = sentences.map((sentence) => {
    let modified = sentence;

    for (const link of internalLinks) {
      if (!link?.title || !link?.slug) continue;
      if (used.has(link.slug)) continue;

      const url = `/blog/${link.slug}/`;
      const title = link.title;

      const words = title.split(/\s+/).filter(w => w.length > 2);
      for (const word of words) {
        const regex = new RegExp(`\\b(${escapeRegExp(word)})\\b`, "i");
        if (regex.test(modified)) {
          modified = modified.replace(regex, `[${word}](${url})`);
          used.add(link.slug);
          totalLinksInjected++;
          console.log(`Injected link "${title}" via word "${word}" into sentence:`, sentence);
          break; // רק link אחד לכל slug
        }
      }
    }

    return modified;
  });

  // fallback: insert remaining links at end
  for (const link of internalLinks) {
    if (!used.has(link.slug)) {
      enrichedSentences.push(`Learn more about [${link.title}](/blog/${link.slug}/).`);
      used.add(link.slug);
      totalLinksInjected++;
      console.log(`Fallback injected link "${link.title}" at end of content.`);
    }
  }

  console.log("Total links injected:", totalLinksInjected);
  console.log("=== INJECTION DEBUG END ===");

  return enrichedSentences.join(" ");
}

/* =========================================================
   ORIGINAL FUNCTIONS (UNCHANGED)
========================================================= */

function normalizeDraftStatus(s) {
  return String(s == null ? "" : s).trim().toLowerCase();
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
      const lines = block.split(/\n/).map(l => l.trim()).filter(Boolean);
      const merged = lines.join(" ");
      out.push(`<p>${inlineMarkdownToHtml(merged)}</p>`);
    }
  }

  return out.join("\n");
}

/* =========================================================
   SEO HELPERS (UNCHANGED)
========================================================= */

function faqSectionHtml(faq) {
  if (!Array.isArray(faq) || !faq.length) return "";

  const items = faq
    .map(f => {
      if (!f || !f.question) return "";
      return `<div><h3>${escapeHtml(f.question)}</h3><p>${inlineMarkdownToHtml(f.answer || "")}</p></div>`;
    })
    .filter(Boolean)
    .join("\n");

  if (!items) return "";

  return `<section><h2>FAQ</h2>${items}</section>`;
}

function faqJsonLd(faq) {
  if (!Array.isArray(faq) || !faq.length) return "";

  const mainEntity = faq.map(f => ({
    "@type": "Question",
    name: f.question,
    acceptedAnswer: { "@type": "Answer", text: f.answer || "" }
  }));

  return `<script type="application/ld+json">
${JSON.stringify({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity }, null, 2)}
</script>`;
}

/* =========================================================
   CORE PIPELINE
========================================================= */

function readMinutesFromItem(item) {
  const w = item.word_count_estimate;
  if (typeof w === "number" && w > 0) {
    return Math.max(1, Math.round(w / 220));
  }
  return 10;
}

function inferCategory(item) {
  const kw = (item.primary_keyword || "").toLowerCase();
  if (/mortgage|home|loan/.test(kw)) return "Mortgage";
  return "General Finance";
}

function buildArticleHtml(item) {
  const slug = normSlug(item);
  if (!slug) return null;

  const title = item.title || item.h1 || slug;
  const h1 = item.h1 || title;
  const desc = item.meta_description || "";
  const canonical = `${SITE_ORIGIN}/blog/${slug}/`;
  const today = new Date().toISOString().slice(0, 10);
  const readTime = `${readMinutesFromItem(item)} min read`;

  /** 🔥 INTERNAL LINK INJECTION USING OPTIMIZED LAYER */
  const enrichedMarkdown = injectSmartOptimized(
  item.body_markdown || "",
  item.internal_links || []
);

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
  <link rel="stylesheet" href="/assets/css/style.css" />
  <script type="application/ld+json">
${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    author: { "@type": "Person", name: "CalnexApp Editorial Team" },
    dateModified: today,
    datePublished: today,
    mainEntityOfPage: canonical,
    publisher: { "@type": "Organization", name: "CalnexApp" }
  }, null, 2)}
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
</html>`;
}

/* =========================================================
   FILE SYSTEM (UNCHANGED)
========================================================= */

function loadDrafts() {
  if (!fs.existsSync(DRAFTS_PATH)) return { items: [] };
  return JSON.parse(fs.readFileSync(DRAFTS_PATH, "utf8"));
}

function loadBlogJson() {
  if (!fs.existsSync(BLOG_JSON_PATH)) return [];
  return JSON.parse(fs.readFileSync(BLOG_JSON_PATH, "utf8"));
}

function saveBlogJson(posts) {
  fs.writeFileSync(BLOG_JSON_PATH, JSON.stringify(posts, null, 2));
}

function saveDraftsDoc(doc) {
  fs.writeFileSync(DRAFTS_PATH, JSON.stringify(doc, null, 2));
}

/* =========================================================
   MAIN (UNCHANGED FLOW)
========================================================= */

function main() {
  const doc = loadDrafts();
  const items = doc.items || [];

  const approved = items.filter(
    i => normalizeDraftStatus(i.status) === "approved"
  );

  if (!approved.length) return;

  let posts = loadBlogJson();

  const published = [];

  for (const item of approved) {
    const slug = normSlug(item);
    const html = buildArticleHtml(item);
    if (!slug || !html) continue;

    const dir = path.join(ROOT, "blog", slug);
    fs.mkdirSync(dir, { recursive: true });

    fs.writeFileSync(path.join(dir, "index.html"), html);

    posts.push({
      slug,
      title: item.title,
      excerpt: item.meta_description || "",
      category: inferCategory(item)
    });

    published.push(slug);
  }

  saveBlogJson(posts);

  for (const it of items) {
    if (published.includes(normSlug(it))) {
      it.status = "published";
    }
  }

  saveDraftsDoc(doc);
}

main();