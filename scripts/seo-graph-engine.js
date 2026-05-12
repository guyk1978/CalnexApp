const fs = require("fs");
const path = require("path");

const blogDataPath = path.join(process.cwd(), "data/blog.json");

function safeReadJSON(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

function normalize(text) {
  return (text || "").toLowerCase();
}

function getBlogData() {
  const data = safeReadJSON(blogDataPath);
  return Array.isArray(data) ? data : [];
}


function buildClusters(posts) {
  const clusters = {};

  posts.forEach(post => {
    const category = post.category || "uncategorized";

    if (!clusters[category]) {
      clusters[category] = [];
    }

    clusters[category].push(post);
  });

  return clusters;
}


function generateLinks(posts) {
  return posts.map(post => {
    const categoryPeers = posts.filter(
      p => p.slug !== post.slug && p.category === post.category
    );

    const genericPeers = posts.filter(
      p => p.slug !== post.slug
    );

    const links = [
      ...categoryPeers.slice(0, 3),
      ...genericPeers.slice(0, 2)
    ];

    post.internal_links = links.map(l => ({
      title: l.title,
      slug: l.slug
    }));

    return post;
  });
}


function detectPillarPages(posts) {
  return posts.map(post => {
    const score =
      (post.internal_links?.length || 0) +
      (post.title?.length > 60 ? 1 : 0);

    post.is_pillar = score >= 5;

    return post;
  });
}


function buildGraph() {
  console.log("🧠 Building SEO Graph...");

  let posts = getBlogData();

  // 1. clusters
  const clusters = buildClusters(posts);

  // 2. links
  posts = generateLinks(posts);

  // 3. pillars
  posts = detectPillarPages(posts);

  // 4. save back
  fs.writeFileSync(
    blogDataPath,
    JSON.stringify(posts, null, 2)
  );

  console.log("✅ SEO Graph built successfully");
  console.log("📊 Clusters:", Object.keys(clusters));
}

buildGraph();