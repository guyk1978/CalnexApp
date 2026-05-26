/**
 * Inject static tool cards into tools/index.html from data/tools.json.
 * Run: node scripts/sync-tools-hub.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TOOLS_INDEX = path.join(ROOT, "tools", "index.html");
const START = "<!-- CN_TOOLS_HUB_GRID_START -->";
const END = "<!-- CN_TOOLS_HUB_GRID_END -->";

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const tools = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "tools.json"), "utf8"));

const cards = tools
  .map(
    (tool) => `          <article class="card tool-card cn-tool-card-link cn-card-interactive">
            <h2>${escapeHtml(tool.name)}</h2>
            <p class="muted">${escapeHtml(tool.hubDescription || tool.description)}</p>
            <a class="btn btn-primary" href="${escapeHtml(tool.path)}">Open</a>
          </article>`
  )
  .join("\n");

const block = `${START}
${cards}
        ${END}`;

let html = fs.readFileSync(TOOLS_INDEX, "utf8");
const startIdx = html.indexOf(START);
const endIdx = html.indexOf(END);

if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
  html = `${html.slice(0, startIdx)}${block}${html.slice(endIdx + END.length)}`;
} else {
  const gridRe =
    /(<div id="cn-tools-hub-grid" class="cn-tools-grid-static" aria-live="polite">)[\s\S]*?(<\/div>)/;
  if (!gridRe.test(html)) {
    console.error("sync-tools-hub: could not find cn-tools-hub-grid in tools/index.html");
    process.exit(1);
  }
  html = html.replace(
    gridRe,
    `$1\n        ${START}\n${cards}\n        ${END}\n      $2`
  );
}

fs.writeFileSync(TOOLS_INDEX, html, "utf8");
console.log(`sync-tools-hub: wrote ${tools.length} tool cards to tools/index.html`);
