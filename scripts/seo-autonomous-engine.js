const fs = require("fs");
const path = require("path");

const blogDataPath = path.join(process.cwd(), "data/blog.json");
const tasksPath = path.join(process.cwd(), "data/seo-tasks.json");

function readJSON(file) {
  return JSON.parse(fs.readFileSync(file, "utf-8"));
}


function decideActions(posts, tasks) {
  const actions = [];

  tasks.forEach(task => {
    if (task.type === "CREATE_CONTENT") {
      actions.push({
        action: "GENERATE_ARTICLE",
        topic: task.reason,
        priority: task.priority
      });
    }

    if (task.type === "IMPROVE_POST") {
      actions.push({
        action: "ENHANCE_INTERNAL_LINKS",
        slug: task.slug,
        reason: task.reason
      });
    }
  });

  return actions;
}


function generateContentTask(action) {
  if (action.action === "GENERATE_ARTICLE") {
    return {
      prompt: `
Create a high-quality SEO blog post for CalnexApp.

Topic: ${action.topic}

Requirements:
- SEO optimized
- internal links to existing posts
- no keyword cannibalization
- include CTA
- include FAQ
      `
    };
  }
}


function fixInternalLinks(posts) {
  return posts.map(post => {
    const peers = posts.filter(p => p.slug !== post.slug);

    post.internal_links = peers
      .slice(0, 5)
      .map(p => ({
        title: p.title,
        slug: p.slug
      }));

    return post;
  });
}


function runAutonomousEngine() {
  console.log("🤖 Running Autonomous SEO Engine...");

  const posts = readJSON(blogDataPath);
  const tasks = readJSON(tasksPath);

  // 1. Decide actions
  const actions = decideActions(posts, tasks);

  console.log("\n🧠 DECISIONS:");

  actions.forEach(a => {
    console.log(` - ${a.action}: ${a.topic || a.slug}`);
  });

  // 2. Apply fixes (internal links)
  const updatedPosts = fixInternalLinks(posts);

  fs.writeFileSync(
    blogDataPath,
    JSON.stringify(updatedPosts, null, 2)
  );

  // 3. Save next generation tasks (loop)
  const nextTasks = actions.map(a => ({
    ...a,
    status: "PENDING_EXECUTION"
  }));

  fs.writeFileSync(
    tasksPath,
    JSON.stringify(nextTasks, null, 2)
  );

  console.log("\n✅ Autonomous cycle complete");
}

runAutonomousEngine();

