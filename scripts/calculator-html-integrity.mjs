/**
 * Sanitize static calculator HTML: no scripts after </html>, single utility script block, toasts before scripts.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { PDF_SCRIPT_PATHS, CALCULATOR_UTILITY_SCRIPT_PATHS } = require("./calculator-asset-manifest.cjs");

const ALL_UTILITY_SCRIPTS = [...PDF_SCRIPT_PATHS, ...CALCULATOR_UTILITY_SCRIPT_PATHS];

const TOAST_BLOCK = `<div id="cnPdfToast" class="share-toast" role="status" aria-live="polite"></div>
<div id="cnShareToast" class="share-toast" role="status" aria-live="polite"></div>`;

function escapeRegExp(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function truncateAfterHtml(html) {
  const idx = html.search(/<\/html>/i);
  if (idx === -1) return html;
  return html.slice(0, idx + 7);
}

export function stripUtilityScripts(html) {
  let next = html;
  for (const src of ALL_UTILITY_SCRIPTS) {
    const re = new RegExp(
      `\\s*<script src="${escapeRegExp(src)}" defer><\\/script>\\s*`,
      "gi"
    );
    next = next.replace(re, "\n");
  }
  return next;
}

export function stripShareToasts(html) {
  return html
    .replace(/\s*<div id="cnPdfToast"[^>]*><\/div>\s*/gi, "\n")
    .replace(/\s*<div id="cnShareToast"[^>]*><\/div>\s*/gi, "\n")
    .replace(/\s*<div id="shareToast"[^>]*><\/div>\s*/gi, "\n");
}

export function sanitizeCalculatorHtml(html) {
  let next = truncateAfterHtml(html);
  next = stripShareToasts(next);
  next = stripUtilityScripts(next);

  const bodyClose = next.lastIndexOf("</body>");
  if (bodyClose === -1) return next;

  const beforeBody = next.slice(0, bodyClose);
  const afterBody = next.slice(bodyClose);
  const block = ALL_UTILITY_SCRIPTS.map((src) => `    <script src="${src}" defer></script>`).join("\n");

  return `${beforeBody}\n\n${TOAST_BLOCK}\n\n${block}\n${afterBody}`;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const tools = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "tools.json"), "utf8"));
  let updated = 0;
  for (const tool of tools) {
    const filePath = path.join(ROOT, tool.path.replace(/^\//, "").replace(/\/$/, ""), "index.html");
    if (!fs.existsSync(filePath)) continue;
    const before = fs.readFileSync(filePath, "utf8");
    const after = sanitizeCalculatorHtml(before);
    if (after !== before) {
      fs.writeFileSync(filePath, after, "utf8");
      updated += 1;
      console.log("sanitized:", path.relative(ROOT, filePath));
    }
  }
  console.log(`calculator-html-integrity: updated ${updated} pages`);
}
