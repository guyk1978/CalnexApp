/**
 * Inject minimal site navigation into all static HTML pages.
 * Run: node scripts/sync-nav.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { injectMarkerBlock } = require("./html-inject-utils.cjs");

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SKIP_DIRS = new Set(["node_modules", ".next", "out", ".git"]);

function walkHtml(dir, out = []) {
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(name.name)) continue;
    const full = path.join(dir, name.name);
    if (name.isDirectory()) walkHtml(full, out);
    else if (name.name.endsWith(".html")) out.push(full);
  }
  return out;
}

const NAV_START = "<!-- CN_NAV_MENU_START -->";
const NAV_END = "<!-- CN_NAV_MENU_END -->";

const NAV_RE = /<nav class="menu"(?:\s+id="siteMenu")?>[\s\S]*?<\/nav>/;

function buildNavMenu() {
  return `${NAV_START}
        <nav class="menu" id="siteMenu">
          <a href="/" data-nav-link>Home</a>
          <a href="/tools/" data-nav-link>Tools</a>
          <a href="/blog/" data-nav-link>Blog</a>
          <a href="/about/" data-nav-link>About</a>
          <a href="/contact/" data-nav-link>Contact</a>
        </nav>
        ${NAV_END}`;
}

let updated = 0;
let skipped = 0;

for (const file of walkHtml(ROOT)) {
  const rel = path.relative(ROOT, file).replace(/\\/g, "/");
  if (rel.startsWith("seo/generated/")) continue;

  let html = fs.readFileSync(file, "utf8");
  const navBlock = buildNavMenu();

  let next;
  if (html.includes(NAV_START)) {
    next = injectMarkerBlock(html, NAV_START, NAV_END, navBlock);
  } else if (NAV_RE.test(html)) {
    next = html.replace(NAV_RE, navBlock);
  } else {
    skipped += 1;
    continue;
  }

  if (!next) {
    skipped += 1;
    continue;
  }
  if (next !== html) {
    fs.writeFileSync(file, next, "utf8");
    updated += 1;
  }
}

console.log(`sync-nav: updated ${updated} HTML files (${skipped} skipped — no siteMenu)`);
