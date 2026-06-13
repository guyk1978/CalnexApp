/**
 * Generate tools/take-home-pay/index.html as a static calculator page (no Next.js / React).
 * Run: node scripts/generate-take-home-pay-page.mjs
 * Requires: node scripts/bundle-take-home-pay-engine.mjs (via sync:site / prebuild)
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { applyDashboardLayout } = require("./calculator-sidebar-core.cjs");
const {
  renderToolBadge,
  renderToolQuickActions,
  renderToolConnectedSuite,
  renderToolContextCta,
  getToolContextCtaPreset,
  TOOL_PAGE_TITLE_SECTION_CLASS,
  TOOL_PAGE_TITLE_HEAD_CLASS,
  CALCULATOR_HERO_STACK_CLASS,
  CN_MAIN_LAYOUT_CLASS,
} = require("./tool-themes.cjs");
const { siteStylesheetLinks } = require("./site-stylesheets.cjs");

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "tools/take-home-pay/index.html");
const SHELL = path.join(ROOT, "tools/loan-calculator/index.html");

const tool = {
  slug: "take-home-pay-calculator",
  name: "Take-Home Pay Calculator",
  path: "/tools/take-home-pay/",
  description:
    "Estimate net paycheck after federal tax, FICA, and state/local withholding. See monthly, weekly, and annual take-home pay with an interactive breakdown.",
};

function buildPageTitle() {
  const theme = require("./tool-themes.cjs").getToolTheme(tool.slug);
  return `<section class="${TOOL_PAGE_TITLE_SECTION_CLASS}">
        <div class="${TOOL_PAGE_TITLE_HEAD_CLASS}">
          ${renderToolBadge("take-home-pay")}
          <div class="cn-tool-page-title__copy">
            <span class="cn-blog-category-pill cn-blog-category-pill--${theme.accent}">${theme.groupLabel}</span>
            <h1>${tool.name}</h1>
          </div>
        </div>
        <p class="muted">
          Estimate net pay after federal income tax, FICA, and state/local withholding—then compare
          monthly, weekly, and per-paycheck amounts at a glance.
        </p>
      </section>`;
}

function buildFeaturePanel() {
  return `<section class="card cn-feature-panel cn-hero-panel--vibrant" aria-label="Why CalnexApp" style="margin-bottom: 1.25rem">
        <h2 style="margin: 0 0 1rem; font-size: 1.1rem">Why people use this</h2>
        <div class="cn-stat-row grid gap-4 sm:grid-cols-3">
          <div class="cn-stat cn-stat--interactive cn-stat--truth">
            <p class="cn-stat__label">Federal brackets</p>
            <p class="cn-stat__value">2025 tables</p>
          </div>
          <div class="cn-stat cn-stat--interactive cn-stat--depth">
            <p class="cn-stat__label">FICA included</p>
            <p class="cn-stat__value">SS + Medicare</p>
          </div>
          <div class="cn-stat cn-stat--interactive cn-stat--friction">
            <p class="cn-stat__label">Your state</p>
            <p class="cn-stat__value">Custom % rate</p>
          </div>
        </div>
        <div class="cn-partner-mapdiagram" role="note" data-partner="mapdiagram">
          <p>Visualize your financial strategy. Draw out your business milestones and debt payoff workflows using <strong>MapDiagram</strong>.</p>
          <a class="cn-partner-mapdiagram__cta" href="https://mapdiagram.com/" target="_blank" rel="noopener noreferrer">Map your workflow visually →</a>
        </div>
      </section>`;
}

function buildCalculator() {
  return `<div class="cn-tool-shell cn-calc-workflow" id="thp-calculator">
        <section class="calculator-layout cn-calculator-layout cn-calculator-workflow take-home-pay_layout__y5vCk">
          <form class="card input-card cn-calc-sidebar" id="thp-form" aria-label="Take-home pay calculator form">
            <header class="cn-calc-form__head">
              <h2 class="cn-calc-form__title">Paycheck inputs</h2>
              <p class="cn-calc-form__lede muted">Adjust salary and tax assumptions—the results update as you type.</p>
            </header>
            <div class="field">
              <label for="thp-gross">Gross annual salary</label>
              <div class="input-with-prefix">
                <span data-currency-symbol>$</span>
                <input id="thp-gross" type="number" min="0" step="1000" data-input-bind="thp_gross" value="85000" />
              </div>
            </div>
            <fieldset class="cn-calc-fieldset" style="border:0;padding:0;margin:0 0 1rem">
              <legend class="cn-calc-fieldset__legend" style="margin-bottom:0.5rem">Pay frequency</legend>
              <input type="hidden" id="thp-freq" data-input-bind="thp_freq" value="biweekly" />
              <div class="take-home-pay_frequencyPills__L5LXL" role="group" aria-label="Pay frequency">
                <button type="button" class="take-home-pay_pill__8vp7A" data-thp-freq-pill data-thp-freq="monthly" aria-pressed="false">Monthly (12/yr)</button>
                <button type="button" class="take-home-pay_pill__8vp7A take-home-pay_pillActive__sDlJK" data-thp-freq-pill data-thp-freq="biweekly" aria-pressed="true">Bi-weekly (26/yr)</button>
              </div>
            </fieldset>
            <div class="field">
              <label for="thp-filing">Tax filing status</label>
              <select id="thp-filing" data-input-bind="thp_filing">
                <option value="single" selected>Single</option>
                <option value="married_joint">Married filing jointly</option>
                <option value="married_separate">Married filing separately</option>
                <option value="head_of_household">Head of household</option>
              </select>
            </div>
            <div class="field">
              <label for="thp-state">State / local tax (estimated %)</label>
              <div class="input-with-suffix">
                <input id="thp-state" type="number" min="0" max="20" step="0.1" data-input-bind="thp_state" value="5" />
                <span>%</span>
              </div>
              <span style="font-size:var(--cn-text-xs);color:var(--cn-text-tertiary)">Flat effective rate for planning—not itemized state rules.</span>
            </div>
          </form>
          <aside class="card output-card cn-calc-results cn-tool-rail take-home-pay_rail__s9k8O" aria-live="polite">
            <h2>Results</h2>
            <article class="take-home-pay_resultCard__1ONJV" id="thp-result-card" aria-live="polite">
              <div class="take-home-pay_shimmerOverlay__B7gmZ" aria-hidden="true"></div>
              <p style="margin:0;font-size:var(--cn-text-xs);font-weight:600;letter-spacing:0.07em;text-transform:uppercase;color:var(--cn-text-tertiary)">Net take-home pay</p>
              <p class="take-home-pay_heroAmount__C8tM5" id="thp-hero-amount">$63,934</p>
              <p class="muted" id="thp-summary-line" style="margin:0.35rem 0 0;font-size:var(--cn-text-sm)"></p>
              <dl class="take-home-pay_metricGrid___5gEk">
                <div class="take-home-pay_metricTile__B4FEa" data-thp-metric><dt>Monthly</dt><dd>—</dd></div>
                <div class="take-home-pay_metricTile__B4FEa" data-thp-metric><dt>Weekly</dt><dd>—</dd></div>
                <div class="take-home-pay_metricTile__B4FEa" data-thp-metric><dt>Yearly</dt><dd>—</dd></div>
              </dl>
              <div class="take-home-pay_dashboard__VGN8Y">
                <div class="take-home-pay_ringWrap__WWavb">
                  <svg id="thp-breakdown-ring" class="take-home-pay_ringSvg___AyuV" viewBox="0 0 128 128" aria-hidden="true">
                    <circle class="take-home-pay_ringTrack__XZsbx" cx="64" cy="64" r="${58}" />
                    <circle class="take-home-pay_ringSegment__EFn59" data-thp-ring-seg cx="64" cy="64" r="${58}" />
                    <circle class="take-home-pay_ringSegment__EFn59" data-thp-ring-seg cx="64" cy="64" r="${58}" />
                    <circle class="take-home-pay_ringSegment__EFn59" data-thp-ring-seg cx="64" cy="64" r="${58}" />
                  </svg>
                  <div class="take-home-pay_ringCenter__qsyR7">
                    <strong id="thp-ring-net-pct">0</strong>
                    <span>kept</span>
                  </div>
                </div>
                <div class="take-home-pay_barList__seV_3" id="thp-bar-list" aria-label="Pay breakdown by category"></div>
              </div>
              <dl class="take-home-pay_taxDetailGrid__l7lfk">
                <div class="take-home-pay_taxDetailItem__IUoov" data-thp-tax-detail><dt>Federal income tax</dt><dd>—</dd></div>
                <div class="take-home-pay_taxDetailItem__IUoov" data-thp-tax-detail><dt>FICA (SS + Medicare)</dt><dd>—</dd></div>
                <div class="take-home-pay_taxDetailItem__IUoov" data-thp-tax-detail><dt>State / local</dt><dd>—</dd></div>
                <div class="take-home-pay_taxDetailItem__IUoov" data-thp-tax-detail><dt>Gross salary</dt><dd>—</dd></div>
              </dl>
              <p class="take-home-pay_disclaimer__dCLYb">Estimates use 2025 federal brackets and standard deduction, plus FICA wage bases. Actual withholding varies with W-4 elections, pre-tax benefits, and credits—consult a tax professional for filing decisions.</p>
            </article>
            <div class="share-tools cn-portable-results-box" data-cn-share="true">
              <h3>Export &amp; share</h3>
              <p class="muted cn-portable-results__lead">Download data or send a link that restores this calculation.</p>
              <div class="cn-export-share-toolbar">
                <button type="button" class="btn btn-ghost" id="thp-download-csv">Download CSV</button>
                <button type="button" class="cn-pdf-export-btn btn btn-ghost" data-cn-pdf-export="true" data-page-key="take-home-pay-calculator" data-calculator-name="Take-Home Pay Calculator" aria-label="Export results to PDF">
                  <span class="cn-pdf-export-btn__label">Export PDF</span>
                </button>
                <div class="cn-share-menu" data-cn-share-menu="true">
                  <button type="button" class="btn btn-primary cn-share-menu__trigger" data-cn-share-toggle="true" aria-expanded="false" aria-haspopup="dialog">
                    <span>Share</span>
                  </button>
                  <div class="cn-share-menu__panel" data-cn-share-panel="true" hidden role="dialog" aria-label="Share calculation">
                    <p class="cn-share-menu__title">Share this calculation</p>
                    <p class="muted cn-share-menu__hint">Opens with your inputs pre-filled on CalnexApp.</p>
                    <input id="cnShareUrl-take-home-pay-calculator" class="cn-calculator-share__url" type="text" readonly data-cn-share-url="true" aria-label="Shareable calculator URL" value="" />
                    <div class="cn-share-menu__actions">
                      <button type="button" class="btn btn-primary btn-sm" data-cn-share-action="native">Share…</button>
                      <button type="button" class="btn btn-ghost btn-sm" data-cn-share-action="copy">Copy link</button>
                      <button type="button" class="btn btn-ghost btn-sm" data-cn-share-action="copy-message">Copy summary</button>
                      <button type="button" class="btn btn-ghost btn-sm" data-cn-share-action="email">Email</button>
                    </div>
                    <div class="cn-share-menu__social" data-cn-share-social aria-label="Social networks"></div>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </section>
      </div>`;
}

function buildFaq() {
  return `<section class="card">
        <h2>Take-Home Pay FAQ</h2>
        <details>
          <summary>How accurate is this take-home estimate?</summary>
          <p>It uses 2025 federal brackets, standard deduction, and FICA wage bases. Your actual paycheck depends on W-4 withholding, pre-tax benefits, and credits.</p>
        </details>
        <details>
          <summary>Why use a flat state/local percentage?</summary>
          <p>State rules vary widely. A single effective rate keeps planning simple; adjust the % field to match your situation.</p>
        </details>
        <details>
          <summary>Does bi-weekly vs monthly change annual tax?</summary>
          <p>No—the annual tax math is the same. Pay frequency only changes how many paychecks divide your net pay.</p>
        </details>
      </section>`;
}

function buildTrust() {
  return `<section class="card cn-trust-callout" aria-label="How it works">
        <h2 style="margin:0 0 1rem;font-size:1.15rem">How it works</h2>
        <p class="muted" style="margin:0 0 1rem">We subtract estimated federal income tax (progressive 2025 brackets after the standard deduction), FICA payroll taxes, and a flat state/local percentage from your gross annual salary.</p>
        <ul class="muted" style="line-height:1.6;margin:0;padding-left:1.25rem">
          <li>Pre-tax 401(k), HSA, or health insurance premiums are not modeled</li>
          <li>Child tax credits and itemized deductions are not included</li>
          <li>Consult a tax professional for filing decisions</li>
        </ul>
      </section>`;
}

function buildMain() {
  const cta = renderToolContextCta(getToolContextCtaPreset("take-home-pay-calculator"));
  return `<main class="${CN_MAIN_LAYOUT_CLASS}" data-page="take-home-pay-calculator">
      <!-- CN_CALCULATOR_HERO_STACK_START -->
      <div class="${CALCULATOR_HERO_STACK_CLASS}">
        ${buildPageTitle()}
        ${renderToolQuickActions("take-home-pay-calculator")}
      </div>
      <!-- CN_CALCULATOR_HERO_STACK_END -->
      ${buildFeaturePanel()}
      ${buildCalculator()}
      <section class="card" data-related-tools data-current-tool="take-home-pay-calculator" aria-live="polite"></section>
      ${cta}
      ${renderToolConnectedSuite("take-home-pay-calculator")}
      ${buildFaq()}
      ${buildTrust()}
    </main>`;
}

function buildHead() {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" href="data:;base64,=">
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <script src="/assets/js/theme-init.js"></script>
    <title>Take-Home Pay Calculator — Net Salary After Tax | CalnexApp</title>
    <meta name="description" content="${tool.description}" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="Take-Home Pay Calculator — Net Salary After Tax | CalnexApp" />
    <meta property="og:description" content="Calculate federal, FICA, and state tax estimates to see your true take-home pay." />
    <meta property="og:url" content="https://calnexapp.com/tools/take-home-pay/" />
    <link rel="canonical" href="https://calnexapp.com/tools/take-home-pay/" />
${siteStylesheetLinks()}
  </head>
  <body data-page="take-home-pay-calculator" class="cn-calculator-page cn-site-chrome">`;
}

function buildFooterScripts() {
  return `
    <div id="cnShareToast" class="share-toast" role="status" aria-live="polite"></div>
    <div id="cnPdfToast" class="share-toast" role="status" aria-live="polite"></div>
    <footer class="site-footer cn-site-footer">
      <div class="container footer-content">
        <p>&copy; <span id="year"></span> CalnexApp. All rights reserved.</p>
        <nav class="footer-links" aria-label="Footer">
          <a href="/about/">About</a>
          <a href="/contact/">Contact</a>
          <a href="/blog/">Blog</a>
          <a href="https://mapdiagram.com/" target="_blank" rel="noopener noreferrer">MapDiagram</a>
        </nav>
      </div>
    </footer>
    <script src="/assets/js/header-toolbar.js" defer></script>
    <script src="/assets/js/geo-finance.js" defer></script>
    <script src="/assets/js/currency.js" defer></script>
    <script src="/assets/js/geo-currency-sync.js" defer></script>
    <script src="/assets/js/ui-enhancements.js" defer></script>
    <script src="/assets/js/app.js" defer></script>
    <script src="/assets/js/pdf-export-helpers.js" defer></script>
    <script src="/assets/js/pdf-export.js" defer></script>
    <script src="/assets/js/pdf-export-init.js" defer></script>
    <script src="/assets/js/vendor/jspdf.umd.min.js" defer></script>
    <script src="/assets/js/pdf-report-generator.js" defer></script>
    <script src="/assets/js/pdf-joinmypdf-promo.config.js" defer></script>
    <script src="/assets/js/calculator-share.js" defer></script>
    <script src="/assets/js/calculator-share-init.js" defer></script>
    <script src="/assets/js/take-home-pay-engine.js" defer></script>
    <script src="/assets/js/take-home-pay-calculator.js" defer></script>
  </body>
</html>`;
}

function generate() {
  if (!fs.existsSync(SHELL)) {
    console.error("generate-take-home-pay-page: missing shell", SHELL);
    process.exit(1);
  }
  const shell = fs.readFileSync(SHELL, "utf8");
  const hStart = shell.indexOf("<header");
  const hEnd = shell.indexOf("</header>");
  if (hStart < 0 || hEnd < 0) {
    console.error("generate-take-home-pay-page: could not find <header> in loan-calculator shell");
    process.exit(1);
  }
  const headerHtml = shell.slice(hStart, hEnd + "</header>".length);

  let html = buildHead() + `\n    ${headerHtml}\n` + buildMain() + buildFooterScripts();
  const dashboard = applyDashboardLayout(html);
  html = dashboard.html;

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, html, "utf8");
  console.log("generate-take-home-pay-page:", path.relative(ROOT, OUT));
}

generate();
