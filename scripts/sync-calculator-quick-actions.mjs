/**
 * Inject fintech-style quick-action widget grids on calculator pages.
 * Wraps title + quick actions in a flex column stack (normal document flow).
 * Run: node scripts/sync-calculator-quick-actions.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const {
  renderToolQuickActions,
  renderToolConnectedSuite,
  CALCULATOR_HERO_STACK_CLASS,
  TOOL_PAGE_TITLE_SECTION_CLASS
} = require("./tool-themes.cjs");
const { injectMarkerBlock } = require("./html-inject-utils.cjs");

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tools = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "tools.json"), "utf8"));

const LEGACY_PRIMARY_RE =
  /<section class="card">\s*<h2>(?:More tools|Cross-Tool Navigation|Related tools|Connected Planning Tools)<\/h2>\s*<div class="share-actions">[\s\S]*?<\/div>\s*<\/section>/gi;

const LEGACY_CONNECTED_RE =
  /<section class="card">\s*<h2>Connected Planning Suite<\/h2>\s*<div class="share-actions">[\s\S]*?<\/div>\s*<\/section>/gi;

const TITLE_SECTION_RE =
  /<section class="page-title cn-tool-page-title[^"]*">[\s\S]*?<\/section>/i;

const QUICK_ACTIONS_RE =
  /<!-- CN_QUICK_ACTIONS_START -->[\s\S]*?<!-- CN_QUICK_ACTIONS_END -->/i;

const FEATURE_PANEL_RE =
  /<section class="card cn-feature-panel[^"]*"[\s\S]*?<\/section>\s*/i;

function replaceOrInject(html, start, end, block) {
  if (html.includes(start) && html.includes(end)) {
    const next = injectMarkerBlock(html, start, end, block);
    return next ?? html;
  }
  return null;
}

/** Pull feature panel out from between title and quick actions (loan calculator). */
function extractFeaturePanelBetween(titleEnd, quickStart, html) {
  const between = html.slice(titleEnd, quickStart);
  const match = FEATURE_PANEL_RE.exec(between);
  if (!match) return { html: between, feature: "" };
  return {
    html: between.replace(FEATURE_PANEL_RE, ""),
    feature: match[0]
  };
}

function wrapCalculatorHeroStack(html) {
  if (!TITLE_SECTION_RE.test(html) || !QUICK_ACTIONS_RE.test(html)) {
    return html;
  }

  if (html.includes("<!-- CN_CALCULATOR_HERO_STACK_START -->")) {
    return html.replace(
      /class="cn-calculator-hero-stack[^"]*"/g,
      `class="${CALCULATOR_HERO_STACK_CLASS}"`
    );
  }

  const titleMatch = TITLE_SECTION_RE.exec(html);
  const quickMatch = QUICK_ACTIONS_RE.exec(html);
  if (!titleMatch || !quickMatch) return html;

  const titleEnd = titleMatch.index + titleMatch[0].length;
  const { feature } = extractFeaturePanelBetween(titleEnd, quickMatch.index, html);

  let titleSection = titleMatch[0];
  titleSection = titleSection.replace(
    /<section class="page-title cn-tool-page-title[^"]*">/i,
    `<section class="${TOOL_PAGE_TITLE_SECTION_CLASS}">`
  );

  const stackBlock = `      <!-- CN_CALCULATOR_HERO_STACK_START -->
      <div class="${CALCULATOR_HERO_STACK_CLASS}">
${titleSection}
${quickMatch[0]}
      </div>
      <!-- CN_CALCULATOR_HERO_STACK_END -->`;

  const before = html.slice(0, titleMatch.index);
  const after = html.slice(quickMatch.index + quickMatch[0].length);

  return `${before}${stackBlock}${feature}${after}`;
}

function patchFile(filePath, slug) {
  let html = fs.readFileSync(filePath, "utf8");
  const primary = renderToolQuickActions(slug);
  const connected = renderToolConnectedSuite(slug);

  let changed = false;

  const primaryReplaced = replaceOrInject(
    html,
    "<!-- CN_QUICK_ACTIONS_START -->",
    "<!-- CN_QUICK_ACTIONS_END -->",
    primary
  );
  if (primaryReplaced) {
    html = primaryReplaced;
    changed = true;
  } else if (primary && LEGACY_PRIMARY_RE.exec(html)) {
    LEGACY_PRIMARY_RE.lastIndex = 0;
    html = html.replace(LEGACY_PRIMARY_RE, primary);
    changed = true;
  }

  if (connected) {
    const connectedReplaced = replaceOrInject(
      html,
      "<!-- CN_CONNECTED_SUITE_START -->",
      "<!-- CN_CONNECTED_SUITE_END -->",
      connected
    );
    if (connectedReplaced) {
      html = connectedReplaced;
      changed = true;
    } else if (LEGACY_CONNECTED_RE.exec(html)) {
      LEGACY_CONNECTED_RE.lastIndex = 0;
      html = html.replace(LEGACY_CONNECTED_RE, connected);
      changed = true;
    }
  }

  const wrapped = wrapCalculatorHeroStack(html);
  if (wrapped !== html) {
    html = wrapped;
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(filePath, html, "utf8");
  }
  return changed;
}

let updated = 0;
for (const tool of tools) {
  const rel = tool.path.replace(/^\//, "").replace(/\/$/, "");
  const filePath = path.join(ROOT, rel, "index.html");
  if (!fs.existsSync(filePath)) {
    console.warn(`sync-calculator-quick-actions: missing ${filePath}`);
    continue;
  }
  if (patchFile(filePath, tool.slug)) updated += 1;
}

console.log(`sync-calculator-quick-actions: updated ${updated} calculator pages`);
