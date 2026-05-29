/**
 * Normalize <main> layout padding and hero intro spacing across all index.html pages.
 * Run: node scripts/sync-main-layout.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { CN_MAIN_LAYOUT_CLASS, CN_PAGE_HERO_CLASS, TOOL_PAGE_TITLE_SECTION_CLASS } =
  require("./tool-themes.cjs");

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  "assets",
  "data",
  "drafts",
  ".next",
  "dist",
  "coverage"
]);

function walkHtmlFiles(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.isDirectory()) {
      if (SKIP_DIRS.has(ent.name)) continue;
      walkHtmlFiles(path.join(dir, ent.name), out);
    } else if (ent.name === "index.html") {
      out.push(path.join(dir, ent.name));
    }
  }
  return out;
}

function patchMainTag(html) {
  const extras = [];
  const mainRe = /<main(\s+class="([^"]*)")?\s*>/i;
  const match = mainRe.exec(html);
  if (!match) return html;

  if (match[2]) {
    for (const token of match[2].split(/\s+/)) {
      if (!token) continue;
      if (token === "container" || token === "cn-main-layout" || token === "section-space") continue;
      if (/^pt-|^pb-|^px-|^sm:pt-|^md:pt-|^sm:px-|^max-w-|^mx-auto$/.test(token)) continue;
      if (CN_MAIN_LAYOUT_CLASS.split(/\s+/).includes(token)) continue;
      extras.push(token);
    }
  }

  const mainClass = [CN_MAIN_LAYOUT_CLASS, ...extras].join(" ");
  return html.replace(mainRe, `<main class="${mainClass}">`);
}

function patchHeroSections(html) {
  let next = html;

  next = next.replace(
    /<section class="page-title cn-tool-page-title[^"]*">/gi,
    `<section class="${TOOL_PAGE_TITLE_SECTION_CLASS}">`
  );

  next = next.replace(
    /<section class="page-title cn-tools-hub-intro[^"]*">/gi,
    `<section class="page-title cn-tools-hub-intro ${CN_PAGE_HERO_CLASS}">`
  );

  next = next.replace(
    /<section class="page-title cn-article-page-title[^"]*">/gi,
    `<section class="page-title cn-article-page-title ${CN_PAGE_HERO_CLASS}">`
  );

  next = next.replace(
    /<section class="page-title(?![^"]*cn-page-hero)([^"]*)">\s*<p class="eyebrow">Loan guide<\/p>/gi,
    `<section class="page-title${"$1"} ${CN_PAGE_HERO_CLASS}">\n      <p class="eyebrow">Loan guide</p>`
  );

  return next;
}

/** Normalize legacy heavy top spacing from earlier layout pass. */
function patchLegacySpacing(html) {
  return html
    .replace(/\bpt-8 sm:pt-12 md:pt-14\b/g, "pt-10 sm:pt-14")
    .replace(/\bpt-12 sm:pt-16 md:pt-24\b/g, "pt-10 sm:pt-14")
    .replace(/\bpt-24\b/g, "pt-14")
    .replace(/\bpt-32\b/g, "pt-14")
    .replace(/cn-page-hero mt-4 sm:mt-6 mb-8/g, "cn-page-hero")
    .replace(/cn-page-hero mt-8 mb-12/g, "cn-page-hero")
    .replace(/cn-tools-hub-intro cn-page-hero mt-4 sm:mt-6 mb-8/g, "cn-tools-hub-intro cn-page-hero")
    .replace(/cn-tools-hub-intro cn-page-hero mt-8 mb-12/g, "cn-tools-hub-intro cn-page-hero")
    .replace(/hover:-translate-y-1 transition-all group text-center/g, "transition-shadow group text-center")
    .replace(/my-10 max-w-7xl mx-auto px-4/g, "mt-6 sm:mt-8 w-full")
    .replace(/cn-quick-actions__grid grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mt-2 w-full/g, "cn-quick-actions__grid grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mt-6 sm:mt-8 w-full");
}

let updated = 0;
for (const file of walkHtmlFiles(ROOT)) {
  const before = fs.readFileSync(file, "utf8");
  let html = patchMainTag(before);
  html = patchHeroSections(html);
  html = patchLegacySpacing(html);
  if (html !== before) {
    fs.writeFileSync(file, html, "utf8");
    updated += 1;
  }
}

console.log(`sync-main-layout: updated ${updated} pages`);
