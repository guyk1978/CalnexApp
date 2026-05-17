/**
 * Generate high-quality loan scenario guide pages under /seo/generated/.
 * Future URL path reserved in seo/config/loan-guides-config.json (/loan-scenarios/).
 *
 * Usage:
 *   node scripts/generate-loan-scenario-guides.mjs
 *   node scripts/generate-loan-scenario-guides.mjs --slug=100000-loan-at-3-5-percent-for-15-years-monthly-payment-calculator
 *   node scripts/generate-loan-scenario-guides.mjs --dry-run
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const {
  renderGuidePage,
  toGuideSlug,
  toToolSlug,
  parseGuideSlug,
  loadConfig
} = require("./loan-scenario-core.cjs");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DATA_PATH = path.join(ROOT, "seo", "data", "loan-pages.json");
const OUT_ROOT = path.join(ROOT, "seo", "generated");
const MANIFEST_PATH = path.join(OUT_ROOT, ".quality-manifest.json");

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const slugArg = args.find((a) => a.startsWith("--slug="))?.split("=")[1];

const entries = JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
const config = loadConfig();

const manifest = {
  generated_at: new Date().toISOString(),
  config_future_path: config.futureBasePath,
  pages: []
};

let ok = 0;
let skipped = 0;

const targets = slugArg
  ? entries.filter((e) => toGuideSlug(toToolSlug(e.loan_amount, e.interest_rate, e.loan_term)) === slugArg)
  : entries;

if (slugArg && targets.length === 0) {
  const parsed = parseGuideSlug(slugArg);
  if (parsed) targets.push(parsed);
}

for (const entry of targets) {
  const toolSlug = toToolSlug(entry.loan_amount, entry.interest_rate, entry.loan_term);
  const guideSlug = toGuideSlug(toolSlug);
  const outDir = path.join(OUT_ROOT, guideSlug);
  const outFile = path.join(outDir, "index.html");

  const { html, quality, meta, shouldIndex } = renderGuidePage(entry);

  manifest.pages.push({
    guideSlug,
    toolSlug,
    legacyUrl: meta.legacyUrl,
    futureUrl: meta.futureUrl,
    shouldIndex,
    wordCount: quality.words,
    qualityPass: quality.pass,
    issues: quality.issues
  });

  if (!quality.pass) {
    console.warn(`SKIP (quality): ${guideSlug}`, quality.issues);
    skipped++;
    continue;
  }

  if (dryRun) {
    console.log(`[dry-run] ${guideSlug} — ${quality.words} words, index=${shouldIndex}`);
    ok++;
    continue;
  }

  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outFile, html, "utf8");
  console.log(`Wrote ${guideSlug} (${quality.words} words)`);
  ok++;
}

if (!dryRun) {
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), "utf8");
}

console.log(`Done: ${ok} pages${skipped ? `, ${skipped} skipped` : ""}. Manifest: ${MANIFEST_PATH}`);
