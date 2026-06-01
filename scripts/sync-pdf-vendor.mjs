/**
 * Copy jspdf UMD build into assets/ and public/assets/ (deployed paths).
 * Never fails the build: uses node_modules when present, else keeps committed vendor file.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const CANDIDATE_SRC = [
  path.join(ROOT, "node_modules", "jspdf", "dist", "jspdf.umd.min.js"),
  path.join(ROOT, "node_modules", "jspdf", "dist", "jspdf.node.min.js"),
];

const DESTS = [
  path.join(ROOT, "assets", "js", "vendor", "jspdf.umd.min.js"),
  path.join(ROOT, "public", "assets", "js", "vendor", "jspdf.umd.min.js"),
];

function resolveSource() {
  for (const candidate of CANDIDATE_SRC) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

const src = resolveSource();
const fallback = DESTS[0];

if (src) {
  for (const dest of DESTS) {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
  console.log("sync-pdf-vendor: copied jspdf.umd.min.js → assets + public/assets");
} else if (fs.existsSync(fallback)) {
  for (const dest of DESTS) {
    if (dest === fallback) continue;
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(fallback, dest);
  }
  console.warn(
    "sync-pdf-vendor: node_modules/jspdf not found — using committed assets/js/vendor/jspdf.umd.min.js"
  );
} else {
  console.error(
    "sync-pdf-vendor: missing jspdf vendor file. Run npm install and commit assets/js/vendor/jspdf.umd.min.js"
  );
  process.exit(1);
}
