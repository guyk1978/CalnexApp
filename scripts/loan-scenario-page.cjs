/**
 * Pre-calculated loan scenario tool pages — Industrial Matte layout.
 */
const fs = require("fs");
const path = require("path");
const { computeScenario, loadConfig, toToolSlug, currency } = require("./loan-scenario-core.cjs");
const { renderToolContextCta, getToolContextCtaPreset } = require("./tool-themes.cjs");

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const ROOT = path.resolve(__dirname, "..");
const DATA_PATH = path.join(ROOT, "seo", "data", "loan-pages.json");
const SITE_URL = "https://calnexapp.com";

const LENDING_TOOLS = [
  { slug: "loan-calculator", label: "Loan Calculator", path: "/tools/loan-calculator/" },
  { slug: "mortgage-calculator", label: "Mortgage Calculator", path: "/tools/mortgage-calculator/" },
  { slug: "car-loan-calculator", label: "Car Loan Calculator", path: "/tools/car-loan-calculator/" },
  { slug: "debt-payoff", label: "Debt Payoff Planner", path: "/tools/debt-payoff/" },
  { slug: "loan-comparison", label: "Loan Comparison", path: "/tools/loan-comparison/" },
  { slug: "interest-calculator", label: "Interest Calculator", path: "/tools/interest-calculator/" }
];

function loadAllEntries() {
  return JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
}

function computePageData(entry) {
  const config = loadConfig();
  const s = computeScenario(entry, config);
  const title = `Loan Calculator: ${currency(s.P)} at ${s.rate}% for ${s.years} years`;
  const description = `Estimate monthly payments for a ${currency(s.P)} loan at ${s.rate}% over ${s.years} years. Includes repayment and total interest breakdown.`;
  const canonicalUrl = `${SITE_URL}/tools/loan-calculator/${s.toolSlug}/`;

  return {
    loanAmount: s.P,
    interestRate: s.rate,
    term: s.years,
    monthly: s.M,
    totalPaid: s.totalPaid,
    totalInterest: s.totalInterest,
    slug: s.toolSlug,
    title,
    description,
    canonicalUrl
  };
}

function formatScenarioNavLabel(entry) {
  const amount =
    entry.loan_amount >= 1000
      ? `$${Math.round(entry.loan_amount / 1000)}k`
      : `$${entry.loan_amount}`;
  const rate = String(entry.interest_rate).replace(/\.0$/, "");
  return `${amount} · ${rate}% · ${entry.loan_term} yr`;
}

function getRelatedScenarios(current, allEntries, limit = 8) {
  return allEntries
    .filter(
      (e) =>
        e.loan_amount === current.loanAmount &&
        !(e.interest_rate === current.interestRate && e.loan_term === current.term)
    )
    .slice(0, limit);
}

function renderMetricCard(label, value, { featured = false } = {}) {
  const cls = featured
    ? "cn-loan-scenario-metric cn-loan-scenario-metric--featured"
    : "cn-loan-scenario-metric";
  return `            <article class="${cls}">
              <p class="cn-loan-scenario-metric__label">${escapeHtml(label)}</p>
              <p class="cn-loan-scenario-metric__value">${escapeHtml(value)}</p>
            </article>`;
}

function renderSidebar(data, relatedEntries) {
  const toolLinks = LENDING_TOOLS.map(
    (tool) =>
      `              <li><a href="${tool.path}" class="cn-loan-scenario-nav__link">${escapeHtml(tool.label)}</a></li>`
  ).join("\n");

  const scenarioLinks = relatedEntries
    .map((entry) => {
      const slug = toToolSlug(entry.loan_amount, entry.interest_rate, entry.loan_term);
      const isCurrent =
        entry.loan_amount === data.loanAmount &&
        entry.interest_rate === data.interestRate &&
        entry.loan_term === data.term;
      const cls = isCurrent
        ? "cn-loan-scenario-nav__link cn-loan-scenario-nav__link--active"
        : "cn-loan-scenario-nav__link";
      return `              <li><a href="/tools/loan-calculator/${slug}/" class="${cls}"${isCurrent ? ' aria-current="page"' : ""}>${escapeHtml(formatScenarioNavLabel(entry))}</a></li>`;
    })
    .join("\n");

  const currentLink = `              <li><a href="/tools/loan-calculator/${data.slug}/" class="cn-loan-scenario-nav__link cn-loan-scenario-nav__link--active" aria-current="page">${escapeHtml(formatScenarioNavLabel({ loan_amount: data.loanAmount, interest_rate: data.interestRate, loan_term: data.term }))}</a></li>`;

  const scenariosBlock =
    relatedEntries.length > 0
      ? `            <nav class="cn-loan-scenario-nav__group" aria-label="Related scenarios">
              <p class="cn-loan-scenario-nav__label">Same principal</p>
              <ul class="cn-loan-scenario-nav__list">
${currentLink}
${scenarioLinks}
              </ul>
            </nav>`
      : `            <nav class="cn-loan-scenario-nav__group" aria-label="Current scenario">
              <p class="cn-loan-scenario-nav__label">Scenario</p>
              <ul class="cn-loan-scenario-nav__list">
${currentLink}
              </ul>
            </nav>`;

  return `        <aside class="cn-loan-scenario-sidebar cn-calc-global-sidebar cn-calc-sidebar" aria-label="Loan scenarios navigation">
          <div class="cn-loan-scenario-nav">
            <a href="/tools/loan-calculator/" class="cn-loan-scenario-nav__back">← Loan Calculator</a>
            <nav class="cn-loan-scenario-nav__group" aria-label="Lending tools">
              <p class="cn-loan-scenario-nav__label">Tools</p>
              <ul class="cn-loan-scenario-nav__list">
${toolLinks}
              </ul>
            </nav>
${scenariosBlock}
          </div>
        </aside>`;
}

function renderWorkspace(data) {
  const ctaPreset = getToolContextCtaPreset("loan-scenario-plan");
  const cta = ctaPreset ? renderToolContextCta(ctaPreset) : "";

  return `        <div class="cn-calc-page-main cn-calc-workspace cn-loan-scenario-workspace">
          <header class="cn-loan-scenario-hero">
            <p class="cn-loan-scenario-eyebrow">Loan Scenario</p>
            <h1 class="cn-loan-scenario-title">${escapeHtml(data.title)}</h1>
            <p class="cn-loan-scenario-lede">${escapeHtml(data.description)}</p>
          </header>

          <section class="cn-loan-scenario-dashboard" aria-label="Estimated results">
            <h2 class="sr-only">Estimated results</h2>
            <div class="cn-loan-scenario-metrics">
${renderMetricCard("Loan amount", currency(data.loanAmount))}
${renderMetricCard("Interest rate", `${data.interestRate}%`)}
${renderMetricCard("Loan term", `${data.term} years`)}
${renderMetricCard("Monthly payment", currency(data.monthly), { featured: true })}
${renderMetricCard("Total interest", currency(data.totalInterest))}
${renderMetricCard("Total repayment", currency(data.totalPaid))}
            </div>
          </section>

${cta}

      <!-- SEO_ENGINE_RELATED_START -->
      <!-- SEO_ENGINE_RELATED_END -->
        </div>`;
}

function renderLoanScenarioPage(entry, options = {}) {
  const allEntries = options.allEntries || loadAllEntries();
  const data = computePageData(entry);
  const related = getRelatedScenarios(data, allEntries);

  const schema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: data.title,
    description: data.description,
    url: data.canonicalUrl,
    breadcrumb: {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
        { "@type": "ListItem", position: 2, name: "tools", item: `${SITE_URL}/tools/` },
        { "@type": "ListItem", position: 3, name: "loan calculator", item: `${SITE_URL}/tools/loan-calculator/` },
        { "@type": "ListItem", position: 4, name: data.title, item: data.canonicalUrl }
      ]
    }
  };

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" href="data:;base64,=">
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <script src="/assets/js/theme-init.js"></script>
    <title>${escapeHtml(data.title)}</title>
    <meta name="description" content="${escapeHtml(data.description)}" />
    <link rel="canonical" href="${data.canonicalUrl}" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="${escapeHtml(data.title)}" />
    <meta property="og:description" content="${escapeHtml(data.description)}" />
    <meta property="og:url" content="${data.canonicalUrl}" />
    <meta property="og:site_name" content="CalnexApp" />
    <link rel="stylesheet" href="/assets/css/style.css?v=1.5" />
    <!-- SEO_ENGINE_SCHEMA_START -->
    <script type="application/ld+json">
${JSON.stringify(schema, null, 2)}
    </script>
    <!-- SEO_ENGINE_SCHEMA_END -->
    <link rel="stylesheet" href="/assets/css/cookie-consent.css?v=6" />
    <script src="/assets/js/consent-config.js"></script>
    <script src="/assets/js/cookie-consent.js?v=6" defer></script>
  </head>
  <body data-page="loan-scenario" data-cn-static-layout="true" class="cn-loan-scenario-page cn-calculator-page cn-site-chrome">
    <header class="site-header">
      <div class="container nav">
        <a href="/" class="brand">CalnexApp</a>
        <!-- CN_NAV_MENU_START -->
        <nav class="menu" id="siteMenu">
          <a href="/" data-nav-link>Home</a>
          <a href="/tools/" data-nav-link>Tools</a>
          <a href="/blog/" data-nav-link>Blog</a>
          <a href="/about/" data-nav-link>About</a>
          <a href="/contact/" data-nav-link>Contact</a>
        </nav>
        <!-- CN_NAV_MENU_END -->
        <!-- CN_HEADER_SEARCH_START -->
        <div class="cn-header-actions">
          <div id="cn-site-search-mount" class="cn-header-search-mount">
            <div class="cn-header-search-wrap">
              <button
                type="button"
                id="cn-header-search-trigger"
                class="cn-header-search-trigger"
                aria-label="Search"
                aria-expanded="false"
                aria-controls="cn-header-search"
              >
                <svg
                  class="cn-header-search-trigger__icon"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.25"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" />
                </svg>
              </button>
            </div>
          </div>
        </div>
        <!-- CN_HEADER_SEARCH_END -->
      </div>
    </header>

    <main class="cn-main-layout cn-calc-page-frame">
      <div class="cn-calc-page-body cn-calc-dashboard__body">
${renderSidebar(data, related)}
${renderWorkspace(data)}
      </div>
    </main>

    <footer class="site-footer cn-site-footer">
      <div class="container footer-content">
        <p>&copy; <span id="year"></span> CalnexApp. All rights reserved.</p>
        <nav class="footer-links">
          <a href="/about/">About</a>
          <a href="/contact/">Contact</a>
          <a href="/blog/">Blog</a>
        </nav>
      </div>
    </footer>
    <script src="/assets/js/site-search.js" defer></script>
    <script src="/assets/js/app.js" defer></script>
  </body>
</html>`;

  return { html, data, related };
}

module.exports = {
  computePageData,
  renderLoanScenarioPage,
  loadAllEntries,
  LENDING_TOOLS
};
