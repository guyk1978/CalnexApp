/**
 * Mirror static site pages into public/ (dev) and out/ (production) so tools
 * match calnexapp.com 1:1. App Router must not define the same paths.
 *
 * Does not touch out/_next/ (created by `next build`). Run `relativize-export`
 * after `sync-static-site --to-out` in postbuild for portable relative URLs.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TO_OUT = process.argv.includes("--to-out");

const STATIC_TREE_COPIES = [
  { src: "tools", dest: "tools" },
  { src: "engine", dest: "engine" },
  { src: "blog", dest: "blog" },
  { src: "site-inventory", dest: "site-inventory" },
];

/** Next.js app-router exports — do not overwrite with repo-root static HTML. */
const NEXT_APP_ROUTE_DIRS = new Set(["tools/take-home-pay"]);

function copyDir(src, dest, { skipRelPrefixes = [] } = {}) {
  if (!fs.existsSync(src)) {
    console.warn(`sync-static-site: skip missing ${src}`);
    return 0;
  }
  fs.mkdirSync(dest, { recursive: true });
  let count = 0;
  for (const ent of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, ent.name);
    const rel = path.relative(ROOT, from).replace(/\\/g, "/");
    if (skipRelPrefixes.some((prefix) => rel === prefix || rel.startsWith(`${prefix}/`))) {
      continue;
    }
    const to = path.join(dest, ent.name);
    if (ent.isDirectory()) count += copyDir(from, to, { skipRelPrefixes });
    else {
      fs.copyFileSync(from, to);
      count += 1;
    }
  }
  return count;
}

function removeIndexTxtUnder(dir) {
  if (!fs.existsSync(dir)) return 0;
  let removed = 0;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) removed += removeIndexTxtUnder(full);
    else if (ent.name === "index.txt") {
      fs.unlinkSync(full);
      removed += 1;
    }
  }
  return removed;
}

function syncToBase(baseDir, { isOut = false } = {}) {
  let files = 0;
  const skipRelPrefixes = [...NEXT_APP_ROUTE_DIRS];
  for (const { src, dest } of STATIC_TREE_COPIES) {
    files += copyDir(path.join(ROOT, src), path.join(baseDir, dest), { skipRelPrefixes });
  }
  // Only purge stale static HTML from public/ — never delete Next export routes in out/.
  if (!isOut) {
    for (const routeDir of NEXT_APP_ROUTE_DIRS) {
      const stale = path.join(baseDir, routeDir);
      if (fs.existsSync(stale)) {
        fs.rmSync(stale, { recursive: true, force: true });
        console.log(`sync-static-site: removed stale ${path.relative(ROOT, stale).replace(/\\/g, "/")}/`);
      }
    }
  }
  return files;
}

const publicFiles = syncToBase(path.join(ROOT, "public"), { isOut: false });
let outMsg = "";

if (TO_OUT) {
  const outDir = path.join(ROOT, "out");
  if (!fs.existsSync(outDir)) {
    console.error("sync-static-site: missing out/ — run next build first");
    process.exit(1);
  }
  const outFiles = syncToBase(outDir, { isOut: true });
  const removedToolsTxt = removeIndexTxtUnder(path.join(outDir, "tools"));
  const removedBlogTxt = removeIndexTxtUnder(path.join(outDir, "blog"));
  outMsg = `, out/ (${outFiles} files, removed ${removedToolsTxt} index.txt under tools/, ${removedBlogTxt} under blog/)`;
}

console.log(`sync-static-site: public/ (${publicFiles} files)${outMsg}`);
