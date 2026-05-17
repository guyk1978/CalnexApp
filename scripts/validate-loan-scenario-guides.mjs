/**
 * Quality gate for loan scenario guide pages.
 * Exit 1 if any indexed page fails thresholds.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { validateQuality, countWords, loadConfig, parseGuideSlug } = require("./loan-scenario-core.cjs");

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const GENERATED = path.join(ROOT, "seo", "generated");
const config = loadConfig();

let failures = 0;
let checked = 0;

for (const name of fs.readdirSync(GENERATED)) {
  const dir = path.join(GENERATED, name);
  if (!fs.statSync(dir).isDirectory()) continue;
  const file = path.join(dir, "index.html");
  if (!fs.existsSync(file)) continue;
  if (!name.includes("-loan-at-")) continue;

  const html = fs.readFileSync(file, "utf8");
  const quality = validateQuality(html, config);
  const noindex = html.includes('name="robots" content="noindex');
  const parsed = parseGuideSlug(name);
  checked++;

  if (!quality.pass) {
    console.error(`FAIL ${name}:`, quality.issues.join("; "));
    failures++;
  } else if (!noindex && quality.words < config.qualityThreshold.minWordCount) {
    console.error(`FAIL ${name}: indexed but only ${quality.words} words`);
    failures++;
  } else {
    console.log(`OK ${name} — ${quality.words} words${noindex ? " (noindex)" : ""}`);
  }
}

console.log(`Checked ${checked} guide pages, ${failures} failures.`);
process.exit(failures > 0 ? 1 : 0);
