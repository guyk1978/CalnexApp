/**
 * Inject premium tool badges into calculator page titles.
 * Rebuilds the full page-title section each run (never appends duplicate blocks).
 * Run: node scripts/sync-calculator-headers.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  getToolTheme,
  renderToolBadge,
  TOOL_PAGE_TITLE_SECTION_CLASS,
  TOOL_PAGE_TITLE_HEAD_CLASS
} from "./tool-themes.cjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tools = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "tools.json"), "utf8"));

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

function buildPageTitleHead(tool) {
  const theme = getToolTheme(tool.slug);
  return `<div class="${TOOL_PAGE_TITLE_HEAD_CLASS}">
          ${renderToolBadge(tool.slug)}
          <div class="cn-tool-page-title__copy">
            <span class="cn-blog-category-pill cn-blog-category-pill--${theme.accent}">${escapeHtml(theme.groupLabel)}</span>
            <h1>${escapeHtml(tool.name)}</h1>
          </div>
        </div>`;
}

function patchFile(filePath, tool) {
  let html = fs.readFileSync(filePath, "utf8");
  const head = buildPageTitleHead(tool);

  const sectionRe = /<section class="page-title cn-tool-page-title[^"]*">[\s\S]*?<\/section>/i;
  const match = sectionRe.exec(html);
  if (!match) {
    console.warn(`sync-calculator-headers: skip ${filePath} — title section not found`);
    return false;
  }

  const mutedRe = /<p class="muted">[\s\S]*?<\/p>/i;
  const mutedMatch = match[0].match(mutedRe);
  const description = mutedMatch ? mutedMatch[0] : "";

  const newSection = `<section class="${TOOL_PAGE_TITLE_SECTION_CLASS}">
        ${head}
        ${description}
      </section>`;

  html = html.replace(sectionRe, newSection);
  fs.writeFileSync(filePath, html, "utf8");
  return true;
}

let updated = 0;
for (const tool of tools) {
  const rel = tool.path.replace(/^\//, "").replace(/\/$/, "");
  const filePath = path.join(ROOT, rel, "index.html");
  if (!fs.existsSync(filePath)) {
    console.warn(`sync-calculator-headers: missing ${filePath}`);
    continue;
  }
  if (patchFile(filePath, tool)) updated += 1;
}

console.log(`sync-calculator-headers: updated ${updated} calculator pages`);
