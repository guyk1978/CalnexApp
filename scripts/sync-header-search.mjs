/**
 * Inject visible header search trigger + site-search.js into static HTML pages.
 * Run: node scripts/sync-header-search.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import { injectMarkerBlock } from "./html-inject-utils.cjs";

const require = createRequire(import.meta.url);
const { SITE_SCRIPT_VERSION } = require("./site-stylesheets.cjs");

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SKIP_DIRS = new Set(["node_modules", ".next", "out", ".git"]);

const BLOCK_START = "<!-- CN_HEADER_SEARCH_START -->";
const BLOCK_END = "<!-- CN_HEADER_SEARCH_END -->";

const SEARCH_BLOCK = `${BLOCK_START}
        <div class="cn-header-actions">
          <div id="cn-site-search-mount" class="cn-header-search-mount">
            <div class="cn-header-search-wrap">
              <button
                type="button"
                id="cn-header-search-trigger"
                class="cn-header-search-trigger"
                aria-label="Search"
                aria-expanded="false"
                aria-controls="cn-header-search"
              >
                <svg
                  class="cn-header-search-trigger__icon"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.25"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" />
                </svg>
              </button>
            </div>
          </div>
        </div>
        ${BLOCK_END}`;

const TOOLBAR_SCRIPT = `<script src="/assets/js/header-toolbar.js?v=${SITE_SCRIPT_VERSION}" defer></script>`;
const SEARCH_SCRIPT = `<script src="/assets/js/site-search.js?v=${SITE_SCRIPT_VERSION}" defer></script>`;

function walkHtml(dir, out = []) {
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(name.name)) continue;
    const full = path.join(dir, name.name);
    if (name.isDirectory()) walkHtml(full, out);
    else if (name.name.endsWith(".html")) out.push(full);
  }
  return out;
}

function injectSearchBlock(html) {
  if (!html.includes('class="site-header"') && !html.includes("class='site-header'")) {
    return null;
  }

  if (html.includes(BLOCK_START)) {
    return injectMarkerBlock(html, BLOCK_START, BLOCK_END, SEARCH_BLOCK);
  }

  const navEnd = "<!-- CN_NAV_MENU_END -->";
  if (html.includes(navEnd)) {
    return html.replace(navEnd, `${navEnd}\n        ${SEARCH_BLOCK}`);
  }

  const navClose = /<nav class="menu"[^>]*>[\s\S]*?<\/nav>/;
  if (navClose.test(html)) {
    return html.replace(navClose, (match) => `${match}\n        ${SEARCH_BLOCK}`);
  }

  return null;
}

function normalizeChromeScriptOrder(html) {
  if (!html.includes("header-toolbar.js") || !html.includes("site-search.js")) {
    return html;
  }

  const toolbarIdx = html.indexOf(TOOLBAR_SCRIPT);
  const searchIdx = html.indexOf(SEARCH_SCRIPT);
  if (toolbarIdx === -1 || searchIdx === -1 || toolbarIdx < searchIdx) {
    return html;
  }

  let next = html.replace(`    ${SEARCH_SCRIPT}\n`, "");
  next = next.replace(SEARCH_SCRIPT, "");
  return next.replace(
    TOOLBAR_SCRIPT,
    `${TOOLBAR_SCRIPT}\n    ${SEARCH_SCRIPT}`
  );
}

function injectChromeScripts(html) {
  if (!html.includes('class="site-header"') && !html.includes("class='site-header'")) {
    return null;
  }

  const needsToolbar = !html.includes("header-toolbar.js");
  const needsSearch = !html.includes("site-search.js");
  if (!needsToolbar && !needsSearch) return null;

  const scripts = [];
  if (needsToolbar) scripts.push(TOOLBAR_SCRIPT);
  if (needsSearch) scripts.push(SEARCH_SCRIPT);
  const block = scripts.join("\n    ");

  if (html.includes("header-toolbar.js") && needsSearch) {
    return html.replace(
      '<script src="/assets/js/header-toolbar.js" defer></script>',
      `<script src="/assets/js/header-toolbar.js" defer></script>\n    ${SEARCH_SCRIPT}`
    );
  }

  if (html.includes('src="/assets/js/app.js"')) {
    return html.replace(
      '<script src="/assets/js/app.js" defer></script>',
      `${block}\n    <script src="/assets/js/app.js" defer></script>`
    );
  }

  if (html.includes("</body>")) {
    return html.replace("</body>", `    ${block}\n  </body>`);
  }

  return null;
}

let updated = 0;
let skipped = 0;

for (const file of walkHtml(ROOT)) {
  const rel = path.relative(ROOT, file).replace(/\\/g, "/");
  if (rel.startsWith("seo/generated/")) continue;

  let html = fs.readFileSync(file, "utf8");
  const withBlock = injectSearchBlock(html);
  const withScript = withBlock ? injectChromeScripts(withBlock) : injectChromeScripts(html);

  if (!withBlock && !withScript) {
    skipped += 1;
    continue;
  }

  const next = normalizeChromeScriptOrder(withScript || withBlock);
  if (next && next !== html) {
    fs.writeFileSync(file, next, "utf8");
    updated += 1;
  }
}

console.log(`sync-header-search: updated ${updated} HTML files (${skipped} skipped)`);
