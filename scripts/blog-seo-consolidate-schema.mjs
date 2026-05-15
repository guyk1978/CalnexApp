/**
 * One-pass blog SEO: remove duplicate JSON-LD, emit single @graph (Article + BreadcrumbList + optional FAQPage),
 * strip generic RANK FAQ schema and SEO_ENGINE duplicate Article blocks.
 * Preserves canonical URLs and article body.
 *
 * Run: node scripts/blog-seo-consolidate-schema.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BLOG = path.join(ROOT, "blog");

const SKIP = new Set(["index.html", "latest", "template.html"]);

function authorForSlug(slug) {
  const m =
    /mortgage|pmi|dti|refinance|heloc|equity|hub|amortization|underwriting|historical-payment|borrowing-guide|apr|biweekly|credit-score|pre-approval|pre-qualification|recast|break-even|payoff|arm|cap-structure|loan-term|fixed-vs|variable|interest-rate|how-extra|how-to-calculate|loan-vs|origination|remove-pmi|debt-to-income|car-loan/i;
  if (m.test(slug)) {
    return {
      name: "Daniel Morris",
      url: "https://calnexapp.com/authors/daniel-morris/",
      jobTitle: "Senior Mortgage Analyst",
      description: "Writes on U.S. mortgage mechanics, amortization, and borrower decision frameworks."
    };
  }
  return {
    name: "Jordan Park",
    url: "https://calnexapp.com/authors/jordan-park/",
    jobTitle: "SMB Finance Editor",
    description: "Covers working capital, operations finance, and cash-flow tooling for small businesses."
  };
}

function extract(html, re) {
  const m = html.match(re);
  return m ? m[1].trim() : "";
}

function extractCanonical(html) {
  return extract(html, /<link\s+rel="canonical"\s+href="([^"]+)"/i);
}

function extractMetaDescription(html) {
  return extract(html, /<meta\s+name="description"\s+content="([^"]*)"/i);
}

function extractTitleTag(html) {
  return extract(html, /<title>([^<]+)<\/title>/i);
}

function extractH1(html) {
  const m = html.match(/<section class="page-title"[^>]*>[\s\S]*?<h1>([^<]+)<\/h1>/i);
  return m ? m[1].trim() : "";
}

function extractUpdatedDate(html) {
  const m = html.match(/<span>Updated\s+(\d{4}-\d{2}-\d{2})<\/span>/i);
  if (m) return m[1];
  const m2 = html.match(/"dateModified"\s*:\s*"(\d{4}-\d{2}-\d{2})"/);
  return m2 ? m2[1] : "2026-05-14";
}

function extractFaqs(html) {
  const sec = html.match(/<section class="card faq-list"[^>]*>([\s\S]*?)<\/section>/i);
  if (!sec) return [];
  const block = sec[1];
  const out = [];
  const re = /<details>\s*<summary>([^<]+)<\/summary>\s*([\s\S]*?)<\/details>/gi;
  let m;
  while ((m = re.exec(block))) {
    const q = m[1].replace(/\s+/g, " ").trim();
    const inner = m[2];
    const p = inner.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
    const text = p ? p[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim() : inner.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    if (q && text) out.push({ question: q, answer: text });
  }
  return out;
}

function stripJsonLdBlocks(html) {
  let out = html;
  out = out.replace(/<!--\s*SEO_ENGINE_SCHEMA_START\s*-->[\s\S]*?<!--\s*SEO_ENGINE_SCHEMA_END\s*-->/gi, "");
  out = out.replace(/<!--\s*RANK_BLOG_FAQ_SCHEMA_START\s*-->[\s\S]*?<!--\s*RANK_BLOG_FAQ_SCHEMA_END\s*-->/gi, "");
  out = out.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/gi, "");
  return out;
}

function insertGraphAfterStylesheet(html, graphJson) {
  const snippet = `\n    <script type="application/ld+json">\n${JSON.stringify(graphJson, null, 2)}\n    </script>`;
  const re = /(<link rel="stylesheet" href="\/assets\/css\/style\.css" \/>)/i;
  if (re.test(html)) return html.replace(re, `$1${snippet}`);
  return html.replace(/(<\/head>)/i, `${snippet}\n  $1`);
}

function walkArticles() {
  const out = [];
  for (const name of fs.readdirSync(BLOG)) {
    if (SKIP.has(name)) continue;
    const dir = path.join(BLOG, name);
    if (!fs.statSync(dir).isDirectory()) continue;
    const idx = path.join(dir, "index.html");
    if (fs.existsSync(idx)) out.push({ slug: name, file: idx });
  }
  return out;
}

function buildGraph({ canonical, headline, description, datePublished, dateModified, faqs, author }) {
  const graph = [
    {
      "@type": "Article",
      "@id": `${canonical}#article`,
      "headline": headline,
      "description": description,
      "url": canonical,
      "datePublished": datePublished,
      "dateModified": dateModified,
      "author": {
        "@type": "Person",
        "name": author.name,
        "url": author.url,
        "jobTitle": author.jobTitle,
        "description": author.description
      },
      "publisher": {
        "@type": "Organization",
        "name": "CalnexApp",
        "url": "https://calnexapp.com/",
        "logo": {
          "@type": "ImageObject",
          "url": "https://calnexapp.com/og-loan-calculator.png"
        }
      },
      "mainEntityOfPage": { "@type": "WebPage", "@id": canonical }
    },
    {
      "@type": "BreadcrumbList",
      "@id": `${canonical}#breadcrumb`,
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://calnexapp.com/" },
        { "@type": "ListItem", "position": 2, "name": "Blog", "item": "https://calnexapp.com/blog/" },
        { "@type": "ListItem", "position": 3, "name": headline, "item": canonical }
      ]
    }
  ];
  if (faqs.length) {
    graph.push({
      "@type": "FAQPage",
      "@id": `${canonical}#faq`,
      "mainEntity": faqs.map((f) => ({
        "@type": "Question",
        "name": f.question,
        acceptedAnswer: { "@type": "Answer", "text": f.answer }
      }))
    });
  }
  return { "@context": "https://schema.org", "@graph": graph };
}

function replaceByline(html, authorName) {
  return html.replace(/By CalnexApp Editorial Team/g, `By ${authorName}`).replace(/CalnexApp Editorial Team/g, authorName);
}

/** Link visible bylines to ProfilePage URLs for entity consistency (HTML + aligns with JSON-LD Person.url). */
function normalizeAuthorBylines(html) {
  return html
    .replace(/<span>By Daniel Morris<\/span>/gi, '<span>By <a href="/authors/daniel-morris/">Daniel Morris</a></span>')
    .replace(/<span>By Jordan Park<\/span>/gi, '<span>By <a href="/authors/jordan-park/">Jordan Park</a></span>');
}

let updated = 0;
for (const { slug, file } of walkArticles()) {
  let html = fs.readFileSync(file, "utf8");
  const canonical = extractCanonical(html);
  if (!canonical) {
    console.warn("skip (no canonical):", file);
    continue;
  }
  const h1 = extractH1(html) || extractTitleTag(html).replace(/\s*\|\s*CalnexApp Blog\s*$/i, "").trim();
  const description = extractMetaDescription(html) || h1;
  const dateMod = extractUpdatedDate(html);
  const datePub = dateMod;
  const faqs = extractFaqs(html);
  const author = authorForSlug(slug);

  html = stripJsonLdBlocks(html);
  html = replaceByline(html, author.name);
  html = normalizeAuthorBylines(html);
  const graph = buildGraph({
    canonical,
    headline: h1,
    description,
    datePublished: datePub,
    dateModified: dateMod,
    faqs,
    author
  });
  html = insertGraphAfterStylesheet(html, graph);
  fs.writeFileSync(file, html, "utf8");
  updated += 1;
}

console.log(`blog-seo-consolidate-schema: processed ${updated} articles`);
