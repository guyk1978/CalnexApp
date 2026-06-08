/**
 * Publish blog posts from blog/{slug}/index.md (YAML frontmatter + markdown body).
 * Usage: node scripts/publish-blog-markdown.mjs [slug ...]
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { renderBlogCategoryPill, classifyBlogCategory, renderDefaultRecommendedCalculators } =
  require("./tool-themes.cjs");

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BLOG_JSON_PATH = path.join(ROOT, "data", "blog.json");
const SITE_ORIGIN = "https://calnexapp.com";

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeRegExp(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function inlineMarkdownToHtml(text) {
  let t = escapeHtml(text);
  t = t.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  t = t.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, href) => {
    const h = String(href).trim();
    if (!/^https?:\/\//i.test(h) && !h.startsWith("/")) return escapeHtml(label);
    return `<a href="${escapeHtml(h)}">${escapeHtml(label)}</a>`;
  });
  return t;
}

function blockIsList(block) {
  const lines = block.split(/\n/).map((l) => l.trim()).filter(Boolean);
  return lines.length > 0 && lines.every((l) => l.startsWith("- "));
}

function listBlockToHtml(block) {
  const items = block
    .split(/\n/)
    .map((l) => l.trim())
    .filter((l) => l.startsWith("- "))
    .map((l) => `<li>${inlineMarkdownToHtml(l.slice(2).trim())}</li>`);
  return `<ul class="toc-list">\n          ${items.join("\n          ")}\n        </ul>`;
}

function bodyMarkdownToHtml(md) {
  if (!md || typeof md !== "string") return "<p></p>";
  const chunks = md.split(/\n\n+/);
  const out = [];

  for (const raw of chunks) {
    const block = raw.trim();
    if (!block) continue;

    if (block.startsWith(":::html")) {
      const inner = block.replace(/^:::html\s*/i, "").replace(/\s*:::\s*$/i, "").trim();
      out.push(inner);
      continue;
    }

    if (block.startsWith("### ")) {
      out.push(`<h3>${escapeHtml(block.slice(4).trim())}</h3>`);
    } else if (block.startsWith("## ")) {
      out.push(`<h2>${escapeHtml(block.slice(3).trim())}</h2>`);
    } else if (blockIsList(block)) {
      out.push(listBlockToHtml(block));
    } else {
      const lines = block.split(/\n/).map((l) => l.trim()).filter(Boolean);
      out.push(`<p>${inlineMarkdownToHtml(lines.join(" "))}</p>`);
    }
  }

  return out.join("\n        ");
}

function parseFrontmatter(fileContent) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/m.exec(fileContent);
  if (!match) return { meta: {}, body: fileContent };
  const meta = {};
  const fm = match[1];
  const lines = fm.split(/\n/);
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const m = /^([a-zA-Z0-9_]+):\s*(.*)$/.exec(line);
    if (!m) {
      i += 1;
      continue;
    }
    const key = m[1];
    let val = m[2].trim();
    if (val === "" && i + 1 < lines.length && /^\s+-\s+/.test(lines[i + 1])) {
      if (key === "faq") {
        const faq = [];
        i += 1;
        while (i < lines.length && /^\s+-\s+/.test(lines[i])) {
          const entry = {};
          let block = lines[i].replace(/^\s+-\s+/, "").trim();
          i += 1;
          const qm = /^question:\s*(.*)$/.exec(block);
          if (qm) entry.question = qm[1].trim().replace(/^["']|["']$/g, "");
          const am = /^answer:\s*(.*)$/.exec(block);
          if (am) entry.answer = am[1].trim().replace(/^["']|["']$/g, "");
          while (i < lines.length && /^\s{4,}\S/.test(lines[i]) && !/^\s+-\s+/.test(lines[i])) {
            const sub = lines[i].trim();
            const sq = /^question:\s*(.*)$/.exec(sub);
            const sa = /^answer:\s*(.*)$/.exec(sub);
            if (sq) entry.question = sq[1].trim().replace(/^["']|["']$/g, "");
            if (sa) entry.answer = sa[1].trim().replace(/^["']|["']$/g, "");
            i += 1;
          }
          if (entry.question) faq.push(entry);
        }
        meta.faq = faq;
        continue;
      }
      const items = [];
      i += 1;
      while (i < lines.length && /^\s+-\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s+-\s+/, "").trim().replace(/^["']|["']$/g, ""));
        i += 1;
      }
      meta[key] = items;
      continue;
    }
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (val.startsWith("[") && val.endsWith("]")) {
      try {
        meta[key] = JSON.parse(val.replace(/'/g, '"'));
      } catch {
        meta[key] = val;
      }
    } else {
      meta[key] = val;
    }
    i += 1;
  }
  return { meta, body: match[2].trim() };
}

function readMinutes(body) {
  const words = body.split(/\s+/).filter(Boolean).length;
  return Math.max(6, Math.round(words / 220));
}

function faqSectionHtml(faq) {
  if (!Array.isArray(faq) || !faq.length) return "";
  const items = faq
    .map((f) => {
      if (!f?.question) return "";
      return `<div class="faq-item"><h3 class="h4">${escapeHtml(f.question)}</h3><p>${inlineMarkdownToHtml(
        f.answer || ""
      )}</p></div>`;
    })
    .filter(Boolean)
    .join("\n        ");
  if (!items) return "";
  return `\n      <section class="card">\n        <h2>FAQ</h2>\n        ${items}\n      </section>`;
}

function buildArticleHtml(meta, bodyMd) {
  const slug = String(meta.slug || "")
    .replace(/[^a-z0-9-]/gi, "")
    .toLowerCase();
  if (!slug) return null;

  const title = meta.title || slug;
  const h1 = meta.h1 || title;
  const desc = meta.description || "";
  const canonical = meta.canonical || `${SITE_ORIGIN}/blog/${slug}/`;
  const today = meta.date || new Date().toISOString().slice(0, 10);
  const readTime = meta.read_time || `${readMinutes(bodyMd)} min read`;
  const category = meta.category || "Business Operations";
  const categoryPill = renderBlogCategoryPill(category);
  const accent = classifyBlogCategory(category);

  let bodyHtml = bodyMarkdownToHtml(bodyMd);
  bodyHtml = bodyHtml.replace(
    /<h2>Quick answer<\/h2>\s*(<p>[\s\S]*?<\/p>)/i,
    `<div class="cn-quick-answer cn-quick-answer--${accent}"><h2>Quick answer</h2>$1</div>`
  );

  const faqHtml = faqSectionHtml(meta.faq);
  const recommended = renderDefaultRecommendedCalculators()
    .replace(/href="\/tools\/loan-calculator\/"/g, 'href="/tools/roi-calculator/"')
    .replace(/>Loan Calculator</g, ">ROI Calculator<")
    .replace(/href="\/tools\/mortgage-calculator\/"/g, 'href="/tools/rent-vs-buy/"')
    .replace(/>Mortgage Calculator</g, ">Rent vs. Buy Calculator<");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" href="data:;base64,=">
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <script src="/assets/js/theme-init.js"></script>
    <title>${escapeHtml(title)} | CalnexApp Blog</title>
    <meta name="description" content="${escapeHtml(desc)}" />
    <link rel="canonical" href="${escapeHtml(canonical)}" />
    <meta property="og:type" content="article" />
    <meta property="og:title" content="${escapeHtml(title)} | CalnexApp Blog" />
    <meta property="og:description" content="${escapeHtml(desc)}" />
    <meta property="og:url" content="${escapeHtml(canonical)}" />
    <meta property="og:site_name" content="CalnexApp" />
    <link rel="stylesheet" href="/assets/css/style.css?v=1.4" />
    <link rel="stylesheet" href="/assets/css/cookie-consent.css?v=3" />
    <script src="/assets/js/consent-config.js"></script>
    <script type="application/ld+json">
${JSON.stringify(
        {
          "@context": "https://schema.org",
          "@type": "Article",
          headline: h1,
          description: desc,
          url: canonical,
          datePublished: today,
          dateModified: today,
          author: { "@type": "Person", name: "Daniel Morris", url: `${SITE_ORIGIN}/authors/daniel-morris/` },
          publisher: { "@type": "Organization", name: "CalnexApp", url: SITE_ORIGIN }
        },
        null,
        2
      )}
    </script>
  </head>
  <body>
    <header class="site-header">
      <div class="container nav">
        <a href="/" class="brand">CalnexApp</a>
        <!-- CN_NAV_MENU_START -->
        <nav class="menu" id="siteMenu">
          <a href="/" data-nav-link>Home</a>
          <a href="/tools/" data-nav-link>Tools</a>
          <a href="/blog/" data-nav-link>Blog</a>
          <a href="/about/" data-nav-link>About</a>
          <a href="/contact/" data-nav-link>Contact</a>
        </nav>
        <!-- CN_NAV_MENU_END -->
      </div>
    </header>

    <main class="cn-main-layout pt-10 sm:pt-14 px-4 sm:px-6 max-w-7xl mx-auto article-layout">
      <section class="page-title cn-article-page-title cn-page-hero space-y-4 text-center sm:text-left">
        ${categoryPill}
        <h1>${escapeHtml(h1)}</h1>
        <div class="article-meta">
          <span>By <a href="/authors/daniel-morris/">Daniel Morris</a></span>
          <span>Updated ${escapeHtml(today)}</span>
          <span>${escapeHtml(readTime)}</span>
        </div>
      </section>

      <article class="card article-body">
        ${bodyHtml}
      </article>
      ${faqHtml}
      ${recommended}
    </main>

    <footer class="site-footer">
      <div class="container footer-content">
        <p>&copy; <span id="year"></span> CalnexApp. All rights reserved.</p>
        <nav class="footer-links" aria-label="Footer">
          <a href="/about/">About</a>
          <a href="/contact/">Contact</a>
          <a href="/blog/">Blog</a>
        </nav>
      </div>
    </footer>
    <script src="/assets/js/header-toolbar.js" defer></script>
    <script src="/assets/js/app.js" defer></script>
    <script src="/assets/js/cookie-consent.js" defer></script>
  </body>
</html>
`;
}

function loadBlogJson() {
  if (!fs.existsSync(BLOG_JSON_PATH)) return [];
  const data = JSON.parse(fs.readFileSync(BLOG_JSON_PATH, "utf8"));
  return Array.isArray(data) ? data : [];
}

function upsertManifest(posts, entry) {
  const idx = posts.findIndex((p) => p?.slug === entry.slug);
  if (idx >= 0) {
    const existing = posts[idx];
    posts[idx] = { ...existing, ...entry, featured: Boolean(existing.featured) };
    return "updated";
  }
  posts.unshift({ ...entry, featured: false });
  return "inserted";
}

function publishMarkdownFile(mdPath) {
  const raw = fs.readFileSync(mdPath, "utf8");
  const { meta, body } = parseFrontmatter(raw);
  const slug = String(meta.slug || path.basename(path.dirname(mdPath)))
    .replace(/[^a-z0-9-]/gi, "")
    .toLowerCase();
  meta.slug = slug;

  const html = buildArticleHtml(meta, body);
  if (!html) {
    console.warn("publish-blog-markdown: skip (no slug)", mdPath);
    return null;
  }

  const outDir = path.join(ROOT, "blog", slug);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "index.html"), html, "utf8");

  const excerpt =
    meta.excerpt ||
    body.replace(/\n+/g, " ").replace(/[#*`[\]]/g, "").trim().slice(0, 200);

  return {
    slug,
    manifest: {
      slug,
      title: meta.title || slug,
      excerpt,
      category: meta.category || "Business Operations",
      updatedDate: meta.date || new Date().toISOString().slice(0, 10),
      readTime: meta.read_time || `${readMinutes(body)} min read`,
      primary_keyword: meta.primary_keyword || "",
      featured: Boolean(meta.featured),
      internal_links: Array.isArray(meta.internal_links) ? meta.internal_links : []
    }
  };
}

const slugsArg = process.argv.slice(2);
const targets =
  slugsArg.length > 0
    ? slugsArg.map((s) => path.join(ROOT, "blog", s.replace(/^\//, ""), "index.md"))
    : [
        "how-to-calculate-real-estate-roi",
        "roi-vs-cap-rate-which-metric-matters",
        "real-estate-roi-calculation-mistakes"
      ].map((s) => path.join(ROOT, "blog", s, "index.md"));

const posts = loadBlogJson();
let published = 0;

for (const mdPath of targets) {
  if (!fs.existsSync(mdPath)) {
    console.warn("publish-blog-markdown: missing", mdPath);
    continue;
  }
  const result = publishMarkdownFile(mdPath);
  if (!result) continue;
  upsertManifest(posts, result.manifest);
  published += 1;
  console.log("publish-blog-markdown: published", result.slug);
}

fs.writeFileSync(BLOG_JSON_PATH, JSON.stringify(posts, null, 2) + "\n", "utf8");
console.log(`publish-blog-markdown: done (${published} posts, blog.json has ${posts.length} entries)`);
