/**
 * One-shot / pre-build cleanup: empty all known marker regions in hub pages.
 * Run: node scripts/clean-marker-shells.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const {
  replaceMarkerBlock,
  resetGridDivMarkers,
  injectMarkerBlock
} = require("./html-inject-utils.cjs");

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const MARKER_REGIONS = [
  { file: "index.html", start: "<!-- ILB_HOME_TOOLS_START -->", end: "<!-- ILB_HOME_TOOLS_END -->" },
  { file: "index.html", start: "<!-- ILB_HOME_RECENT_START -->", end: "<!-- ILB_HOME_RECENT_END -->" },
  { file: "index.html", start: "<!-- RANK_FEATURED_START -->", end: "<!-- RANK_FEATURED_END -->" },
  { file: "tools/index.html", start: "<!-- CN_TOOLS_HUB_GRID_START -->", end: "<!-- CN_TOOLS_HUB_GRID_END -->" },
  { file: "tools/index.html", start: "<!-- ILB_TOOLS_LATEST_START -->", end: "<!-- ILB_TOOLS_LATEST_END -->" },
  { file: "blog/index.html", start: "<!-- ILB_BLOG_LATEST_START -->", end: "<!-- ILB_BLOG_LATEST_END -->" }
];

const BLOG_GRIDS = [
  { file: "blog/index.html", divId: "featuredBlogList", start: "<!-- BLOG_INDEX_FEATURED_START -->", end: "<!-- BLOG_INDEX_FEATURED_END -->" },
  { file: "blog/index.html", divId: "blogList", start: "<!-- BLOG_INDEX_ALL_START -->", end: "<!-- BLOG_INDEX_ALL_END -->" }
];

for (const { file, start, end } of MARKER_REGIONS) {
  const filePath = path.join(ROOT, file);
  if (!fs.existsSync(filePath)) continue;
  let html = fs.readFileSync(filePath, "utf8");
  if (!html.includes(start)) continue;
  const next = replaceMarkerBlock(html, start, end, "");
  if (next) {
    fs.writeFileSync(filePath, next, "utf8");
    console.log(`Cleared ${start} in ${file}`);
  }
}

for (const { file, divId, start, end } of BLOG_GRIDS) {
  const filePath = path.join(ROOT, file);
  if (!fs.existsSync(filePath)) continue;
  let html = fs.readFileSync(filePath, "utf8");
  html = resetGridDivMarkers(html, divId, start, end);
  fs.writeFileSync(filePath, html, "utf8");
  console.log(`Reset grid ${divId} in ${file}`);
}

// Ensure homepage listings wrapper exists
const indexPath = path.join(ROOT, "index.html");
let indexHtml = fs.readFileSync(indexPath, "utf8");
const wrapStart = "<!-- HOME_LISTINGS_WRAP_START -->";
const wrapEnd = "<!-- HOME_LISTINGS_WRAP_END -->";
if (!indexHtml.includes(wrapStart)) {
  const recentStart = indexHtml.indexOf("<!-- ILB_HOME_RECENT_START -->");
  const featuredEnd = indexHtml.lastIndexOf("<!-- RANK_FEATURED_END -->");
  if (recentStart !== -1 && featuredEnd !== -1) {
    const block = indexHtml.slice(recentStart, featuredEnd + "<!-- RANK_FEATURED_END -->".length);
    indexHtml =
      indexHtml.slice(0, recentStart) +
      `${wrapStart}\n      <div class="py-12 px-6 max-w-7xl mx-auto space-y-12">\n      ${block.trim()}\n      </div>\n      ${wrapEnd}` +
      indexHtml.slice(featuredEnd + "<!-- RANK_FEATURED_END -->".length);
    fs.writeFileSync(indexPath, indexHtml, "utf8");
    console.log("Wrapped homepage listing sections");
  }
}

console.log("Marker shell cleanup complete.");
