/**
 * Enforce left-sidebar calculator layout across all tool pages.
 * Run: node scripts/patch-calculator-sidebar-layout.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { applyDashboardLayout } = require("./calculator-sidebar-core.cjs");

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TOOLS_DIR = path.join(ROOT, "tools");

const SIDEBAR_RE =
  /<(form|aside)\b[^>]*\bcn-calc-global-sidebar\b[^>]*>[\s\S]*?<\/\1>/i;
const WORKSPACE_RE =
  /<div class="cn-calc-page-main([^"]*)">([\s\S]*?)<\/div>\s*(?=<\/div>\s*<\/main>)/i;

function walkToolPages(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name.startsWith(".")) continue;
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walkToolPages(full, out);
    else if (ent.name === "index.html") out.push(full);
  }
  return out;
}

function addBodyClass(html, className) {
  return html.replace(/<body([^>]*)>/i, (match, attrs) => {
    if (new RegExp(`\\b${className}\\b`).test(attrs)) return match;
    if (/class=/.test(attrs)) {
      return `<body${attrs.replace(/class=(["'])([^"']*)\1/, `class=$1$2 ${className}$1`)}>`;
    }
    return `<body${attrs} class="${className}">`;
  });
}

function ensureSidebarBeforeWorkspace(html) {
  const bodyMatch = html.match(
    /<div class="cn-calc-page-body[^"]*">([\s\S]*?)<\/div>\s*<\/main>/i
  );
  if (!bodyMatch) return { html, changed: false };

  const inner = bodyMatch[1];
  const sidebarMatch = inner.match(SIDEBAR_RE);
  const workspaceMatch = inner.match(
    /<div class="cn-calc-page-main[^"]*">[\s\S]*?<\/div>/i
  );
  if (!sidebarMatch || !workspaceMatch) return { html, changed: false };

  const sidebarIdx = inner.indexOf(sidebarMatch[0]);
  const workspaceIdx = inner.indexOf(workspaceMatch[0]);
  if (sidebarIdx < workspaceIdx) return { html, changed: false };

  const before = inner.slice(0, workspaceIdx).trim();
  const workspace = workspaceMatch[0];
  const between = inner.slice(workspaceIdx + workspace.length, sidebarIdx).trim();
  const sidebar = sidebarMatch[0];
  const after = inner.slice(sidebarIdx + sidebar.length).trim();

  const reordered = [workspace, between, sidebar, after].filter(Boolean).join("\n        ");
  const next = html.replace(bodyMatch[1], `\n        ${reordered}\n      `);
  return { html: next, changed: true };
}

function removeNestedDuplicateInputs(html) {
  const pageSidebar = html.match(
    /<div class="cn-calc-page-body[^"]*">[\s\S]*?<(form|aside)\b[^>]*\bcn-calc-global-sidebar\b/i
  );
  if (!pageSidebar) return { html, changed: false };

  let next = html;
  let changed = false;

  const nestedPatterns = [
    /<form\b[^>]*\bcn-loan-compare-layout__inputs\b[^>]*>[\s\S]*?<\/form>\s*/gi,
    /<form\b[^>]*\bcn-debt-payoff-layout__inputs\b[^>]*>[\s\S]*?<\/form>\s*/gi,
  ];

  for (const pattern of nestedPatterns) {
    const matches = [...next.matchAll(pattern)];
    for (const match of matches) {
      const idx = match.index ?? -1;
      if (idx < 0) continue;
      const before = next.slice(0, idx);
      if (!before.includes("cn-calc-page-body")) continue;
      if (before.lastIndexOf("cn-calc-workspace") < before.lastIndexOf("cn-calc-page-body")) continue;
      next = next.replace(match[0], "");
      changed = true;
    }
  }

  return { html: next, changed };
}

function ensureWorkspaceClass(html) {
  if (!html.includes("cn-calc-page-main")) return { html, changed: false };
  const next = html.replace(
    /<div class="cn-calc-page-main(?![^"]*cn-calc-workspace)([^"]*)">/gi,
    '<div class="cn-calc-page-main cn-calc-workspace$1">'
  );
  return { html: next, changed: next !== html };
}

function patchToolPage(filePath) {
  const rel = path.relative(TOOLS_DIR, filePath).replace(/\\/g, "/");
  if (rel === "index.html" || rel === "latest/index.html") return false;

  let html = fs.readFileSync(filePath, "utf8");
  let changed = false;

  const isCalculator =
    html.includes("calculator-layout") ||
    html.includes("cn-debt-payoff-layout") ||
    html.includes("cn-loan-compare-layout") ||
    html.includes("cn-calc-global-sidebar");

  if (!isCalculator) return false;

  if (!html.includes("cn-calculator-page")) {
    html = addBodyClass(html, "cn-calculator-page");
    changed = true;
  }
  if (!html.includes("cn-site-chrome")) {
    html = addBodyClass(html, "cn-site-chrome");
    changed = true;
  }

  const dashboard = applyDashboardLayout(html);
  if (dashboard.changed) {
    html = dashboard.html;
    changed = true;
  }

  const order = ensureSidebarBeforeWorkspace(html);
  if (order.changed) {
    html = order.html;
    changed = true;
  }

  const dedupe = removeNestedDuplicateInputs(html);
  if (dedupe.changed) {
    html = dedupe.html;
    changed = true;
  }

  const workspace = ensureWorkspaceClass(html);
  if (workspace.changed) {
    html = workspace.html;
    changed = true;
  }

  if (changed) fs.writeFileSync(filePath, html, "utf8");
  return changed;
}

let updated = 0;
for (const file of walkToolPages(TOOLS_DIR)) {
  if (patchToolPage(file)) updated += 1;
}

console.log(`patch-calculator-sidebar-layout: updated ${updated} tool pages`);
