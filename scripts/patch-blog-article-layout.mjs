/**
 * Migrate blog articles to integrated Industrial Matte layout (sidebar + clean article flow).
 * Run: node scripts/patch-blog-article-layout.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { transformArticlePage } from "./blog-editorial-core.cjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BLOG_DIR = path.join(ROOT, "blog");

function walkArticles(dir, out = []) {
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    if (name.name.startsWith(".")) continue;
    const full = path.join(dir, name.name);
    if (name.isDirectory() && fs.existsSync(path.join(full, "index.html"))) {
      if (name.name !== "latest") out.push(path.join(full, "index.html"));
    }
  }
  return out;
}

function fixMigratedArticle(html) {
  if (!html.includes("cn-blog-article-workspace")) {
    return { html, changed: false };
  }
  let next = html;
  next = next
    .replace(/<section class="cn-blog-article-extra">\s*<h2>FAQ<\/h2>/gi, '<section class="cn-blog-article-faq"><h2>FAQ</h2>')
    .replace(/<section class="py-12 border-t[^"]*"/gi, '<section class="cn-blog-article-extra"');
  return { html: next, changed: next !== html };
}

let updated = 0;
for (const file of walkArticles(BLOG_DIR)) {
  const html = fs.readFileSync(file, "utf8");
  const result = transformArticlePage(html);
  const fix = fixMigratedArticle(result.html);
  const next = fix.html;
  if (result.changed || fix.changed) {
    fs.writeFileSync(file, next, "utf8");
    updated += 1;
  }
}

console.log(`patch-blog-article-layout: updated ${updated} articles`);
