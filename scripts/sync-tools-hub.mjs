/**
 * Inject category-grouped tools dashboard into tools/index.html.
 * Replaces the entire CN_TOOLS_HUB_GRID marker block on every run (never appends).
 * Run: node scripts/sync-tools-hub.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { renderToolsCatalogDashboard } = require("./tool-themes.cjs");
const { injectMarkerBlock } = require("./html-inject-utils.cjs");

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TOOLS_INDEX = path.join(ROOT, "tools", "index.html");
const REGISTRY_PATH = path.join(ROOT, "data", "seo-registry.json");

const HUB_START = "<!-- CN_TOOLS_HUB_GRID_START -->";
const HUB_END = "<!-- CN_TOOLS_HUB_GRID_END -->";

const tools = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "tools.json"), "utf8"));

function loadScenarioItems(limit = 12) {
  if (!fs.existsSync(REGISTRY_PATH)) return [];
  const registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, "utf8"));
  return registry
    .filter((entry) => entry.type === "seo" && String(entry.url || "").includes("/tools/loan-calculator/"))
    .slice(0, limit)
    .map((entry) => ({
      name: entry.title,
      title: entry.title,
      path: entry.url,
      url: entry.url,
      slug: "loan-calculator",
      navGroup: "lending"
    }));
}

const scenarios = loadScenarioItems(12);

const hubBlock = `${HUB_START}
${renderToolsCatalogDashboard(tools, { heading: "All calculators", includeScenarios: scenarios })}
${HUB_END}`;

let html = fs.readFileSync(TOOLS_INDEX, "utf8");

const updated = injectMarkerBlock(html, HUB_START, HUB_END, hubBlock);
if (!updated) {
  console.error("sync-tools-hub: missing CN_TOOLS_HUB_GRID markers in tools/index.html");
  process.exit(1);
}

html = updated;

const legacyStart = "<!-- ILB_TOOLS_LATEST_START -->";
const legacyEnd = "<!-- ILB_TOOLS_LATEST_END -->";
if (html.includes(legacyStart)) {
  html = injectMarkerBlock(html, legacyStart, legacyEnd, `${legacyStart}\n${legacyEnd}`) || html;
}

const scenariosStart = "<!-- CN_TOOLS_SCENARIOS_START -->";
const scenariosEnd = "<!-- CN_TOOLS_SCENARIOS_END -->";
if (html.includes(scenariosStart)) {
  html = injectMarkerBlock(html, scenariosStart, scenariosEnd, `${scenariosStart}\n${scenariosEnd}`) || html;
}

fs.writeFileSync(TOOLS_INDEX, html, "utf8");
console.log(
  `sync-tools-hub: wrote category dashboard (${tools.length} tools, ${scenarios.length} scenarios) to tools/index.html`
);
