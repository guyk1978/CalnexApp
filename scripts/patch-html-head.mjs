/**
 * Patch static HTML: theme-init, style.css manifest link, Tools nav link.
 * Run: node scripts/patch-html-head.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { siteStylesheetLinks, versionSiteScripts, SITE_SCRIPT_VERSION } = require("./site-stylesheets.cjs");

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const THEME_LINE = `    <script src="/assets/js/theme-init.js?v=${SITE_SCRIPT_VERSION}"></script>`;
const FAVICON_LINE = '    <link rel="icon" href="data:;base64,=">';
const STYLESHEET_BLOCK = siteStylesheetLinks();
const AUX_CSS_RE =
  /\s*<link\s+rel="stylesheet"\s+href="\/assets\/css\/(?:tokens|cn-components|header-wide|site-search)\.css"\s*\/?>\s*/gi;
const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  ".next",
  "out",
  "public",
  "coverage",
  "dist",
  "drafts",
]);

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(name.name)) continue;
    const full = path.join(dir, name.name);
    if (name.isDirectory()) walk(full, out);
    else if (name.name.endsWith(".html")) out.push(full);
  }
  return out;
}

function patchStylesheets(html) {
  if (!html.includes("/assets/css/style.css")) return html;
  let next = html.replace(AUX_CSS_RE, "");
  if (next.includes("/assets/css/tokens.css")) {
    // legacy multi-link stack from earlier patch — collapse to manifest
    next = next.replace(AUX_CSS_RE, "");
  }
  next = next.replace(
    /<link\s+rel="stylesheet"\s+href="\/assets\/css\/style\.css(?:\?v=[^"]*)?"\s*\/?>\s*/i,
    `${STYLESHEET_BLOCK}\n`
  );
  return next;
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

  if (!next.includes("theme-init.js") && next.includes("/assets/css/style.css")) {
    const viewportRe = /(<meta\s+name="viewport"[^>]*\/?>)/i;
    if (viewportRe.test(next)) {
      next = next.replace(viewportRe, `$1\n${THEME_LINE}`);
    } else {
      const linkRe = /(<link\s+rel="stylesheet"\s+href="\/assets\/css\/style\.css[^"]*"\s*\/?>)/i;
      if (linkRe.test(next)) next = next.replace(linkRe, `${THEME_LINE}\n    $1`);
    }
  }

  next = next.replace(
    /<a href="\/tools\/loan-calculator\/" data-nav-link>Tools<\/a>/g,
    '<a href="/tools/" data-nav-link>Tools</a>'
  );

  next = patchStylesheets(next);
  next = versionSiteScripts(next);

  if (next !== raw) {
    fs.writeFileSync(file, next, "utf8");
    patched += 1;
  }
}

console.log(`patch-html-head: updated ${patched} files`);
