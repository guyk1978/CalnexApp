/**
 * Patch calculator tool pages: linear workflow layout classes + consistent footer.
 * Run: node scripts/patch-calculator-workflow.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { applyDashboardLayout } = require("./calculator-sidebar-core.cjs");

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TOOLS_DIR = path.join(ROOT, "tools");

const STANDARD_FOOTER = `    <footer class="site-footer cn-site-footer">
      <div class="container footer-content">
        <p>&copy; <span id="year"></span> CalnexApp. All rights reserved.</p>
        <nav class="footer-links" aria-label="Footer">
          <a href="/about/">About</a>
          <a href="/contact/">Contact</a>
          <a href="/blog/">Blog</a>
          <a href="/tools/">Tools</a>
        </nav>
      </div>
    </footer>`;

function walkToolPages(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name.startsWith(".")) continue;
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      walkToolPages(full, out);
    } else if (ent.name === "index.html") {
      out.push(full);
    }
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

function addClassToAttr(html, classAttrValue, classToAdd) {
  if (classAttrValue.includes(classToAdd)) return html;
  const escaped = classAttrValue.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`class="${escaped}"`, "g");
  return html.replace(re, `class="${classAttrValue} ${classToAdd}"`);
}

function patchCalculatorPage(filePath) {
  const rel = path.relative(TOOLS_DIR, filePath).replace(/\\/g, "/");
  if (rel === "index.html" || rel === "latest/index.html") return false;

  let html = fs.readFileSync(filePath, "utf8");
  let changed = false;

  const isCalculator =
    html.includes("calculator-layout") ||
    html.includes("cn-debt-payoff-layout") ||
    html.includes("cn-loan-compare-layout");

  if (!html.includes("cn-calculator-page")) {
    html = addBodyClass(html, "cn-calculator-page");
    changed = true;
  }

  if (isCalculator) {
    if (html.includes('class="cn-tool-shell"') && !html.includes("cn-calc-workflow")) {
      html = html.replace(/class="cn-tool-shell"/g, 'class="cn-tool-shell cn-calc-workflow"');
      changed = true;
    }

    if (html.includes('class="calculator-layout cn-calculator-layout"') && !html.includes("cn-calculator-workflow")) {
      html = html.replace(
        /class="calculator-layout cn-calculator-layout/g,
        'class="calculator-layout cn-calculator-layout cn-calculator-workflow'
      );
      changed = true;
    } else if (html.includes('<section class="calculator-layout">') && !html.includes("cn-calculator-workflow")) {
      html = html.replace(
        /<section class="calculator-layout">/g,
        '<section class="calculator-layout cn-calculator-workflow">'
      );
      changed = true;
    } else if (
      html.match(/<section class="calculator-layout(?![^"]*cn-calculator-workflow)/) &&
      !html.includes("cn-calculator-workflow")
    ) {
      html = html.replace(
        /<section class="calculator-layout([^"]*)"/g,
        '<section class="calculator-layout$1 cn-calculator-workflow"'
      );
      changed = true;
    }

    const sidebarTargets = [
      "card input-card",
      "cn-debt-payoff-layout__inputs card input-card",
      "cn-loan-compare-layout__inputs card input-card",
    ];
    for (const cls of sidebarTargets) {
      if (html.includes(`class="${cls}"`)) {
        const next = addClassToAttr(html, cls, "cn-calc-sidebar");
        if (next !== html) {
          html = next;
          changed = true;
        }
      }
    }

    if (html.includes('class="card output-card"') && !html.includes("cn-calc-results")) {
      html = html.replace(/class="card output-card"/g, 'class="card output-card cn-calc-results"');
      changed = true;
    }

    if (html.includes("<article class=\"card\">") && html.includes("<h2>Inputs</h2>")) {
      html = html.replace(
        /<article class="card">\s*<h2>Inputs<\/h2>/g,
        '<article class="card cn-calc-sidebar">\n          <h2>Inputs</h2>'
      );
      changed = true;
    }

    if (
      html.includes("calculator-layout") &&
      !html.includes("cn-calc-sidebar") &&
      /<section class="calculator-layout[^"]*">\s*<article class="card">/i.test(html)
    ) {
      html = html.replace(
        /(<section class="calculator-layout[^"]*">\s*)<article class="card">/i,
        '$1<article class="card cn-calc-sidebar">'
      );
      changed = true;
    }

    if (html.includes("<article class=\"card\">") && html.includes("<h2>Results</h2>")) {
      html = html.replace(
        /<article class="card">\s*<h2>Results<\/h2>/g,
        '<article class="card cn-calc-results">\n          <h2>Results</h2>'
      );
      changed = true;
    }

    if (html.includes('class="cn-debt-payoff-layout__results"') && !html.includes("cn-calc-results")) {
      html = html.replace(
        /class="cn-debt-payoff-layout__results"/g,
        'class="cn-debt-payoff-layout__results cn-calc-results"'
      );
      changed = true;
    }

    if (html.includes('class="cn-loan-compare-layout__results"') && !html.includes("cn-calc-results")) {
      html = html.replace(
        /class="cn-loan-compare-layout__results"/g,
        'class="cn-loan-compare-layout__results cn-calc-results"'
      );
      changed = true;
    }
  }

  if (html.includes('class="site-footer"') && !html.includes("cn-site-footer")) {
    html = html.replace(/class="site-footer"/g, 'class="site-footer cn-site-footer"');
    changed = true;
  }

  if (!html.includes("site-footer")) {
    html = html.replace(/<\/body>/i, `${STANDARD_FOOTER}\n  </body>`);
    changed = true;
  }

  const dashboard = applyDashboardLayout(html);
  if (dashboard.changed) {
    html = dashboard.html;
    changed = true;
  }

  if (changed) fs.writeFileSync(filePath, html, "utf8");
  return changed;
}

let updated = 0;
for (const file of walkToolPages(TOOLS_DIR)) {
  if (patchCalculatorPage(file)) updated += 1;
}

console.log(`patch-calculator-workflow: updated ${updated} tool pages`);
