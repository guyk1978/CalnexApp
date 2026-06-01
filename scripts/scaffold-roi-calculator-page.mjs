/**
 * One-off scaffold: tools/roi-calculator/index.html from interest-calculator shell.
 * Run: node scripts/scaffold-roi-calculator-page.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const srcPath = path.join(ROOT, "tools/interest-calculator/index.html");
const destDir = path.join(ROOT, "tools/roi-calculator");
const destPath = path.join(destDir, "index.html");

const ROI_BODY = `<!-- CN_CALCULATOR_BODY_START -->
<section class="calculator-layout">
        <form class="card input-card" id="roi-form" aria-label="ROI calculator inputs">
          <h2>Inputs</h2>
          <div class="field">
            <label for="roiPurchasePrice" data-currency-label="roi_purchase_price">Purchase price</label>
            <div class="input-with-prefix">
              <span data-currency-symbol>¤</span>
              <input id="roiPurchasePrice" data-input-bind="roi_purchase_price" type="number" min="0" step="1000" value="250000" />
            </div>
          </div>
          <div class="field">
            <label for="roiAnnualRent" data-currency-label="roi_annual_rent">Annual rent (gross)</label>
            <div class="input-with-prefix">
              <span data-currency-symbol>¤</span>
              <input id="roiAnnualRent" data-input-bind="roi_annual_rent" type="number" min="0" step="100" value="24000" />
            </div>
          </div>
          <div class="field">
            <label for="roiAnnualExpenses" data-currency-label="roi_annual_expenses">Annual expenses</label>
            <div class="input-with-prefix">
              <span data-currency-symbol>¤</span>
              <input id="roiAnnualExpenses" data-input-bind="roi_annual_expenses" type="number" min="0" step="100" value="6000" />
            </div>
            <p class="muted" style="margin: 0.35rem 0 0; font-size: 0.85rem">Taxes, insurance, maintenance, vacancy, and management.</p>
          </div>
          <div class="field">
            <label for="roiAppreciationRate">Annual appreciation (%)</label>
            <input id="roiAppreciationRate" data-input-bind="roi_appreciation_rate" type="number" min="0" step="0.1" value="3" />
          </div>
        </form>

        <aside class="card output-card" aria-live="polite">
          <h2>Results</h2>
          <div class="cn-result-banner" role="status">
            <p class="eyebrow" data-bind="roi_banner_title" data-format="text">—</p>
            <p class="muted" data-bind="roi_banner_detail" data-format="text"></p>
          </div>
          <dl class="result-grid">
            <div>
              <dt>Annual net income</dt>
              <dd data-bind="roi_annual_net_income" data-format="currency">0</dd>
            </div>
            <div>
              <dt>Cash-on-cash ROI</dt>
              <dd data-bind="roi_cash_on_cash_pct" data-format="percent">0</dd>
            </div>
            <div>
              <dt>Appreciation gain (year 1)</dt>
              <dd data-bind="roi_appreciation_gain" data-format="currency">0</dd>
            </div>
            <div>
              <dt>Total return (cash flow + appreciation)</dt>
              <dd data-bind="roi_total_return_pct" data-format="percent">0</dd>
            </div>
          </dl>
        </aside>
      </section>
<!-- CN_CALCULATOR_BODY_END -->
<section class="card" data-related-tools data-current-tool="roi-calculator"></section>`;

let html = fs.readFileSync(srcPath, "utf8");

html = html
  .replace(/<title>[\s\S]*?<\/title>/i, "<title>ROI Calculator — Rental Property Return | CalnexApp</title>")
  .replace(
    /<meta\s+name="description"[\s\S]*?\/>/i,
    '<meta name="description" content="Estimate rental property ROI: cash-on-cash return, annual net income, appreciation, and total return on purchase price." />'
  )
  .replace(/interest-calculator/g, "roi-calculator")
  .replace(/Interest Calculator/g, "ROI Calculator")
  .replace(/Explore simple and compound growth over time\./, "Estimate cash-on-cash and total return for a rental investment.")
  .replace(/data-page="roi-calculator"/, 'data-page="roi-calculator"')
  .replace(/<script src="https:\/\/cdn\.jsdelivr\.net\/npm\/chart\.js[^"]*" defer><\/script>\s*/i, "")
  .replace(/<script src="\/assets\/js\/interest\.js" defer><\/script>/i, '<script src="/assets/js/roi-calculator.js" defer></script>');

const bodyRe = /<!-- CN_CALCULATOR_BODY_START -->[\s\S]*?<!-- CN_CALCULATOR_BODY_END -->/;
if (!bodyRe.test(html)) {
  console.error("scaffold-roi: CN_CALCULATOR_BODY markers not found in template");
  process.exit(1);
}
html = html.replace(bodyRe, ROI_BODY);

fs.mkdirSync(destDir, { recursive: true });
fs.writeFileSync(destPath, html, "utf8");
console.log(`scaffold-roi: wrote ${destPath}`);
