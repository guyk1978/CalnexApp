/**
 * Mirror repo assets/js → public/assets/js before `next build`.
 * Next static export only ships public/; without this, untracked calculator scripts 404 on Cloudflare.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { ensureDir, PUBLIC_ASSETS, ROOT_ASSETS } from "./lib/ensure-public-assets.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT_ASSETS, "js");
const DEST = path.join(PUBLIC_ASSETS, "js");

function copyDir(src, dest) {
  if (!fs.existsSync(src)) {
    console.error("sync-assets-js-to-public: missing", src);
    process.exit(1);
  }
  ensureDir(dest);
  let count = 0;
  for (const ent of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, ent.name);
    const to = path.join(dest, ent.name);
    if (ent.isDirectory()) {
      count += copyDir(from, to);
      continue;
    }
    if (!ent.name.endsWith(".js")) continue;
    ensureDir(path.dirname(to));
    fs.copyFileSync(from, to);
    count += 1;
  }
  return count;
}

const copied = copyDir(SRC, DEST);
console.log(`sync-assets-js-to-public: copied ${copied} .js files → public/assets/js/`);
