import Link from "next/link";

const QUICK_TOOLS = [
  { href: "/tools/mortgage-calculator/", emoji: "🏠", label: "Mortgage Calculator" },
  { href: "/tools/loan-calculator/", emoji: "💳", label: "Loan Calculator" },
  { href: "/tools/rent-vs-buy/", emoji: "🏘️", label: "Rent vs. Buy" },
  { href: "/tools/", emoji: "🎛️", label: "All calculators" },
] as const;

const SIMILAR_TOOLS = [
  { href: "/tools/loan-calculator/", emoji: "💳", label: "Loan Calculator" },
  { href: "/tools/loan-comparison/", emoji: "💳", label: "Loan Offer Comparison Tool" },
  { href: "/tools/debt-payoff/", emoji: "💳", label: "Debt Snowball & Avalanche Calculator" },
] as const;

export function RentVsBuyPageSections() {
  return (
    <>
      <div className="cn-calculator-hero-stack w-full flex flex-col gap-6 my-6 relative block">
        <section className="page-title cn-tool-page-title cn-page-hero space-y-4 text-center sm:text-left">
          <div className="cn-tool-page-title__head flex items-center gap-4 sm:gap-5">
            <div
              className="cn-tool-badge cn-tool-badge--lg flex shrink-0 w-[113px] h-[113px] items-center justify-center rounded-2xl shadow-sm bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/60 cn-tool-badge--housing"
              aria-hidden="true"
            >
              <svg
                className="cn-theme-icon cn-tool-badge__icon w-14 h-14 text-emerald-600 dark:text-emerald-400"
                viewBox="0 0 24 24"
                width="56"
                height="56"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
                <path d="M6 12h4M6 16h4M6 8h4M14 12h4M14 16h4M14 8h4" />
              </svg>
            </div>
            <div className="cn-tool-page-title__copy">
              <span className="cn-blog-category-pill cn-blog-category-pill--housing">Housing</span>
              <h1>Rent vs. Buy Calculator</h1>
            </div>
          </div>
          <p className="muted">
            Compare the long-term net worth of renting vs. buying a home. Factor in mortgage rates, property
            appreciation, inflation, and investment opportunity costs—then see when buying pulls ahead.
          </p>
        </section>

        <section className="cn-quick-actions relative block w-full mt-2">
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-white mb-4">
            More tools
          </h2>
          <div className="cn-quick-actions__grid grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mt-6 sm:mt-8 w-full">
            {QUICK_TOOLS.map((tool) => (
              <Link
                key={tool.href}
                href={tool.href}
                className="cn-quick-action-card relative flex flex-col items-center justify-center p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-sm hover:shadow-md transition-shadow group text-center no-underline"
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-3 font-bold text-xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"
                  aria-hidden="true"
                >
                  {tool.emoji}
                </div>
                <span className="text-sm font-extrabold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 transition-colors">
                  {tool.label}
                </span>
              </Link>
            ))}
          </div>
        </section>
      </div>

      <section className="card cn-feature-panel" aria-label="Why CalnexApp" style={{ marginBottom: "1.25rem" }}>
        <h2 style={{ margin: "0 0 1rem", fontSize: "1.1rem" }}>Why people use this</h2>
        <div className="cn-stat-row">
          <div className="cn-stat">
            <p className="cn-stat__label">Parallel paths</p>
            <p className="cn-stat__value">Rent vs buy</p>
          </div>
          <div className="cn-stat">
            <p className="cn-stat__label">Break-even</p>
            <p className="cn-stat__value">Year-by-year</p>
          </div>
          <div className="cn-stat">
            <p className="cn-stat__label">Opportunity cost</p>
            <p className="cn-stat__value">Invested down payment</p>
          </div>
        </div>
        <div className="cn-partner-mapdiagram" role="note" data-partner="mapdiagram">
          <p>
            Visualize your financial strategy. Draw out your business milestones and debt payoff workflows using{" "}
            <strong>MapDiagram</strong>.
          </p>
          <a
            className="cn-partner-mapdiagram__cta"
            href="https://mapdiagram.com/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Map your workflow visually →
          </a>
        </div>
      </section>
    </>
  );
}

export function RentVsBuyBottomSections() {
  return (
    <>
      <section className="card cn-trust-callout" aria-labelledby="rvb-how">
        <h2 id="rvb-how" style={{ margin: "0 0 1rem", fontSize: "1.15rem" }}>
          How it works
        </h2>
        <p className="muted" style={{ margin: "0 0 1rem" }}>
          Each year, we compare renter net worth (down payment invested minus cumulative rent) with buyer net worth
          (home equity after appreciation and amortization). The break-even year is when buying first shows higher net
          worth.
        </p>
        <h3 style={{ fontSize: "1rem", margin: "1rem 0 0.5rem" }}>Factors considered</h3>
        <ul className="muted" style={{ lineHeight: 1.6, margin: 0, paddingLeft: "1.25rem" }}>
          <li>Rent and renter insurance with annual increases</li>
          <li>Mortgage P&amp;I, property tax, and maintenance on the buy path</li>
          <li>Home price appreciation and remaining loan balance</li>
          <li>Opportunity cost: compound growth on the down payment if you rent</li>
        </ul>
        <p className="muted" style={{ margin: "1rem 0 0", fontSize: "0.9rem" }}>
          Closing costs, HOA, tax deductions, and sale transaction costs are not included. For directional planning
          only.
        </p>
      </section>

      <div className="py-12 border-t border-slate-100 dark:border-slate-800/60 mt-16 space-y-6">
        <section className="cn-tools-dashboard__category">
          <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mb-4 mt-8 flex items-center gap-2">
            <span aria-hidden="true">💳</span>
            <span>Similar calculators</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 my-6">
            {SIMILAR_TOOLS.map((tool) => (
              <Link
                key={tool.href}
                href={tool.href}
                className="cn-dashboard-micro-card flex items-center gap-3 p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800/80 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all group no-underline"
              >
                <div
                  className="w-10 h-10 shrink-0 rounded-lg flex items-center justify-center bg-indigo-50 text-lg font-bold text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400"
                  aria-hidden="true"
                >
                  {tool.emoji}
                </div>
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 transition-colors">
                  {tool.label}
                </span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
