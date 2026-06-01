/**
 * Fail the build if required calculator scripts are missing from out/assets/js.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { PDF_SCRIPT_PATHS, CALCULATOR_UTILITY_SCRIPT_PATHS } = require("./calculator-asset-manifest.cjs");

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_JS = path.join(ROOT, "out", "assets", "js");

const REQUIRED = [
  "/assets/js/rent-vs-buy.js",
  "/assets/js/interest.js",
  "/assets/js/retirement.js",
  "/assets/js/loan.js",
  "/assets/js/mortgage.js",
  "/assets/js/car-loan.js",
  "/assets/js/debt-payoff.js",
  "/assets/js/loan-comparison.js",
  "/assets/js/roi-calculator.js",
  ...PDF_SCRIPT_PATHS,
  ...CALCULATOR_UTILITY_SCRIPT_PATHS,
];

function toOutPath(assetPath) {
  const rel = assetPath.replace(/^\//, "");
  return path.join(ROOT, "out", rel);
}

const missing = [];
for (const assetPath of REQUIRED) {
  const file = toOutPath(assetPath);
  if (!fs.existsSync(file)) {
    missing.push(assetPath);
    continue;
  }
  const head = fs.readFileSync(file, "utf8").slice(0, 80);
  if (head.includes("<!DOCTYPE") || head.includes("<html")) {
    missing.push(`${assetPath} (HTML, not JS)`);
  }
}

if (missing.length) {
  console.error("verify-calculator-assets: missing or invalid:");
  missing.forEach((m) => console.error("  -", m));
  process.exit(1);
}

console.log(`verify-calculator-assets: OK (${REQUIRED.length} scripts)`);
