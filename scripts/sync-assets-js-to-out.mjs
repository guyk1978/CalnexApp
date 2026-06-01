/**
 * Mirror assets/js → out/assets/js after next export (safety net for Cloudflare deploy).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { PUBLIC_ASSETS, ROOT_ASSETS } from "./lib/ensure-public-assets.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "out");
const DEST = path.join(OUT, "assets", "js");
const SOURCES = [path.join(ROOT_ASSETS, "js"), path.join(PUBLIC_ASSETS, "js")];

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function copyDir(src, dest) {
  ensureDir(dest);
  let count = 0;
  for (const ent of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, ent.name);
    const to = path.join(dest, ent.name);
    if (ent.isDirectory()) {
      count += copyDir(from, to);
      continue;
    }
    if (!ent.name.endsWith(".js")) continue;
    fs.copyFileSync(from, to);
    count += 1;
  }
  return count;
}

if (!fs.existsSync(OUT)) {
  console.error("sync-assets-js-to-out: missing out/ — run next build first");
  process.exit(1);
}

let copied = 0;
for (const src of SOURCES) {
  if (fs.existsSync(src)) copied += copyDir(src, DEST);
}
console.log(`sync-assets-js-to-out: copied ${copied} .js files → out/assets/js/`);
