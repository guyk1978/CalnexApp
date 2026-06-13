/**
 * Mirror assets/css → public/assets/css (Next deploy) and optionally → out/assets/css.
 * Cloudflare Pages serves out/; only public/assets is copied into out by `next build`.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { ensureDir, PUBLIC_ASSETS, ROOT_ASSETS } from "./lib/ensure-public-assets.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC_CSS = path.join(ROOT_ASSETS, "css");
const TO_OUT = process.argv.includes("--to-out");

function listCssNames(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((name) => name.endsWith(".css"));
}

/** Union merge: primary wins on name conflicts; fills gaps from secondary. */
function mergeCssDirs(primary, secondary, dest) {
  if (!fs.existsSync(primary)) {
    console.error("sync-site-css: missing", primary);
    process.exit(1);
  }
  ensureDir(dest);
  const names = new Set([...listCssNames(secondary), ...listCssNames(primary)]);
  let count = 0;
  for (const name of names) {
    const fromPrimary = path.join(primary, name);
    const fromSecondary = path.join(secondary, name);
    const source = fs.existsSync(fromPrimary)
      ? fromPrimary
      : fs.existsSync(fromSecondary)
        ? fromSecondary
        : null;
    if (!source) continue;
    fs.copyFileSync(source, path.join(dest, name));
    count += 1;
  }
  return count;
}

function copyCssDir(src, dest) {
  const secondary = src === SRC_CSS ? path.join(PUBLIC_ASSETS, "css") : null;
  if (secondary && fs.existsSync(secondary)) {
    return mergeCssDirs(src, secondary, dest);
  }
  if (!fs.existsSync(src)) {
    console.error("sync-site-css: missing", src);
    process.exit(1);
  }
  ensureDir(dest);
  let count = 0;
  for (const name of listCssNames(src)) {
    fs.copyFileSync(path.join(src, name), path.join(dest, name));
    count += 1;
  }
  return count;
}

const publicDest = path.join(PUBLIC_ASSETS, "css");
const publicCount = copyCssDir(SRC_CSS, publicDest);
let outMsg = "";
if (TO_OUT) {
  const outDir = path.join(ROOT, "out", "assets", "css");
  if (!fs.existsSync(path.join(ROOT, "out"))) {
    console.warn("sync-site-css: skip out/ (not built yet)");
  } else {
    const outCount = copyCssDir(SRC_CSS, outDir);
    outMsg = `, out/assets/css (${outCount} files)`;
  }
}

console.log(`sync-site-css: assets/css → public/assets/css (${publicCount} files)${outMsg}`);
