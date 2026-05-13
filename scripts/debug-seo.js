/**
 * SEO Debug Script
 * Checks all posts and drafts for internal link issues
 *
 * Run: node scripts/debug-seo.js
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DRAFTS_PATH = path.join(ROOT, "drafts", "pending-seo-pages.json");
const BLOG_JSON_PATH = path.join(ROOT, "data", "blog.json");
const BLOG_DIR = path.join(ROOT, "blog");

function normSlug(item) {
  return String((item && item.slug) || "").replace(/[^a-z0-9-]/gi, "");
}

function loadJson(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function readHtml(slug) {
  const filePath = path.join(BLOG_DIR, slug, "index.html");
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath, "utf8");
}

function checkInternalLinksInHtml(html, internalLinks = []) {
  if (!html || !internalLinks.length) return [];
  const missing = [];
  for (const link of internalLinks) {
    if (!link.title || !link.slug) continue;
    const url = `/blog/${link.slug}/`;
    if (!html.includes(url)) missing.push(link.slug);
  }
  return missing;
}

function main() {
  const drafts = loadJson(DRAFTS_PATH);
  const posts = loadJson(BLOG_JSON_PATH);

  if (!drafts || !Array.isArray(drafts.items)) {
    console.error("Cannot read drafts JSON or items array missing");
    return;
  }

  if (!posts || !Array.isArray(posts)) {
    console.error("Cannot read blog.json or invalid array");
    return;
  }

  console.log("=== SEO DEBUG START ===");

  for (const draft of drafts.items) {
    const slug = normSlug(draft);
    const html = readHtml(slug);
    const internalLinks = draft.internal_links || [];

    const missingLinks = checkInternalLinksInHtml(html, internalLinks);

    console.log(`\nPost: "${draft.title || slug}"`);
    console.log(`- Status: ${draft.status}`);
    console.log(`- Slug: ${slug}`);
    console.log(`- Internal links defined: ${internalLinks.length}`);
    if (!html) {
      console.log("⚠ HTML file missing!");
      continue;
    }
    if (!internalLinks.length) {
      console.log("⚠ No internal links defined in JSON");
      continue;
    }
    if (!missingLinks.length) {
      console.log("✅ All internal links found in HTML");
    } else {
      console.log(`⚠ Missing in HTML: ${missingLinks.join(", ")}`);
    }
  }

  console.log("\n=== SEO DEBUG END ===");
}

main();