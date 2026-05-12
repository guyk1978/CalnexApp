const { execSync } = require("child_process");

function run(cmd) {
  return execSync(cmd, { stdio: "inherit" });
}

function getGitDiff() {
  return execSync("git diff --cached --name-only").toString();
}

function detectChangeType(diff) {
  if (diff.includes("blog/")) return "content";
  if (diff.includes("data/blog.json") || diff.includes("sitemap")) return "index";
  if (diff.includes("scripts/")) return "system";
  return "misc";
}

function buildCommitMessage(type) {
  switch (type) {
    case "content":
      return "feat(blog): add/update SEO content";
    case "index":
      return "chore(blog): update blog index & sitemap";
    case "system":
      return "chore(system): update SEO pipeline scripts";
    default:
      return "chore(update): general project update";
  }
}

function runPipeline() {
  console.log("🚀 Running Smart Git Pipeline...");

  // 1. Run SEO validation first
  console.log("\n🔍 Step 1: SEO Validation");
  run("node scripts/seo-validator.js");

  // 2. Stage changes
  console.log("\n📦 Step 2: Staging files");
  run("git add .");

  // 3. Detect change type
  const diff = getGitDiff();
  const type = detectChangeType(diff);

  console.log(`\n🧠 Detected change type: ${type}`);

  // 4. Commit
  const message = buildCommitMessage(type);
  console.log(`\n✍️ Committing: ${message}`);

  run(`git commit -m "${message}"`);

  // 5. Push
  console.log("\n🚀 Pushing to GitHub...");
  run("git push origin main");

  // 6. Trigger publish API
  console.log("\n🌍 Triggering Publish API...");
  run("curl -X POST https://calnexapp.com/api/publish-now -H \"Content-Type: application/json\" -d \"{}\"");

  console.log("\n✅ PIPELINE COMPLETED SUCCESSFULLY");
}

runPipeline();