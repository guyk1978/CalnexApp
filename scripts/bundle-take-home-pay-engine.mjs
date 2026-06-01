/**
 * Bundle take-home pay tax math for static tools (no React).
 * Output: public/assets/js/take-home-pay-engine.js (IIFE → window.TakeHomePayEngine)
 */
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ENTRY = path.join(ROOT, "src/lib/take-home-pay/index.ts");
const OUT = path.join(ROOT, "public/assets/js/take-home-pay-engine.js");
const OUT_MIRROR = path.join(ROOT, "assets/js/take-home-pay-engine.js");

if (!fs.existsSync(ENTRY)) {
  console.error("bundle-take-home-pay-engine: missing", ENTRY);
  process.exit(1);
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });

const cmd = [
  "npx",
  "esbuild",
  ENTRY,
  "--bundle",
  "--format=iife",
  "--global-name=TakeHomePayEngine",
  `--outfile=${OUT}`,
  "--platform=browser",
  "--target=es2020",
].join(" ");

execSync(cmd, { cwd: ROOT, stdio: "inherit", shell: true });
fs.copyFileSync(OUT, OUT_MIRROR);
console.log("bundle-take-home-pay-engine:", path.relative(ROOT, OUT));
