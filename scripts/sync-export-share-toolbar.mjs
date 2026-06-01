/**
 * Unified Export & share toolbar (CSV + PDF + Share dropdown) on calculator pages.
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

const TOOLBAR_START = "<!-- CN_EXPORT_SHARE_TOOLBAR_START -->";
const TOOLBAR_END = "<!-- CN_EXPORT_SHARE_TOOLBAR_END -->";
const PDF_START = "<!-- CN_PDF_EXPORT_START -->";
const PDF_END = "<!-- CN_PDF_EXPORT_END -->";
const SHARE_START = "<!-- CN_CALCULATOR_SHARE_START -->";
const SHARE_END = "<!-- CN_CALCULATOR_SHARE_END -->";
const BODY_END = "<!-- CN_CALCULATOR_BODY_END -->";

const SHARE_ICON =
  '<svg class="cn-theme-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>';

const PDF_ICON = `<svg class="cn-pdf-export-btn__icon cn-theme-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`;

function slugId(toolName) {
  return toolName.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
}

function buildShareMenu(toolName) {
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

function buildPdfButton(toolName) {
  return `${PDF_START}
              <button type="button" class="btn btn-ghost cn-pdf-export-btn" data-cn-pdf-export data-calculator-name="${toolName.replace(/"/g, "&quot;")}" aria-label="Export results to PDF">
                ${PDF_ICON}
                <span class="cn-pdf-export-btn__label">Export PDF</span>
              </button>
${PDF_END}`;
}

function buildToolbar(tool, csvAttrs = "") {
  const csvBtn = `<button type="button" class="btn btn-ghost" data-cn-download-csv${csvAttrs}>Download CSV</button>`;
  return `${TOOLBAR_START}
      <div class="share-tools cn-portable-results-box" data-cn-share>
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

function patchLoanCalculator(html) {
  if (!html.includes("cn-export-share-toolbar")) return html;
  html = html.replace(
    /<button id="downloadCsv"([^>]*)>/i,
    '<button id="downloadCsv" data-cn-download-csv$1>'
  );
  if (!html.includes("data-cn-share")) {
    html = html.replace(
      /(<div class="share-tools cn-portable-results-box")/i,
      '$1 data-cn-share'
    );
  }
  return html;
}

function insertToolbar(html, tool) {
  if (html.includes(TOOLBAR_START)) {
    return injectMarkerBlock(
      html,
      TOOLBAR_START,
      TOOLBAR_END,
      buildToolbar(tool, CSV_TABLE_ATTRS[tool.slug] || "").trim(),
      { scopeBefore: "</main>" }
    );
  }

  const toolbar = buildToolbar(tool, CSV_TABLE_ATTRS[tool.slug] || "");
  const bodyEndIdx = html.indexOf(BODY_END);
  if (bodyEndIdx !== -1) {
    const insertAt = bodyEndIdx + BODY_END.length;
    const relatedIdx = html.indexOf('<section class="card" data-related-tools', insertAt);
    const before = html.slice(0, insertAt);
    const middle =
      relatedIdx !== -1
        ? stripLegacyExportShare(html.slice(insertAt, relatedIdx))
        : stripLegacyExportShare(html.slice(insertAt, html.indexOf("</main>", insertAt)));
    const after =
      relatedIdx !== -1 ? html.slice(relatedIdx) : html.slice(html.indexOf("</main>", insertAt));
    return `${before}\n${toolbar}\n${middle}${after}`;
  }

  const relatedIdx = html.indexOf('<section class="card" data-related-tools');
  if (relatedIdx === -1) {
    const mainClose = html.indexOf("</main>");
    if (mainClose === -1) return html;
    const stripped = stripLegacyExportShare(html.slice(0, mainClose));
    return `${stripped}\n${toolbar}\n${html.slice(mainClose)}`;
  }

  const before = stripLegacyExportShare(html.slice(0, relatedIdx));
  return `${before}\n${toolbar}\n${html.slice(relatedIdx)}`;
}

let updated = 0;
for (const tool of tools) {
  const rel = tool.path.replace(/^\//, "").replace(/\/$/, "");
  const filePath = path.join(ROOT, rel, "index.html");
  if (!fs.existsSync(filePath)) continue;

  let html = fs.readFileSync(filePath, "utf8");
  const before = html;

  if (tool.slug === "loan-calculator") {
    html = patchLoanCalculator(html);
  } else if (tool.slug === "take-home-pay-calculator") {
    if (!html.includes("cn-export-share-toolbar") && html.includes("thp-download-csv")) {
      html = html.replace(
        /<button type="button" class="btn btn-ghost" id="thp-download-csv">/,
        '<button type="button" class="btn btn-ghost" id="thp-download-csv" data-cn-download-csv>'
      );
    }
  } else {
    html = insertToolbar(html, tool);
  }

  if (html !== before) {
    fs.writeFileSync(filePath, html, "utf8");
    updated += 1;
  }
}

console.log(`sync-export-share-toolbar: updated ${updated} calculator pages`);
