/**
 * Make out/ portable: depth-relative /assets, /_next, /data, and internal links.
 * Run after next build + sync-static-site --to-out.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  htmlDepthFromOut,
  injectCalnexRoot,
  relativePrefix,
  relativizeHtml,
} from "./lib/site-root.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "out");

function walkHtml(dir, base = OUT, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walkHtml(full, base, files);
    else if (ent.name.endsWith(".html")) {
      files.push(path.relative(base, full).replace(/\\/g, "/"));
    }
  }
  return files;
}

if (!fs.existsSync(OUT)) {
  console.error("relativize-export: missing out/ — run npm run build first");
  process.exit(1);
}

const assetsDir = path.join(OUT, "assets");
if (!fs.existsSync(assetsDir)) {
  console.warn(
    "relativize-export: warning — out/assets/ is missing (CSS/JS will 404). Ensure public/assets is copied by next build."
  );
} else {
  console.log("relativize-export: out/assets/ present");
}

const nextAssetsDir = path.join(OUT, "assets", "next");
if (!fs.existsSync(nextAssetsDir)) {
  console.warn(
    "relativize-export: warning — out/assets/next/ missing; run sync-next-to-assets before relativize-export"
  );
} else {
  console.log("relativize-export: out/assets/next/ present (Next bundles for production)");
}

let updated = 0;
for (const rel of walkHtml(OUT)) {
  const full = path.join(OUT, rel);
  const depth = htmlDepthFromOut(rel);
  const prefix = relativePrefix(depth);
  const raw = fs.readFileSync(full, "utf8");
  let next = relativizeHtml(raw, prefix);
  next = injectCalnexRoot(next, prefix);
  if (next !== raw) {
    fs.writeFileSync(full, next, "utf8");
    updated += 1;
  }
}

console.log(`relativize-export: updated ${updated} HTML file(s) under out/`);
