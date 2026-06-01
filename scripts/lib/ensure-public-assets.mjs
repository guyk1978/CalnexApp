/**
 * Idempotent helpers: guarantee public/assets (and mirrors) exist before build steps.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

export const PUBLIC_ASSETS = path.join(ROOT, "public", "assets");
export const ROOT_ASSETS = path.join(ROOT, "assets");

const DEFAULT_SUBDIRS = ["css", "js", "data"];

/** Recursive mkdir (Node fs.mkdirSync recursive). */
export function ensureDir(dir) {
  if (!dir) return;
  fs.mkdirSync(dir, { recursive: true });
}

/** Create public/assets tree; optionally seed from repo-root assets/ when public is empty. */
export function ensurePublicAssets({ seedFromRoot = true } = {}) {
  ensureDir(PUBLIC_ASSETS);
  for (const sub of DEFAULT_SUBDIRS) {
    ensureDir(path.join(PUBLIC_ASSETS, sub));
  }

  const publicHasFiles = dirHasFiles(PUBLIC_ASSETS);
  if (!publicHasFiles && seedFromRoot && fs.existsSync(ROOT_ASSETS) && dirHasFiles(ROOT_ASSETS)) {
    copyDir(ROOT_ASSETS, PUBLIC_ASSETS);
    console.log("ensure-public-assets: seeded public/assets ← assets/");
    return;
  }

  if (!publicHasFiles) {
    console.log("ensure-public-assets: created empty public/assets (css, js, data)");
  }
}

export function ensureOutAssets() {
  ensureDir(path.join(ROOT, "out", "assets", "css"));
  ensureDir(path.join(ROOT, "out", "assets", "next", "static", "css"));
}

/** Write file only when content differs; always mkdir parent. */
export function writeFileIdempotent(filePath, content) {
  ensureDir(path.dirname(filePath));
  const next = typeof content === "string" ? content : content.toString();
  if (fs.existsSync(filePath)) {
    const prev = fs.readFileSync(filePath, "utf8");
    if (prev === next) return false;
  }
  fs.writeFileSync(filePath, next, "utf8");
  return true;
}

export function readUtf8IfExists(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return null;
  }
}

function dirHasFiles(dir) {
  if (!fs.existsSync(dir)) return false;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isFile()) return true;
    if (ent.isDirectory() && dirHasFiles(full)) return true;
  }
  return false;
}

function copyDir(src, dest) {
  ensureDir(dest);
  for (const ent of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, ent.name);
    const to = path.join(dest, ent.name);
    if (ent.isDirectory()) copyDir(from, to);
    else fs.copyFileSync(from, to);
  }
}
