import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TAG = '<script src="/assets/js/header-toolbar.js" defer></script>';
const GEO = '<script src="/assets/js/geo-finance.js" defer></script>';

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    if (name.name === "node_modules" || name.name.startsWith(".")) continue;
    const full = path.join(dir, name.name);
    if (name.isDirectory()) walk(full, out);
    else if (name.name.endsWith(".html")) out.push(full);
  }
  return out;
}

let patched = 0;
for (const file of walk(ROOT)) {
  let html = fs.readFileSync(file, "utf8");
  if (!html.includes("geo-finance.js") || html.includes("header-toolbar.js")) continue;
  const next = html.replace(GEO, `${TAG}\n    ${GEO}`);
  if (next !== html) {
    fs.writeFileSync(file, next, "utf8");
    patched += 1;
  }
}
console.log(`patch-header-toolbar: updated ${patched} files`);
