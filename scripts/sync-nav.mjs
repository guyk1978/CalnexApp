/**
 * Inject unified Tools dropdown navigation into all static HTML pages.
 * Run: node scripts/sync-nav.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { renderNavToolLink, renderNavScenarioLink } = require("./tool-themes.cjs");
const { injectMarkerBlock } = require("./html-inject-utils.cjs");

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SKIP_DIRS = new Set(["node_modules", ".next", "out", ".git"]);

const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

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

function buildNavMenu(tools, groups, loanPages = []) {
  const byGroup = new Map();
  for (const tool of tools) {
    const key = tool.navGroup || "lending";
    if (!byGroup.has(key)) byGroup.set(key, []);
    byGroup.get(key).push(tool);
  }

  const sortedGroups = [...byGroup.entries()].sort((a, b) => {
    const orderA = groups[a[0]]?.order ?? 99;
    const orderB = groups[b[0]]?.order ?? 99;
    return orderA - orderB;
  });

  const groupBlocks = sortedGroups
    .map(([key, items]) => {
      const label = groups[key]?.label || key;
      const links = items.map((tool) => `                  ${renderNavToolLink(tool)}`).join("\n");
      return `              <div class="cn-nav-dropdown__group">
                <p class="cn-nav-dropdown__label">${escapeHtml(label)}</p>
                <div class="cn-nav-dropdown__grid">
${links}
                </div>
              </div>`;
    })
    .join("\n");

  const scenarioBlock =
    loanPages.length > 0
      ? `              <div class="cn-nav-dropdown__group cn-nav-dropdown__group--scenarios">
                <p class="cn-nav-dropdown__label">Loan scenarios (${loanPages.length})</p>
                <div class="cn-nav-dropdown__grid cn-nav-dropdown__grid--scenarios">
${loanPages.map((entry) => `                  ${renderNavScenarioLink(entry)}`).join("\n")}
                </div>
              </div>`
      : "";

  return `${NAV_START}
        <nav class="menu" id="siteMenu">
          <a href="/" data-nav-link>Home</a>
          <div class="cn-nav-dropdown">
            <a href="/tools/" class="cn-nav-dropdown__trigger" data-nav-link aria-haspopup="true" aria-expanded="false" id="cnToolsNavTrigger">Tools</a>
            <div class="cn-nav-dropdown__panel" role="menu" aria-labelledby="cnToolsNavTrigger">
              <a href="/tools/" class="cn-nav-dropdown__hub" role="menuitem">All calculators</a>
              <div class="cn-nav-dropdown__scroll">
${groupBlocks}
${scenarioBlock}
              </div>
            </div>
          </div>
          <a href="/blog/" data-nav-link>Blog</a>
          <a href="/about/" data-nav-link>About</a>
          <a href="/contact/" data-nav-link>Contact</a>
        </nav>
        ${NAV_END}`;
}

const tools = readJson("data/tools.json");
const groups = readJson("data/nav-tool-groups.json");
const loanPagesPath = path.join(ROOT, "seo/data/loan-pages.json");
const loanPages = fs.existsSync(loanPagesPath) ? readJson("seo/data/loan-pages.json") : [];

let updated = 0;
let skipped = 0;

for (const file of walkHtml(ROOT)) {
  const rel = path.relative(ROOT, file).replace(/\\/g, "/");
  if (rel.startsWith("seo/generated/")) continue;

  let html = fs.readFileSync(file, "utf8");
  const navBlock = buildNavMenu(tools, groups, loanPages);

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

console.log(
  `sync-nav: updated ${updated} HTML files (${skipped} skipped — no siteMenu; ${loanPages.length} loan scenarios in menu)`
);
