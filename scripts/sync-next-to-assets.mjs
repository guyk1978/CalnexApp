/**
 * Mirror Next export bundles into out/assets/next so hosts that do not serve
 * /_next/ (or SPA fallbacks) still deliver JS/CSS. Run after `next build`.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "out");
const SRC = path.join(OUT, "_next");
const DEST = path.join(OUT, "assets", "next");

function countFiles(dir) {
  let count = 0;
  if (!fs.existsSync(dir)) return 0;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) count += countFiles(full);
    else count += 1;
  }
  return count;
}

function findWebpackChunk(dir) {
  const chunks = path.join(dir, "static", "chunks");
  if (!fs.existsSync(chunks)) return null;
  return fs.readdirSync(chunks).find((n) => /^webpack-[a-f0-9]+\.js$/.test(n)) || null;
}

if (!fs.existsSync(OUT)) {
  console.error("sync-next-to-assets: missing out/ — run npm run build first");
  process.exit(1);
}

if (!fs.existsSync(SRC)) {
  console.error("sync-next-to-assets: missing out/_next — run next build first");
  process.exit(1);
}

const srcCount = countFiles(SRC);
if (srcCount < 1) {
  console.error("sync-next-to-assets: out/_next is empty");
  process.exit(1);
}

fs.rmSync(DEST, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, "assets"), { recursive: true });
fs.cpSync(SRC, DEST, { recursive: true });

const destCount = countFiles(DEST);
if (destCount !== srcCount) {
  console.warn(`sync-next-to-assets: file count mismatch (_next=${srcCount}, assets/next=${destCount})`);
}

const webpack = findWebpackChunk(DEST);
const cssDir = path.join(DEST, "static", "css");
const cssFile = fs.existsSync(cssDir)
  ? fs.readdirSync(cssDir).find((n) => n.endsWith(".css"))
  : null;

if (!webpack) {
  console.error("sync-next-to-assets: missing webpack-*.js in assets/next/static/chunks");
  process.exit(1);
}

if (!cssFile) {
  console.warn("sync-next-to-assets: warning — no .css under assets/next/static/css");
}

console.log(
  `sync-next-to-assets: copied ${destCount} file(s) → out/assets/next/ (${webpack}, ${cssFile || "no css"})`
);
