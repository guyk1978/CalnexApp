/**
 * Bundle take-home pay tax math for static tools (no React).
 * Output: public/assets/js/take-home-pay-engine.js (IIFE → window.TakeHomePayEngine)
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import * as esbuild from "esbuild";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ENTRY = path.join(ROOT, "src/lib/take-home-pay/index.ts");
const OUT = path.join(ROOT, "public/assets/js/take-home-pay-engine.js");
const OUT_MIRROR = path.join(ROOT, "assets/js/take-home-pay-engine.js");

if (!fs.existsSync(ENTRY)) {
  console.error("bundle-take-home-pay-engine: missing", ENTRY);
  process.exit(1);
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });

await esbuild.build({
  entryPoints: [ENTRY],
  outfile: OUT,
  bundle: true,
  format: "iife",
  globalName: "TakeHomePayEngine",
  platform: "browser",
  target: "es2020",
  logLevel: "warning",
});

fs.copyFileSync(OUT, OUT_MIRROR);
console.log("bundle-take-home-pay-engine:", path.relative(ROOT, OUT));
