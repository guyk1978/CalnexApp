/**
 * Mirror public/assets → assets/ so /assets/* works with static hosts (repo root)
 * and matches production HTML. Next.js still serves from public/ in dev/build.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "public", "assets");
const DEST = path.join(ROOT, "assets");

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const ent of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, ent.name);
    const to = path.join(dest, ent.name);
    if (ent.isDirectory()) copyDir(from, to);
    else fs.copyFileSync(from, to);
  }
}

if (!fs.existsSync(SRC)) {
  console.error("sync-public-assets: missing", SRC);
  process.exit(1);
}

copyDir(SRC, DEST);
console.log("sync-public-assets: public/assets → assets/");
