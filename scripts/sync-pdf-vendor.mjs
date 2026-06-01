/**
 * Copy jspdf UMD build into assets/ and public/assets/ (deployed paths).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const VENDOR_SRC = path.join(ROOT, "node_modules", "jspdf", "dist", "jspdf.umd.min.js");
const DESTS = [
  path.join(ROOT, "assets", "js", "vendor", "jspdf.umd.min.js"),
  path.join(ROOT, "public", "assets", "js", "vendor", "jspdf.umd.min.js"),
];

if (!fs.existsSync(VENDOR_SRC)) {
  console.error("sync-pdf-vendor: missing", VENDOR_SRC, "— run npm install");
  process.exit(1);
}

for (const dest of DESTS) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(VENDOR_SRC, dest);
}

console.log("sync-pdf-vendor: copied jspdf.umd.min.js → assets + public/assets");
