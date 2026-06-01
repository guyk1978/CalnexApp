/**
 * Copy Cloudflare Pages metadata into every deploy root (out/ and repo root).
 * Many projects publish repo root, not out/ — meta must exist in both places.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { ensureDir, ensurePublicAssets, PUBLIC_ASSETS } from "./lib/ensure-public-assets.mjs";

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

  const cssDir = path.join(baseDir, "assets", "next", "static", "css");
  if (!fs.existsSync(cssDir)) {
    console.error(
      `sync-cloudflare-meta: missing ${label}assets/next/static/css — run sync-next-to-assets; take-home-pay also uses public/assets/css/take-home-pay-calculator.css`
    );
    return false;
  }
  const cssFiles = fs.readdirSync(cssDir).filter((n) => n.endsWith(".css"));
  if (cssFiles.length < 1) {
    console.error(`sync-cloudflare-meta: no .css files under ${label}assets/next/static/css`);
    return false;
  }
  for (const css of cssFiles) {
    const cssPath = path.join(cssDir, css);
    const cssSize = fs.statSync(cssPath).size;
    const head = fs.readFileSync(cssPath, "utf8").slice(0, 40);
    if (head.includes("<!") || head.includes("<html")) {
      console.error(
        `sync-cloudflare-meta: ${label}assets/next/static/css/${css} looks like HTML — wrong deploy artifact`
      );
      return false;
    }
    if (cssSize < 200) {
      console.error(`sync-cloudflare-meta: ${label}assets/next/static/css/${css} too small (${cssSize}b)`);
      return false;
    }
  }

  const thpDest = path.join(baseDir, "assets", "css", "take-home-pay-calculator.css");
  const thpSources = [
    thpDest,
    path.join(PUBLIC_ASSETS, "css", "take-home-pay-calculator.css"),
    path.join(ROOT, "assets", "css", "take-home-pay-calculator.css"),
  ];
  if (!fs.existsSync(thpDest)) {
    const src = thpSources.find((p) => p !== thpDest && fs.existsSync(p));
    if (src) {
      ensureDir(path.dirname(thpDest));
      fs.copyFileSync(src, thpDest);
      console.log(`sync-cloudflare-meta: copied take-home-pay-calculator.css → ${label}assets/css/`);
    }
  }
  if (!fs.existsSync(thpDest)) {
    console.error(
      `sync-cloudflare-meta: missing take-home-pay-calculator.css under ${label} — run sync-take-home-pay-css.mjs`
    );
    return false;
  }

  console.log(
    `sync-cloudflare-meta: ${label}assets/next OK (${webpack}, ${size} bytes, css=${cssFiles.join(", ")})`
  );
  return true;
}

ensurePublicAssets();

if (!fs.existsSync(OUT)) {
  console.error("sync-cloudflare-meta: missing out/ — run npm run build first");
  process.exit(1);
}

let ok = true;
for (const { dir, label } of DEPLOY_ROOTS) {
  ensureDir(dir);
  for (const { from, name } of FILES) {
    if (!fs.existsSync(from)) {
      console.error(`sync-cloudflare-meta: missing ${path.relative(ROOT, from)}`);
      process.exit(1);
    }
    const to = path.join(dir, name);
    ensureDir(path.dirname(to));
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
