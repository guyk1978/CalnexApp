const fs = require("fs");
const path = require("path");

const blogDataPath = path.join(process.cwd(), "data/blog.json");

// =========================
// SAFE JSON
// =========================
function readJSON(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

function writeJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// =========================
// HELPERS
// =========================
function normalize(text) {
  return (text || "").toLowerCase();
}

// =========================
// KEYWORD GENERATION
// =========================
function generateKeyword(slug) {
  return slug
    .replace(/-/g, " ")
    .replace(/\b\w/g, c => c.toLowerCase())
    .trim();
}

// =========================
// CATEGORY DETECTION
// =========================
function detectCategory(slug) {
  if (slug.includes("loan") || slug.includes("mortgage") || slug.includes("credit")) {
    return "finance";
  }

  if (slug.includes("business") || slug.includes("automation") || slug.includes("customer")) {
    return "business-ops";
  }

  return "general";
}

// =========================
// INTERNAL LINKS BUILDER
// =========================
function buildLinks(posts, currentPost) {
  return posts
    .filter(p => p.slug !== currentPost.slug)
    .filter(p => p.category === currentPost.category)
    .slice(0, 3)
    .map(p => ({
      title: p.title,
      slug: p.slug
    }));
}

// =========================
// ENRICHMENT ENGINE
// =========================
function enrich(posts) {
  return posts.map(post => {
    // 🧠 1. AUTO KEYWORD
    if (!post.primary_keyword) {
      post.primary_keyword = generateKeyword(post.slug);
    }

    // 🧠 2. AUTO CATEGORY
    if (!post.category) {
      post.category = detectCategory(post.slug);
    }

    return post;
  }).map(post => {
    // 🧠 3. INTERNAL LINKS (after category exists)
    post.internal_links = buildLinks(posts, post);

    return post;
  });
}

// =========================
// RUN
// =========================
function runEnricher() {
  console.log("🟣 Running SEO Enricher Engine...");

  let posts = readJSON(blogDataPath);

  const before = JSON.stringify(posts, null, 2);

  posts = enrich(posts);

  const after = JSON.stringify(posts, null, 2);

  writeJSON(blogDataPath, posts);

  console.log("\n✅ ENRICHMENT COMPLETE");

  console.log("\n📊 Changes applied:");
  console.log("- Auto keywords added where missing");
  console.log("- Auto categories detected");
  console.log("- Internal links generated");
  console.log("- SEO structure upgraded");

  // optional diff hint
  if (before !== after) {
    console.log("\n🟡 Blog data updated with enrichment changes");
  } else {
    console.log("\n🟢 No changes needed");
  }
}

runEnricher();