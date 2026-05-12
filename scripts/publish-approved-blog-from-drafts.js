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

/* =========================================================
   🔥 INTERNAL LINK OPTIMIZER (NEW LAYER - NO BREAK CHANGES)
========================================================= */

function escapeRegExp(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Score how relevant a link is to content
 */
function scoreLink(content, link) {
  const text = String(content).toLowerCase();
  const title = String(link.title || "").toLowerCase();

  let score = 0;

  if (!title) return -1;

  if (text.includes(title)) score += 5;

  const words = title.split(" ");
  for (const w of words) {
    if (w.length > 3 && text.includes(w)) score += 1;
  }

  if (words.length <= 2) score -= 1;

  if (text.length > 800) score += 1;

  return score;
}

/**
 * Pick best links only (prevents spam / overlinking)
 */
function pickBestLinks(content, links, max = 3) {
  return (links || [])
    .map(l => ({
      ...l,
      score: scoreLink(content, l)
    }))
    .filter(l => l.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, max);
}

/**
 * Smart injector (enhanced version of your injectSmart)
 * - controlled link density
 * - avoids spam injection
 */
function injectSmartOptimized(content, internalLinks = []) {
  if (!content || !internalLinks.length) return content;

  const bestLinks = pickBestLinks(content, internalLinks, 3);

  const sentences = String(content)
    .split(/(?<=[.!?])\s+/)
    .filter(Boolean);

  const used = new Set();
  let index = 0;

  return sentences
    .map((sentence, i) => {
      if (index >= bestLinks.length) return sentence;

      for (const link of bestLinks) {
        if (used.has(link.slug)) continue;

        const url = `/blog/${link.slug}/`;
        const title = link.title;

        const regex = new RegExp(`\\b(${escapeRegExp(title)})\\b`, "i");

        if (regex.test(sentence)) {
          used.add(link.slug);
          index++;
          return sentence.replace(regex, `[${title}](${url})`);
        }
      }

      // fallback natural insertion (low frequency)
      if (i % 4 === 0 && bestLinks[index]) {
        const link = bestLinks[index];
        used.add(link.slug);
        index++;
        return `${sentence} Learn more about [${link.title}](/blog/${link.slug}/).`;
      }

      return sentence;
    })
    .join(" ");
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

  const title = item.title || slug;
  const desc = item.meta_description || "";
  const canonical = `${SITE_ORIGIN}/blog/${slug}/`;

  const enrichedMarkdown = injectSmartOptimized(
    item.body_markdown || "",
    item.internal_links || []
  );

  const bodyHtml = bodyMarkdownToHtml(enrichedMarkdown);

  return `<!doctype html>
<html>
<head>
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(desc)}" />
<link rel="canonical" href="${canonical}" />
${faqJsonLd(item.faq)}
</head>
<body>
<h1>${escapeHtml(title)}</h1>
<article>${bodyHtml}</article>
${faqSectionHtml(item.faq)}
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