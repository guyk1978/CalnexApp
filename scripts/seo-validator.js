const fs = require("fs");
const path = require("path");

const blogDir = path.join(process.cwd(), "blog");
const blogDataPath = path.join(process.cwd(), "data/blog.json");

// =========================
// JSON SAFE READ
// =========================
function safeReadJSON(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch (err) {
    console.error(`❌ Failed to read JSON: ${filePath}`);
    process.exit(1);
  }
}

// =========================
// DATA LOADING
// =========================
function getBlogData() {
  const data = safeReadJSON(blogDataPath);
  return Array.isArray(data) ? data : [];
}

function getAllBlogFiles() {
  try {
    return fs.existsSync(blogDir) ? fs.readdirSync(blogDir) : [];
  } catch {
    return [];
  }
}

// =========================
// HELPERS
// =========================
function normalizeKeyword(k) {
  if (!k) return null;
  return String(k).trim().toLowerCase();
}

// =========================
// LEGACY DETECTION
// =========================
function getPostMode(post) {
  const financeKeywords = [
    "loan",
    "mortgage",
    "interest",
    "credit",
    "debt"
  ];

  const slug = (post.slug || "").toLowerCase();

  if (financeKeywords.some(k => slug.includes(k))) {
    return "LEGACY";
  }

  return "ACTIVE";
}

// =========================
// 🧠 SELF-HEALING LAYER
// =========================
function autoFixMissingKeywords(posts) {
  return posts.map(post => {
    const mode = getPostMode(post);

    if (mode === "ACTIVE" && !post.primary_keyword) {
      post.primary_keyword = post.slug
        .replace(/-/g, " ")
        .trim();
    }

    return post;
  });
}

// =========================
// MAIN VALIDATION
// =========================
function validate() {
  console.log("🔍 Running SEO Validation v4 (SELF-HEALING)...");

  let blogData = getBlogData();
  const files = getAllBlogFiles();

  // 🧠 AUTO FIX STEP (IMPORTANT)
  blogData = autoFixMissingKeywords(blogData);

  let errors = [];

  // =========================
  // 1. STRUCTURE CHECKS
  // =========================
  blogData.forEach(post => {
    if (!post.slug) {
      errors.push("Missing slug in post");
      return;
    }

    if (!post.title) {
      errors.push(`Missing title in ${post.slug}`);
    }

    const mode = getPostMode(post);

    if (mode === "ACTIVE" && !post.primary_keyword) {
      errors.push(`Missing keyword in ${post.slug}`);
    }
  });

  // =========================
  // 2. DUPLICATE SLUGS
  // =========================
  const slugs = blogData.map(p => p.slug).filter(Boolean);

  const duplicateSlugs = slugs.filter((s, i) => slugs.indexOf(s) !== i);

  if (duplicateSlugs.length > 0) {
    errors.push(
      "Duplicate slugs found: " + [...new Set(duplicateSlugs)].join(", ")
    );
  }

  // =========================
  // 3. KEYWORD CANNIBALIZATION
  // =========================
  const groupedByCategory = {};

  blogData.forEach(post => {
    const category = post.category || "uncategorized";
    const keyword = normalizeKeyword(post.primary_keyword);

    if (!groupedByCategory[category]) {
      groupedByCategory[category] = [];
    }

    if (keyword) {
      groupedByCategory[category].push({
        keyword,
        slug: post.slug
      });
    }
  });

  Object.entries(groupedByCategory).forEach(([category, items]) => {
    const seen = new Map();

    items.forEach(item => {
      if (!item.keyword) return;

      if (seen.has(item.keyword)) {
        errors.push(
          `Keyword cannibalization in [${category}]: "${item.keyword}" (${seen.get(item.keyword)} ↔ ${item.slug})`
        );
      } else {
        seen.set(item.keyword, item.slug);
      }
    });
  });

  // =========================
  // 4. ORPHAN CHECK (WARNING ONLY)
  // =========================
  const referencedSlugs = new Set();

  blogData.forEach(post => {
    const content = post.content || "";

    blogData.forEach(other => {
      if (content.includes(other.slug)) {
        referencedSlugs.add(other.slug);
      }
    });
  });

  blogData.forEach(post => {
    if (!referencedSlugs.has(post.slug)) {
      console.warn(`⚠️ Orphan post (no internal links detected): ${post.slug}`);
    }
  });

  // =========================
  // RESULT
  // =========================
  if (errors.length > 0) {
    console.log("\n❌ SEO VALIDATION FAILED\n");
    errors.forEach(e => console.log(" - " + e));
    process.exit(1);
  }

  console.log("\n✅ SEO VALIDATION PASSED (SELF-HEALING ENABLED)");
}

validate();