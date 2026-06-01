/**
 * Mirror Next export bundles into out/assets/next so hosts that do not serve
 * /_next/ (or SPA fallbacks) still deliver JS/CSS. Run after `next build`.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "out");
const SRC = path.join(OUT, "_next");
const DEST = path.join(OUT, "assets", "next");

if (!fs.existsSync(OUT)) {
  console.error("sync-next-to-assets: missing out/ — run npm run build first");
  process.exit(1);
}

if (!fs.existsSync(SRC)) {
  console.error("sync-next-to-assets: missing out/_next — run next build first");
  process.exit(1);
}

fs.rmSync(DEST, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, "assets"), { recursive: true });
fs.cpSync(SRC, DEST, { recursive: true });

let files = 0;
const walk = (dir) => {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(full);
    else files += 1;
  }
};
walk(DEST);

console.log(`sync-next-to-assets: copied ${files} file(s) to out/assets/next/`);
