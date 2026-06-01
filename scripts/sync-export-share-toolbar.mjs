/**
 * Unified Export & share toolbar (CSV + PDF + Share) — always below calculator results.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { SOCIAL_SHARE_LINKS_HTML } = require("./calculator-share-social-html.cjs");

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tools = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "tools.json"), "utf8"));

const TOOLBAR_START = "<!-- CN_EXPORT_SHARE_TOOLBAR_START -->";
const TOOLBAR_END = "<!-- CN_EXPORT_SHARE_TOOLBAR_END -->";
const PDF_START = "<!-- CN_PDF_EXPORT_START -->";
const PDF_END = "<!-- CN_PDF_EXPORT_END -->";
const SHARE_START = "<!-- CN_CALCULATOR_SHARE_START -->";
const SHARE_END = "<!-- CN_CALCULATOR_SHARE_END -->";

const TOOLBAR_RE = new RegExp(
  `${escapeRe(TOOLBAR_START)}[\\s\\S]*?${escapeRe(TOOLBAR_END)}\\s*`,
  "gi"
);

const SHARE_ICON =
  '<svg class="cn-theme-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>';

const PDF_ICON = `<svg class="cn-pdf-export-btn__icon cn-theme-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`;

function escapeRe(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function slugId(toolName) {
  return toolName.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
}

function buildShareMenu(toolName) {
  const slug = slugId(toolName);
  return `${SHARE_START}
              <div class="cn-share-menu" data-cn-share-menu>
                <button type="button" class="cn-action-btn cn-action-btn--accent cn-share-menu__trigger" data-cn-share-toggle aria-expanded="false" aria-haspopup="dialog">
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

function buildPdfButton(toolName) {
  return `${PDF_START}
              <button type="button" class="cn-action-btn cn-action-btn--ghost cn-pdf-export-btn" data-cn-pdf-export data-calculator-name="${toolName.replace(/"/g, "&quot;")}" aria-label="Export results to PDF">
                ${PDF_ICON}
                <span class="cn-pdf-export-btn__label">Export PDF</span>
              </button>
${PDF_END}`;
}

function buildToolbar(tool, csvAttrs = "") {
  const csvBtn = `<button type="button" class="cn-action-btn cn-action-btn--ghost" data-cn-download-csv${csvAttrs}>Download CSV</button>`;
  return `${TOOLBAR_START}
      <div class="share-tools cn-portable-results-box cn-export-share-rail" data-cn-share>
        <h3>Export &amp; share</h3>
        <p class="muted cn-portable-results__lead">Download data or send a link that restores this calculation.</p>
        <div class="cn-export-share-toolbar">
          ${csvBtn}
          ${buildPdfButton(tool.name)}
          ${buildShareMenu(tool.name)}
        </div>
      </div>
${TOOLBAR_END}`;
}

const CSV_TABLE_ATTRS = {
  "interest-calculator":
    ' data-cn-csv-table=".amortization-card .schedule-table" data-cn-csv-filename="interest-growth.csv"',
  "retirement-calculator": "",
  "mortgage-calculator":
    ' data-cn-csv-table="#mortgageSchedulePanel .schedule-table" data-cn-csv-filename="mortgage-amortization.csv"',
  "car-loan-calculator":
    ' data-cn-csv-table="#carSchedulePanel .schedule-table" data-cn-csv-filename="car-loan-amortization.csv"',
  "rent-vs-buy-calculator":
    ' data-cn-csv-table=".cn-rvb-trajectory-table" data-cn-csv-filename="rent-vs-buy-timeline.csv"',
  "debt-payoff": "",
  "loan-comparison": "",
  "take-home-pay-calculator": "",
  "loan-calculator": ""
};

function stripLegacyExportShare(html) {
  let next = html;
  next = next.replace(TOOLBAR_RE, "");
  next = next.replace(
    /<div class="cn-calculator-share-wrap"[^>]*>[\s\S]*?<!-- CN_CALCULATOR_SHARE_END -->[\s\S]*?<\/div>\s*/gi,
    ""
  );
  next = next.replace(
    /<div class="cn-pdf-export-wrap"[^>]*>[\s\S]*?<!-- CN_PDF_EXPORT_END -->[\s\S]*?<\/div>\s*/gi,
    ""
  );
  next = next.replace(/<!-- CN_CALCULATOR_SHARE_START -->[\s\S]*?<!-- CN_CALCULATOR_SHARE_END -->\s*/gi, "");
  next = next.replace(/<!-- CN_PDF_EXPORT_START -->[\s\S]*?<!-- CN_PDF_EXPORT_END -->\s*/gi, "");
  return next;
}

function stripInlinePortableShare(inner) {
  return inner
    .replace(/<div class="share-tools cn-portable-results-box"[\s\S]*?<\/div>\s*(?=\s*(?:<\/aside>|$))/gi, "")
    .replace(TOOLBAR_RE, "");
}

function injectBeforeClose(html, openTagRe, closeTag, toolbar) {
  const openMatch = openTagRe.exec(html);
  if (!openMatch) return null;
  const start = openMatch.index;
  const openEnd = start + openMatch[0].length;
  const closeIdx = html.indexOf(closeTag, openEnd);
  if (closeIdx === -1) return null;

  const before = html.slice(0, openEnd);
  let inner = html.slice(openEnd, closeIdx);
  const after = html.slice(closeIdx);

  inner = stripInlinePortableShare(inner);
  return `${before}${inner}\n${toolbar}\n${after}`;
}

function placeToolbar(html, toolbar) {
  let next = stripLegacyExportShare(html);

  const outputAsideRe = /<aside\b[^>]*\boutput-card\b[^>]*>/i;
  const placedInAside = injectBeforeClose(next, outputAsideRe, "</aside>", toolbar);
  if (placedInAside) return placedInAside;

  const resultsArticleRe = /<article class="card">\s*<h2>[^<]*Results[^<]*<\/h2>/i;
  const placedInArticle = injectBeforeClose(next, resultsArticleRe, "</article>", toolbar);
  if (placedInArticle) return placedInArticle;

  const bodyEndIdx = next.indexOf("<!-- CN_CALCULATOR_BODY_END -->");
  if (bodyEndIdx !== -1) {
    const insertAt = bodyEndIdx + "<!-- CN_CALCULATOR_BODY_END -->".length;
    return `${next.slice(0, insertAt)}\n${toolbar}\n${next.slice(insertAt)}`;
  }

  const relatedIdx = next.indexOf('<section class="card" data-related-tools');
  if (relatedIdx !== -1) {
    return `${next.slice(0, relatedIdx)}\n${toolbar}\n${next.slice(relatedIdx)}`;
  }

  const mainClose = next.lastIndexOf("</main>");
  if (mainClose === -1) return next;
  return `${next.slice(0, mainClose)}\n${toolbar}\n${next.slice(mainClose)}`;
}

function patchLoanCalculator(html, tool) {
  let next = stripLegacyExportShare(html);
  next = next.replace(/<div class="share-tools cn-portable-results-box"[\s\S]*?<\/div>\s*(?=\s*<p id="copyFeedback")/i, "");
  next = next.replace(/<button id="downloadCsv"([^>]*)>/i, '<button id="downloadCsv"$1>');
  return placeToolbar(next, buildToolbar(tool, CSV_TABLE_ATTRS["loan-calculator"] || ""));
}

let updated = 0;
for (const tool of tools) {
  const rel = tool.path.replace(/^\//, "").replace(/\/$/, "");
  const filePath = path.join(ROOT, rel, "index.html");
  if (!fs.existsSync(filePath)) continue;

  const before = fs.readFileSync(filePath, "utf8");
  const toolbar = buildToolbar(tool, CSV_TABLE_ATTRS[tool.slug] || "");
  let html =
    tool.slug === "loan-calculator"
      ? patchLoanCalculator(before, tool)
      : placeToolbar(before, toolbar);

  if (tool.slug === "take-home-pay-calculator") {
    html = html.replace(
      /(<button type="button" class="cn-action-btn cn-action-btn--ghost")( data-cn-download-csv)/i,
      '$1 id="thp-download-csv"$2'
    );
  }

  if (html !== before) {
    fs.writeFileSync(filePath, html, "utf8");
    updated += 1;
  }
}

console.log(`sync-export-share-toolbar: updated ${updated} calculator pages`);
