/**
 * Mirror Next export bundles into out/assets/next (and mirror to repo paths used by
 * Cloudflare when publish directory is repo root instead of out/).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "out");
const SRC = path.join(OUT, "_next");

/** Cloudflare Pages output dir (out/) */
const DEST_OUT = path.join(OUT, "assets", "next");
/** Static dev server + deploys that publish repo root */
const DEST_ROOT_ASSETS = path.join(ROOT, "assets", "next");
/** Merged into out/ on next build via public/ copy on subsequent builds */
const DEST_PUBLIC = path.join(ROOT, "public", "assets", "next");

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

function copyTree(src, dest, label) {
  fs.rmSync(dest, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.cpSync(src, dest, { recursive: true });
  const webpack = findWebpackChunk(dest);
  if (!webpack) {
    throw new Error(`sync-next-to-assets: missing webpack chunk under ${label}`);
  }
  console.log(`sync-next-to-assets: ${label} (${countFiles(dest)} files, ${webpack})`);
  return webpack;
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

const webpack = copyTree(SRC, DEST_OUT, "out/assets/next");
copyTree(SRC, DEST_ROOT_ASSETS, "assets/next (repo root)");
copyTree(SRC, DEST_PUBLIC, "public/assets/next");

const cssDir = path.join(DEST_OUT, "static", "css");
const cssFile = fs.existsSync(cssDir) ? fs.readdirSync(cssDir).find((n) => n.endsWith(".css")) : null;
console.log(
  `sync-next-to-assets: done (${srcCount} files from out/_next, webpack=${webpack}, css=${cssFile || "none"})`
);
