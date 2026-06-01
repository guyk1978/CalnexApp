/**
 * Sync /data for dev (public/data) and production (out/data after next build).
 * Run: node scripts/sync-out-static.mjs [--data-only]
 */
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "out");
const DATA_SRC = path.join(ROOT, "data");
const DATA_ONLY = process.argv.includes("--data-only");

/** Static route roots merged into out/ when Next has no index.txt yet. */
const STATIC_INDEX_ROUTES = ["about/index.html", "contact/index.html"];

/** Do not overwrite Next-exported app routes with static HTML. */
const NEXT_ROUTE_PREFIXES = ["404"];

function copyDir(src, dest) {
  if (!fs.existsSync(src)) {
    console.warn(`sync-out-static: skip missing ${src}`);
    return 0;
  }
  fs.mkdirSync(dest, { recursive: true });
  let count = 0;
  for (const ent of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, ent.name);
    const to = path.join(dest, ent.name);
    if (ent.isDirectory()) count += copyDir(from, to);
    else {
      fs.copyFileSync(from, to);
      count += 1;
    }
  }
  return count;
}

function copyFile(src, dest) {
  if (!fs.existsSync(src)) return false;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  return true;
}

function isNextRoute(routeDir) {
  const normalized = routeDir.replace(/\\/g, "/");
  return NEXT_ROUTE_PREFIXES.some(
    (prefix) => normalized === prefix.replace(/\/$/, "") || normalized.startsWith(prefix)
  );
}

function mergeStaticIndex(relPath) {
  const src = path.join(ROOT, relPath);
  const dest = path.join(OUT, relPath);
  const routeDir = path.dirname(relPath).replace(/\\/g, "/");

  if (isNextRoute(`${routeDir}/`)) return false;
  if (fs.existsSync(path.join(OUT, routeDir, "index.txt"))) return false;
  return copyFile(src, dest);
}

console.log("sync-out-static: building search index…");
execSync("node scripts/build-search-index.js", { cwd: ROOT, stdio: "inherit" });

const publicCount = copyDir(DATA_SRC, path.join(ROOT, "public", "data"));
let outCount = 0;
let staticMerged = 0;

if (!DATA_ONLY) {
  if (!fs.existsSync(OUT)) {
    console.error("sync-out-static: missing out/ — run `next build` first");
    process.exit(1);
  }
  outCount = copyDir(DATA_SRC, path.join(OUT, "data"));
  for (const rel of STATIC_INDEX_ROUTES) {
    if (mergeStaticIndex(rel)) staticMerged += 1;
  }

  execSync("node scripts/sync-static-site.mjs --to-out", { cwd: ROOT, stdio: "inherit" });

  console.log(
    `sync-out-static: public/data/ (${publicCount} files), out/data/ (${outCount} files), ${staticMerged} static index.html merged`
  );
} else {
  console.log(`sync-out-static: public/data/ (${publicCount} files)`);
}
