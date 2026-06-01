/**
 * Inject share-results UI + scripts on all calculators (data/tools.json).
 *
 * New calculator: add to tools.json, set data-page on <body>, run npm run sync-calculator-share
 *
 * Run: node scripts/sync-calculator-share.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import { injectMarkerBlock } from "./html-inject-utils.cjs";

const require = createRequire(import.meta.url);
const { SOCIAL_SHARE_LINKS_HTML } = require("./calculator-share-social-html.cjs");

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tools = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "tools.json"), "utf8"));

const SHARE_SCRIPTS = [
  "/assets/js/calculator-share.js",
  "/assets/js/calculator-share-init.js"
];

const SHARE_START = "<!-- CN_CALCULATOR_SHARE_START -->";
const SHARE_END = "<!-- CN_CALCULATOR_SHARE_END -->";

const SHARE_ICON =
  '<svg class="cn-theme-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>';

function slugId(toolName) {
  return toolName.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
}

function buildShareMenuOnly(toolName) {
  const slug = slugId(toolName);
  return `${SHARE_START}
            <div class="cn-share-menu" data-cn-share-menu>
              <button type="button" class="btn btn-primary cn-share-menu__trigger" data-cn-share-toggle aria-expanded="false" aria-haspopup="dialog">
                ${SHARE_ICON}
                <span>Share</span>
              </button>
              <div class="cn-share-menu__panel" data-cn-share-panel hidden role="dialog" aria-label="Share calculation">
                <p class="cn-share-menu__title">Share this calculation</p>
                <p class="muted cn-share-menu__hint">Opens with your inputs pre-filled on CalnexApp.</p>
                <input
                  id="cnShareUrl-${slug}"
                  class="cn-calculator-share__url"
                  type="text"
                  readonly
                  data-cn-share-url
                  aria-label="Shareable calculator URL"
                />
                <div class="cn-share-menu__actions">
                  <button type="button" class="btn btn-primary btn-sm" data-cn-share-action="native">Share…</button>
                  <button type="button" class="btn btn-ghost btn-sm" data-cn-share-action="copy">Copy link</button>
                  <button type="button" class="btn btn-ghost btn-sm" data-cn-share-action="copy-message">Copy summary</button>
                  <button type="button" class="btn btn-ghost btn-sm" data-cn-share-action="email">Email</button>
                </div>
                <div class="cn-share-menu__social" aria-label="Social networks">${SOCIAL_SHARE_LINKS_HTML}
                </div>
              </div>
            </div>
${SHARE_END}`;
}

function buildShareBlock(toolName) {
  return buildShareMenuOnly(toolName);
}

function upgradeLegacyShareBlock(html, toolName) {
  if (!html.includes(SHARE_START) || html.includes("data-cn-share-menu")) return html;
  return injectMarkerBlock(html, SHARE_START, SHARE_END, buildShareMenuOnly(toolName).trim());
}

const PLACEMENTS = {
  "mortgage-calculator": {
    anchor: /<!-- CN_PDF_EXPORT_START -->/i,
    insertBefore: true
  },
  "car-loan-calculator": {
    anchor: /<!-- CN_PDF_EXPORT_START -->/i,
    insertBefore: true
  },
  "debt-payoff": {
    anchor: /<!-- CN_PDF_EXPORT_START -->/i,
    insertBefore: true
  },
  "loan-comparison": {
    anchor: /<!-- CN_PDF_EXPORT_START -->/i,
    insertBefore: true
  },
  "rent-vs-buy-calculator": {
    anchor: /<!-- CN_PDF_EXPORT_START -->/i,
    insertBefore: true
  },
  "interest-calculator": {
    anchor: /<!-- CN_PDF_EXPORT_START -->/i,
    insertBefore: true
  },
  "retirement-calculator": {
    anchor: /<!-- CN_PDF_EXPORT_START -->/i,
    insertBefore: true
  },
};

const DEFAULT_PLACEMENT = {
  anchor: /<!-- CN_PDF_EXPORT_START -->|<!-- CN_PDF_EXPORT_ANCHOR -->|<\/main>/i,
  insertBefore: true
};

function hasShareUi(html) {
  return (
    html.includes("<!-- CN_EXPORT_SHARE_TOOLBAR_START -->") ||
    html.includes("data-cn-share-menu") ||
    (html.includes("share-tools") && html.includes("shareUrlInline") && html.includes("cn-export-share-toolbar"))
  );
}

function ensureShareScripts(html) {
  const bodyClose = html.lastIndexOf("</body>");
  if (bodyClose === -1) return html;

  const missing = SHARE_SCRIPTS.filter((src) => !html.includes(src));
  if (!missing.length) return html;

  const block = missing.map((src) => `    <script src="${src}" defer></script>`).join("\n");
  return `${html.slice(0, bodyClose)}\n${block}\n${html.slice(bodyClose)}`;
}

function ensureShareToast(html) {
  if (html.includes('id="shareToast"') || html.includes('id="cnShareToast"')) return html;
  const bodyClose = html.lastIndexOf("</body>");
  if (bodyClose === -1) return html;
  const toast = `      <div id="cnShareToast" class="share-toast" role="status" aria-live="polite"></div>\n`;
  return `${html.slice(0, bodyClose)}\n${toast}${html.slice(bodyClose)}`;
}

function injectShareBlock(html, tool, placement) {
  if (hasShareUi(html)) return html;
  if (tool.slug === "loan-calculator" || tool.slug === "take-home-pay-calculator") return html;

  const block = buildShareBlock(tool.name);
  const existing = injectMarkerBlock(html, SHARE_START, SHARE_END, block.trim());
  if (existing) return existing;

  const match = placement.anchor.exec(html);
  if (!match) {
    console.warn(`sync-calculator-share: anchor not found for ${tool.slug}`);
    return html;
  }

  const idx = placement.insertBefore ? match.index : match.index + match[0].length;
  const wrap = `\n            <div class="cn-calculator-share-wrap" style="margin: 0.75rem 0 1rem">\n              ${block}\n            </div>\n`;
  return `${html.slice(0, idx)}${wrap}${html.slice(idx)}`;
}

function patchFile(filePath, tool) {
  const placement = PLACEMENTS[tool.slug] || DEFAULT_PLACEMENT;
  let html = fs.readFileSync(filePath, "utf8");
  const before = html;

  html = upgradeLegacyShareBlock(html, tool.name);
  html = injectShareBlock(html, tool, placement);
  html = ensureShareScripts(html);
  html = ensureShareToast(html);

  if (html !== before) {
    fs.writeFileSync(filePath, html, "utf8");
    return true;
  }
  return false;
}

let updated = 0;
for (const tool of tools) {
  const rel = tool.path.replace(/^\//, "").replace(/\/$/, "");
  const filePath = path.join(ROOT, rel, "index.html");
  if (!fs.existsSync(filePath)) {
    console.warn(`sync-calculator-share: missing ${filePath}`);
    continue;
  }
  if (patchFile(filePath, tool)) updated += 1;
}

console.log(`sync-calculator-share: updated ${updated} calculator pages`);
