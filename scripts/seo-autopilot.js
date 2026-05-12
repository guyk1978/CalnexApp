const fs = require("fs");
const path = require("path");

const blogDataPath = path.join(process.cwd(), "data/blog.json");

function safeReadJSON(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

function normalize(k) {
  return (k || "").toLowerCase();
}


function detectContentGaps(posts) {
  const topics = posts.map(p => normalize(p.category));

  const frequency = {};

  topics.forEach(t => {
    frequency[t] = (frequency[t] || 0) + 1;
  });

  const gaps = [];

  Object.entries(frequency).forEach(([topic, count]) => {
    if (count < 2) {
      gaps.push({
        topic,
        severity: "HIGH"
      });
    }
  });

  return gaps;
}


function detectWeakPosts(posts) {
  return posts.filter(post => {
    const linkCount = (post.internal_links || []).length;
    const titleLength = (post.title || "").length;

    return linkCount < 2 || titleLength < 40;
  });
}


function buildTasks(gaps, weakPosts) {
  const tasks = [];

  gaps.forEach(g => {
    tasks.push({
      type: "CREATE_CONTENT",
      reason: `Missing content cluster: ${g.topic}`,
      priority: g.severity
    });
  });

  weakPosts.forEach(p => {
    tasks.push({
      type: "IMPROVE_POST",
      slug: p.slug,
      reason: "Low internal link density or weak structure",
      priority: "MEDIUM"
    });
  });

  return tasks;
}


function runAutopilot() {
  console.log("🧠 Running SEO Autopilot...");

  const posts = safeReadJSON(blogDataPath);

  // 1. detect gaps
  const gaps = detectContentGaps(posts);

  // 2. detect weak posts
  const weak = detectWeakPosts(posts);

  // 3. build tasks
  const tasks = buildTasks(gaps, weak);

  // 4. output
  console.log("\n📊 SEO AUTOPILOT REPORT:\n");

  console.log("🔴 Content Gaps:");
  gaps.forEach(g => console.log(` - ${g.topic}`));

  console.log("\n🟡 Weak Posts:");
  weak.forEach(p => console.log(` - ${p.slug}`));

  console.log("\n🧠 Suggested Actions:");
  tasks.forEach(t => {
    console.log(` - [${t.type}] ${t.reason}`);
  });

  // optional: save for Cursor
  fs.writeFileSync(
    path.join(process.cwd(), "data/seo-tasks.json"),
    JSON.stringify(tasks, null, 2)
  );

  console.log("\n✅ Autopilot analysis complete");
}

runAutopilot();