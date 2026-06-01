/**
 * Mirror public/assets → assets/ so /assets/* works with static hosts (repo root).
 * Creates public/assets when missing (seeded from assets/ when available).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { ensurePublicAssets, PUBLIC_ASSETS, ROOT_ASSETS } from "./lib/ensure-public-assets.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEST = ROOT_ASSETS;

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const ent of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, ent.name);
    const to = path.join(dest, ent.name);
    if (ent.isDirectory()) copyDir(from, to);
    else fs.copyFileSync(from, to);
  }
}

ensurePublicAssets({ seedFromRoot: true });

if (!fs.existsSync(PUBLIC_ASSETS)) {
  console.error("sync-public-assets: could not create", PUBLIC_ASSETS);
  process.exit(1);
}

fs.mkdirSync(DEST, { recursive: true });
copyDir(PUBLIC_ASSETS, DEST);
console.log("sync-public-assets: public/assets → assets/");
