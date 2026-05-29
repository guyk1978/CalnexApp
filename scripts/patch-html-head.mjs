/**
 * One-time / CI patch: inject sync theme-init before stylesheets; normalize Tools nav to /tools/.
 * Run: node scripts/patch-html-head.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const THEME_LINE = '    <script src="/assets/js/theme-init.js"></script>';
const FAVICON_LINE = '    <link rel="icon" href="data:;base64,=">';
const STYLESHEET_VERSION = "1.2";
const STYLESHEET_HREF = `/assets/css/style.css?v=${STYLESHEET_VERSION}`;

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    if (name.name.startsWith(".") || name.name === "node_modules") continue;
    const full = path.join(dir, name.name);
    if (name.isDirectory()) walk(full, out);
    else if (name.name.endsWith(".html")) out.push(full);
  }
  return out;
}

let patched = 0;
for (const file of walk(ROOT)) {
  let raw = fs.readFileSync(file, "utf8");
  let next = raw;
  if (!next.includes('rel="icon"')) {
    const charsetRe = /(<meta\s+charset="[^"]*"\s*\/?>)/i;
    if (charsetRe.test(next)) {
      next = next.replace(charsetRe, `$1\n${FAVICON_LINE}`);
    } else if (/<head[^>]*>/i.test(next)) {
      next = next.replace(/<head[^>]*>/i, (m) => `${m}\n${FAVICON_LINE}`);
    }
  }

  if (next.includes("theme-init.js")) {
    // still fix Tools link
  } else if (next.includes('/assets/css/style.css"')) {
    const viewportRe = /(<meta\s+name="viewport"[^>]*\/>)/i;
    if (viewportRe.test(next)) {
      next = next.replace(viewportRe, `$1\n${THEME_LINE}`);
    } else {
      const linkRe = /(<link\s+rel="stylesheet"\s+href="\/assets\/css\/style\.css"\s*\/?>)/i;
      if (linkRe.test(next)) next = next.replace(linkRe, `${THEME_LINE}\n    $1`);
    }
  }

  next = next.replace(
    /<a href="\/tools\/loan-calculator\/" data-nav-link>Tools<\/a>/g,
    '<a href="/tools/" data-nav-link>Tools</a>'
  );

  next = next.replace(
    /<link\s+rel="stylesheet"\s+href="\/assets\/css\/style\.css(?:\?v=[^"]*)?"\s*\/?>/gi,
    `<link rel="stylesheet" href="${STYLESHEET_HREF}" />`
  );

  if (next !== raw) {
    fs.writeFileSync(file, next, "utf8");
    patched += 1;
  }
}

console.log(`patch-html-head: updated ${patched} files`);
