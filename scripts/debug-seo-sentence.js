/**
 * SEO Debug Script (Sentence-level)
 * Checks each sentence for internal links presence
 *
 * Run: node scripts/debug-seo-sentence.js
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DRAFTS_PATH = path.join(ROOT, "drafts", "pending-seo-pages.json");
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

function splitSentences(text) {
  return String(text)
    .split(/(?<=[.!?])\s+/)
    .filter(Boolean);
}

function checkSentenceLinks(content, internalLinks) {
  const sentences = splitSentences(content);
  const report = [];

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];
    const presentLinks = [];
    const missingLinks = [];

    for (const link of internalLinks) {
      if (!link.title || !link.slug) continue;
      const url = `/blog/${link.slug}/`;
      if (sentence.includes(url)) presentLinks.push(link.slug);
      else if (sentence.toLowerCase().includes(link.title.toLowerCase()))
        missingLinks.push(link.slug);
    }

    report.push({
      sentence: sentence.slice(0, 100) + (sentence.length > 100 ? "..." : ""),
      presentLinks,
      missingLinks
    });
  }

  return report;
}

function main() {
  const drafts = loadJson(DRAFTS_PATH);

  if (!drafts || !Array.isArray(drafts.items)) {
    console.error("Cannot read drafts JSON or items array missing");
    return;
  }

  console.log("=== SEO SENTENCE-LEVEL DEBUG START ===");

  for (const draft of drafts.items) {
    const slug = normSlug(draft);
    const html = readHtml(slug);
    const internalLinks = draft.internal_links || [];

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

    // Check per sentence
    const report = checkSentenceLinks(html, internalLinks);

    let totalPresent = 0;
    let totalMissing = 0;
    report.forEach((r, idx) => {
      if (r.presentLinks.length) totalPresent += r.presentLinks.length;
      if (r.missingLinks.length) totalMissing += r.missingLinks.length;

      if (r.presentLinks.length || r.missingLinks.length) {
        console.log(`  Sentence ${idx + 1}: "${r.sentence}"`);
        if (r.presentLinks.length)
          console.log(`    ✅ Present links: ${r.presentLinks.join(", ")}`);
        if (r.missingLinks.length)
          console.log(`    ⚠ Missing links: ${r.missingLinks.join(", ")}`);
      }
    });

    console.log(`- Total links in HTML: ${totalPresent}`);
    console.log(`- Total missing links: ${totalMissing}`);
  }

  console.log("\n=== SEO SENTENCE-LEVEL DEBUG END ===");
}

main();