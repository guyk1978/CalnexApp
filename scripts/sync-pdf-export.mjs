/**
 * Inject PDF export buttons and shared scripts on calculator tool pages.
 * Run: node scripts/sync-pdf-export.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { injectMarkerBlock } from "./html-inject-utils.cjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tools = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "tools.json"), "utf8"));

const PDF_SCRIPTS = `    <script src="/assets/js/pdf-export-helpers.js" defer></script>
    <script src="/assets/js/pdf-export.js" defer></script>
    <script src="/assets/js/pdf-export-init.js" defer></script>`;

const PDF_BTN_START = "<!-- CN_PDF_EXPORT_START -->";
const PDF_BTN_END = "<!-- CN_PDF_EXPORT_END -->";

const PDF_ICON = `<svg class="cn-pdf-export-btn__icon cn-theme-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`;

function buildPdfButton(calculatorName, variant = "ghost") {
  const btnClass = variant === "primary" ? "btn btn-primary" : "btn btn-ghost";
  return `${PDF_BTN_START}
              <button type="button" class="${btnClass} cn-pdf-export-btn" data-cn-pdf-export data-calculator-name="${calculatorName.replace(/"/g, "&quot;")}" aria-label="Export results to PDF">
                ${PDF_ICON}
                <span class="cn-pdf-export-btn__label">Export PDF</span>
              </button>
${PDF_BTN_END}`;
}

const PLACEMENTS = {
  "loan-calculator": {
    mode: "share-actions-replace",
    variant: "ghost"
  },
  "mortgage-calculator": {
    anchor: /<\/dl>\s*<div class="comparison-grid">/i,
    insertBefore: true,
    variant: "ghost"
  },
  "car-loan-calculator": {
    anchor: /<\/dl>\s*<\/aside>/i,
    insertBefore: true,
    variant: "ghost"
  },
  "debt-payoff": {
    anchor: /<h2>Payoff plan<\/h2>/i,
    insertAfter: true,
    variant: "ghost"
  },
  "loan-comparison": {
    anchor: /<h2>Comparison results<\/h2>/i,
    insertAfter: true,
    variant: "ghost"
  },
  "rent-vs-buy-calculator": {
    anchor: /<h2>Results<\/h2>/i,
    insertAfter: true,
    variant: "ghost"
  },
  "interest-calculator": {
    anchor: /<!-- CN_CALCULATOR_HERO_STACK_END -->/i,
    insertAfter: true,
    variant: "ghost"
  },
  "retirement-calculator": {
    anchor: /<!-- CN_CALCULATOR_HERO_STACK_END -->/i,
    insertAfter: true,
    variant: "ghost"
  }
};

const JOINMYPDF_LINK_RE =
  /<a[^>]*href="https:\/\/joinmypdf\.com\/"[^>]*>[\s\S]*?<\/a>\s*/gi;

function ensurePdfScripts(html) {
  if (html.includes("/assets/js/pdf-export-init.js")) return html;
  const bodyClose = html.lastIndexOf("</body>");
  if (bodyClose === -1) return html;
  return `${html.slice(0, bodyClose)}\n${PDF_SCRIPTS}\n${html.slice(bodyClose)}`;
}

function ensureShareToast(html) {
  if (html.includes('id="shareToast"') || html.includes('id="cnPdfToast"')) return html;
  const bodyClose = html.lastIndexOf("</body>");
  if (bodyClose === -1) return html;
  const toast = `      <div id="cnPdfToast" class="share-toast" role="status" aria-live="polite"></div>\n`;
  return `${html.slice(0, bodyClose)}\n${toast}${html.slice(bodyClose)}`;
}

function removeJspdfScript(html) {
  return html.replace(
    /\s*<script src="https:\/\/cdn\.jsdelivr\.net\/npm\/jspdf[^"]*" defer><\/script>\s*/gi,
    "\n"
  );
}

function injectPdfButton(html, tool, placement) {
  const btn = buildPdfButton(tool.name, placement.variant || "ghost");
  const existing = injectMarkerBlock(html, PDF_BTN_START, PDF_BTN_END, btn.trim());
  if (existing) return existing;

  if (placement.mode === "share-actions-replace") {
    const portableRe = /(<div class="share-tools[^"]*"[^>]*>[\s\S]*?<div class="share-actions">)/i;
    let next = html;
    if (portableRe.test(html) && html.includes("joinmypdf.com")) {
      next = html.replace(
        /(<div class="share-tools[^"]*"[^>]*>[\s\S]*?<div class="share-actions">[\s\S]*?)<a[^>]*joinmypdf\.com[^>]*>[\s\S]*?<\/a>\s*/i,
        `$1${btn}\n              `
      );
    }
    if (!next.includes(PDF_BTN_START) && portableRe.test(next)) {
      next = next.replace(portableRe, `$1\n              ${btn}\n              `);
    }
    return next;
  }

  if (placement.anchor) {
    const match = placement.anchor.exec(html);
    if (!match) {
      console.warn(`sync-pdf-export: anchor not found for ${tool.slug}`);
      return html;
    }
    const idx = match.index + (placement.insertAfter ? match[0].length : 0);
    const wrap = `\n            <div class="cn-pdf-export-wrap" style="margin: 0.75rem 0 1rem; display: flex; flex-wrap: wrap; gap: 0.5rem">\n              ${btn}\n            </div>\n`;
    return `${html.slice(0, idx)}${wrap}${html.slice(idx)}`;
  }

  return html;
}

function patchFile(filePath, tool) {
  const placement = PLACEMENTS[tool.slug];
  if (!placement) {
    console.warn(`sync-pdf-export: no placement for ${tool.slug}`);
    return false;
  }

  let html = fs.readFileSync(filePath, "utf8");
  const before = html;

  html = injectPdfButton(html, tool, placement);
  html = ensurePdfScripts(html);
  html = ensureShareToast(html);
  if (tool.slug === "loan-calculator") {
    html = removeJspdfScript(html);
  }

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
    console.warn(`sync-pdf-export: missing ${filePath}`);
    continue;
  }
  if (patchFile(filePath, tool)) updated += 1;
}

console.log(`sync-pdf-export: updated ${updated} calculator pages`);
