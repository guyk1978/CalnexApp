/**
 * Mirror out/_next and out/assets/next into repo root for local static dev.
 * Take-home pay is a static HTML tool (see scripts/generate-take-home-pay-page.mjs).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "out");

function copyDir(src, dest) {
  if (!fs.existsSync(src)) {
    console.warn(`sync-next-app-routes: missing ${src}`);
    return false;
  }
  fs.rmSync(dest, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.cpSync(src, dest, { recursive: true });
  return true;
}

if (!fs.existsSync(OUT)) {
  console.error("sync-next-app-routes: missing out/ — run `npm run build` first");
  process.exit(1);
}

const nextSrc = path.join(OUT, "_next");
const nextDest = path.join(ROOT, "_next");
if (fs.existsSync(nextSrc)) {
  copyDir(nextSrc, nextDest);
  console.log("sync-next-app-routes: _next/ (for static dev server)");
} else {
  console.warn("sync-next-app-routes: missing out/_next");
}

const nextAssetsSrc = path.join(OUT, "assets", "next");
const nextAssetsDest = path.join(ROOT, "assets", "next");
if (fs.existsSync(nextAssetsSrc)) {
  copyDir(nextAssetsSrc, nextAssetsDest);
  console.log("sync-next-app-routes: assets/next/ (production Next bundles)");
} else {
  console.warn("sync-next-app-routes: missing out/assets/next");
}
