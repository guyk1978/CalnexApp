/**
 * Make out/ portable: depth-relative /assets, /assets/next, /data, and internal links.
 * Run after sync-next-to-assets.mjs and sync-next-app-routes.mjs (nav sync must run first).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  assertNoAbsoluteNextPaths,
  assertTakeHomePayBundles,
  htmlDepthFromOut,
  injectCalnexRoot,
  relativePrefix,
  relativizeHtml,
} from "./lib/site-root.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "out");

/** Pages that must reference Next bundles under assets/next (not /_next). */
/** Mirrored by sync-next-app-routes.mjs — relativize after nav sync. */
const EXTRA_HTML = [{ rel: "tools/take-home-pay/index.html", depth: 2 }];

const BUNDLE_AUDIT_PATHS = [
  "tools/take-home-pay/index.html",
  "out/tools/take-home-pay/index.html",
];

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

function relativizeAt(full, relLabel, depth) {
  const prefix = relativePrefix(depth);
  const raw = fs.readFileSync(full, "utf8");
  let next = relativizeHtml(raw, prefix);
  next = injectCalnexRoot(next, prefix);
  assertNoAbsoluteNextPaths(next, relLabel);
  if (relLabel.includes("take-home-pay")) {
    assertTakeHomePayBundles(next, relLabel);
  }
  return { full, raw, next };
}

function relativizeOutFile(rel) {
  const full = path.join(OUT, rel);
  const depth = htmlDepthFromOut(rel);
  return relativizeAt(full, rel, depth);
}

if (!fs.existsSync(OUT)) {
  console.error("relativize-export: missing out/ — run npm run build first");
  process.exit(1);
}

const nextAssetsDir = path.join(OUT, "assets", "next");
if (!fs.existsSync(nextAssetsDir)) {
  console.error("relativize-export: missing out/assets/next/ — run: node scripts/sync-next-to-assets.mjs");
  process.exit(1);
}

const htmlFiles = walkHtml(OUT);
if (htmlFiles.length === 0) {
  console.warn("relativize-export: no HTML files found under out/");
}

let updated = 0;
for (const rel of htmlFiles) {
  const { full, raw, next } = relativizeOutFile(rel);
  if (next !== raw) {
    fs.writeFileSync(full, next, "utf8");
    updated += 1;
  }
}

for (const { rel, depth } of EXTRA_HTML) {
  const full = path.join(ROOT, rel);
  if (!fs.existsSync(full)) continue;
  const { raw, next } = relativizeAt(full, rel, depth);
  if (next !== raw) {
    fs.writeFileSync(full, next, "utf8");
    updated += 1;
  }
}

console.log(`relativize-export: processed ${htmlFiles.length} HTML file(s), updated ${updated}`);

for (const auditRel of BUNDLE_AUDIT_PATHS) {
  const auditFull = auditRel.startsWith("out/")
    ? path.join(ROOT, auditRel)
    : auditRel.startsWith("tools/")
      ? path.join(ROOT, auditRel)
      : path.join(OUT, auditRel);
  if (!fs.existsSync(auditFull)) continue;
  const raw = fs.readFileSync(auditFull, "utf8");
  assertNoAbsoluteNextPaths(raw, auditRel);
  assertTakeHomePayBundles(raw, auditRel);
  console.log(`relativize-export: audit OK — ${auditRel}`);
}
