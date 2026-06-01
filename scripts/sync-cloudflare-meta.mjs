/**
 * Copy Cloudflare Pages metadata into every deploy root (out/ and repo root).
 * Many projects publish repo root, not out/ — meta must exist in both places.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "out");

const FILES = [
  { from: path.join(ROOT, "_headers"), name: "_headers" },
  { from: path.join(ROOT, "_redirects"), name: "_redirects" },
  { from: path.join(ROOT, "public", "_routes.json"), name: "_routes.json" },
];

const DEPLOY_ROOTS = [
  { dir: OUT, label: "out/" },
  { dir: ROOT, label: "repo root" },
];

function verifyNextBundles(baseDir, label) {
  const chunk = path.join(baseDir, "assets", "next", "static", "chunks");
  if (!fs.existsSync(chunk)) {
    console.error(`sync-cloudflare-meta: missing ${label}assets/next/static/chunks`);
    return false;
  }
  const webpack = fs.readdirSync(chunk).find((n) => n.startsWith("webpack-") && n.endsWith(".js"));
  if (!webpack) {
    console.error(`sync-cloudflare-meta: missing webpack-*.js under ${label}assets/next/`);
    return false;
  }
  const full = path.join(chunk, webpack);
  const size = fs.statSync(full).size;
  if (size < 500) {
    console.error(`sync-cloudflare-meta: ${label}${webpack} too small (${size}b) — not a real bundle`);
    return false;
  }
  console.log(`sync-cloudflare-meta: ${label}assets/next OK (${webpack}, ${size} bytes)`);
  return true;
}

if (!fs.existsSync(OUT)) {
  console.error("sync-cloudflare-meta: missing out/ — run npm run build first");
  process.exit(1);
}

let ok = true;
for (const { dir, label } of DEPLOY_ROOTS) {
  for (const { from, name } of FILES) {
    if (!fs.existsSync(from)) {
      console.error(`sync-cloudflare-meta: missing ${path.relative(ROOT, from)}`);
      process.exit(1);
    }
    const to = path.join(dir, name);
    fs.copyFileSync(from, to);
    console.log(`sync-cloudflare-meta: ${label}${name}`);
  }
  if (!verifyNextBundles(dir, label)) ok = false;
}

if (!ok) {
  console.error("sync-cloudflare-meta: FAILED — run sync-next-to-assets before this script");
  process.exit(1);
}

console.log("sync-cloudflare-meta: OK");
