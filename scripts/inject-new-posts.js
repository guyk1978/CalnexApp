/**
 * inject-new-posts.js
 * 
 * Usage:
 * 1. שמור את JSON של הפוסטים החדשים כ־newPosts.json
 * 2. הרץ:
 *    node inject-new-posts.js
 */

const fs = require('fs');
const path = require('path');

// ---------------------------
// CONFIG
// ---------------------------
const BLOG_JSON_PATH = path.join(process.cwd(), 'data/blog.json');
const BLOG_DIR = path.join(process.cwd(), 'blog');
const NEW_POSTS_JSON = path.join(process.cwd(), 'newPosts.json'); // קרוסור output

// ---------------------------
// HELPER FUNCTIONS
// ---------------------------
function safeReadJSON(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return [];
  }
}

function safeWriteJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

function writeHTMLFile(slug, content) {
  const dir = path.join(BLOG_DIR, slug);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const filePath = path.join(dir, 'index.html');
  fs.writeFileSync(filePath, content, 'utf-8');
}

// ---------------------------
// MAIN
// ---------------------------
function main() {
  // 1️⃣ Load existing blog.json
  const blogData = safeReadJSON(BLOG_JSON_PATH);

  // 2️⃣ Load new posts JSON (output of your prompt)
  const newPosts = safeReadJSON(NEW_POSTS_JSON);

  if (!Array.isArray(newPosts) || newPosts.length === 0) {
    console.error('❌ No new posts found in', NEW_POSTS_JSON);
    process.exit(1);
  }

  // 3️⃣ Merge posts into blog.json
  const combined = [...blogData];

  newPosts.forEach(post => {
    if (!combined.find(p => p.slug === post.slug)) {
      combined.push(post);
    } else {
      console.warn(`⚠️ Duplicate slug skipped: ${post.slug}`);
    }
  });

  safeWriteJSON(BLOG_JSON_PATH, combined);
  console.log(`✅ Added ${newPosts.length} posts to data/blog.json`);

  // 4️⃣ Create index.html for each new post
  newPosts.forEach(post => {
    const htmlContent = `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>${post.title} | CalnexApp Blog</title>
  </head>
  <body>
    <h1>${post.title}</h1>
    <p>${post.excerpt}</p>
    <p>Read Time: ${post.readTime}</p>
  </body>
</html>
    `.trim();

    writeHTMLFile(post.slug, htmlContent);
    console.log(`✅ Created blog/${post.slug}/index.html`);
  });

  console.log('\n🎉 All done! You can now push your changes.');
}

main();