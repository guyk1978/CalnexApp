/**
 * Sync calculator context CTA widgets (text + primary button below inputs).
 * Run: node scripts/sync-calculator-context-ctas.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const {
  renderToolContextCta,
  renderToolContextCtaForSlug,
  getToolContextCtaPreset
} = require("./tool-themes.cjs");
const { injectMarkerBlock } = require("./html-inject-utils.cjs");

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tools = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "tools.json"), "utf8"));

const LEGACY_SINGLE_BTN_RE =
  /<section class="card">\s*<h2>([^<]*)<\/h2>\s*<p class="muted">\s*([\s\S]*?)<\/p>\s*<a class="btn btn-primary" href="([^"]+)">([^<]*)<\/a>\s*<\/section>/gi;

const LEGACY_HERO_ACTIONS_RE =
  /<section class="card">\s*<h2>Plan this loan your way<\/h2>\s*<p class="muted">\s*[\s\S]*?<\/p>\s*<div class="hero-actions">[\s\S]*?<\/div>\s*<\/section>/gi;

const LEGACY_TRY_SCENARIO_RE =
  /<section class="card">\s*<h2>Try this scenario in the calculator<\/h2>\s*<a class="btn btn-primary" href="[^"]+">[^<]*<\/a>\s*<\/section>/gi;

function replaceOrInject(html, block) {
  if (html.includes("<!-- CN_TOOL_CONTEXT_CTA_START -->")) {
    return injectMarkerBlock(
      html,
      "<!-- CN_TOOL_CONTEXT_CTA_START -->",
      "<!-- CN_TOOL_CONTEXT_CTA_END -->",
      block
    );
  }
  return null;
}

function upgradeLegacySections(html, slug) {
  let next = html;
  let changed = false;

  const preset = getToolContextCtaPreset(slug);
  if (preset) {
    const block = renderToolContextCta(preset);
    const replaced = replaceOrInject(next, block);
    if (replaced) {
      return { html: replaced, changed: true };
    }

    const legacy = new RegExp(
      `<section class="card">\\s*<h2>${preset.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}<\\/h2>[\\s\\S]*?<\\/section>`,
      "i"
    );
    if (legacy.test(next)) {
      next = next.replace(legacy, block);
      changed = true;
    }
  }

  const planPreset = getToolContextCtaPreset("loan-scenario-plan");
  if (planPreset && LEGACY_HERO_ACTIONS_RE.test(next)) {
    LEGACY_HERO_ACTIONS_RE.lastIndex = 0;
    next = next.replace(LEGACY_HERO_ACTIONS_RE, renderToolContextCta(planPreset));
    changed = true;
  }

  const tryPreset = getToolContextCtaPreset("loan-scenario-try");
  if (tryPreset && LEGACY_TRY_SCENARIO_RE.test(next)) {
    LEGACY_TRY_SCENARIO_RE.lastIndex = 0;
    next = next.replace(LEGACY_TRY_SCENARIO_RE, renderToolContextCta(tryPreset));
    changed = true;
  }

  if (!changed && !next.includes("cn-tool-context-cta")) {
    LEGACY_SINGLE_BTN_RE.lastIndex = 0;
    const upgraded = next.replace(LEGACY_SINGLE_BTN_RE, (_match, title, body, href, label) => {
      changed = true;
      return renderToolContextCta({
        title: title.trim(),
        body: body.replace(/\s+/g, " ").trim(),
        href,
        label: label.trim()
      });
    });
    if (changed) next = upgraded;
  }

  return { html: next, changed };
}

function patchFile(filePath, slug, { isLoanScenarioPage = false } = {}) {
  let html = fs.readFileSync(filePath, "utf8");

  if (!isLoanScenarioPage) {
    const block = renderToolContextCtaForSlug(slug);
    if (block) {
      const injected = replaceOrInject(html, block);
      if (injected) {
        fs.writeFileSync(filePath, injected, "utf8");
        return true;
      }
    }
  }

  const { html: next, changed } = upgradeLegacySections(html, isLoanScenarioPage ? null : slug);
  if (changed) {
    fs.writeFileSync(filePath, next, "utf8");
    return true;
  }
  return false;
}

function collectCalculatorPages() {
  const paths = [];
  for (const tool of tools) {
    const rel = tool.path.replace(/^\//, "").replace(/\/$/, "");
    paths.push({ filePath: path.join(ROOT, rel, "index.html"), slug: tool.slug, isLoanScenarioPage: false });
    if (tool.slug === "loan-calculator") {
      const dir = path.join(ROOT, rel);
      for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
        if (!name.isDirectory()) continue;
        paths.push({
          filePath: path.join(dir, name.name, "index.html"),
          slug: tool.slug,
          isLoanScenarioPage: true
        });
      }
    }
  }
  return paths;
}

let updated = 0;
for (const { filePath, slug, isLoanScenarioPage } of collectCalculatorPages()) {
  if (!fs.existsSync(filePath)) continue;
  if (patchFile(filePath, slug, { isLoanScenarioPage })) updated += 1;
}

console.log(`sync-calculator-context-ctas: updated ${updated} pages`);
