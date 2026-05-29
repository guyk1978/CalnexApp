/**
 * Patch blog articles: category pills + themed quick-answer boxes.
 * Run: node scripts/patch-blog-articles.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  classifyBlogCategory,
  renderBlogCategoryPill,
  renderDefaultRecommendedCalculators,
  renderRelatedSection
} from "./tool-themes.cjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BLOG_DIR = path.join(ROOT, "blog");

function walkArticles(dir, out = []) {
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    if (name.name.startsWith(".")) continue;
    const full = path.join(dir, name.name);
    if (name.isDirectory() && fs.existsSync(path.join(full, "index.html"))) out.push(path.join(full, "index.html"));
  }
  return out;
}

function patchArticle(filePath) {
  let html = fs.readFileSync(filePath, "utf8");
  let changed = false;
  let category = "Blog";

  const eyebrowMatch = html.match(/<section class="page-title[^"]*">\s*<p class="eyebrow">([^<]*)<\/p>/i);
  if (eyebrowMatch) {
    category = eyebrowMatch[1].trim();
    const pill = renderBlogCategoryPill(category);
    const next = html.replace(
      /<section class="page-title[^"]*">\s*<p class="eyebrow">[^<]*<\/p>/i,
      `<section class="page-title cn-article-page-title">\n        ${pill}`
    );
    if (next !== html) {
      html = next;
      changed = true;
    }
  } else if (html.includes('<section class="page-title">') && !html.includes("cn-article-page-title")) {
    html = html.replace('<section class="page-title">', '<section class="page-title cn-article-page-title">');
    changed = true;
  }

  const quickRe =
    /(<article class="card article-body">\s*)<h2([^>]*)>Quick answer<\/h2>\s*(<p[\s\S]*?<\/p>)/i;
  if (quickRe.test(html) && !html.includes("cn-quick-answer")) {
    html = html.replace(quickRe, (_, open, h2Attrs, paragraph) => {
      const accent = classifyBlogCategory(category);
      return `${open}<div class="cn-quick-answer cn-quick-answer--${accent}"><h2${h2Attrs}>Quick answer</h2>${paragraph}</div>`;
    });
    changed = true;
  }

  const plainRecommendedRe =
    /<section class="card">\s*<h2>Recommended calculators<\/h2>\s*<ul class="toc-list">[\s\S]*?<\/ul>\s*<\/section>/gi;
  if (plainRecommendedRe.test(html)) {
    html = html.replace(plainRecommendedRe, renderDefaultRecommendedCalculators());
    changed = true;
  }

  const plainCalculatorsRe =
    /<section class="card">\s*<h2>Calculators<\/h2>\s*<ul class="toc-list">[\s\S]*?<\/ul>\s*<\/section>/gi;
  if (plainCalculatorsRe.test(html)) {
    html = html.replace(plainCalculatorsRe, renderRelatedSection("Calculators", [
      { url: "/tools/car-loan-calculator/", title: "Car loan calculator", slug: "car-loan-calculator" },
      { url: "/tools/loan-calculator/", title: "Loan calculator", slug: "loan-calculator" }
    ]));
    changed = true;
  }

  if (changed) fs.writeFileSync(filePath, html, "utf8");
  return changed;
}

let updated = 0;
for (const file of walkArticles(BLOG_DIR)) {
  if (patchArticle(file)) updated += 1;
}

console.log(`patch-blog-articles: updated ${updated} articles`);
