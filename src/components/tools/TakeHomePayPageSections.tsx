import Link from "next/link";
import { FeatureStatRow, type FeatureStat } from "@/components/ui/FeatureStatRow";

/** Mirrors tool-themes TOOL_QUICK_ACTION_PRESETS.take-home-pay-calculator */
const QUICK_TOOLS = [
  { href: "/tools/retirement-calculator/", emoji: "🧭", label: "Retirement Calculator" },
  { href: "/tools/interest-calculator/", emoji: "📈", label: "Interest Calculator" },
  { href: "/tools/mortgage-calculator/", emoji: "🏠", label: "Mortgage Calculator" },
  { href: "/tools/loan-calculator/", emoji: "💳", label: "Loan Calculator" },
  { href: "/tools/", emoji: "🎛️", label: "All calculators" },
] as const;

const RELATED_LINKS = [
  {
    href: "/blog/how-to-calculate-loan-interest/",
    emoji: "💳",
    label: "How to Calculate Loan Interest: A Practical Guide",
  },
  { href: "/tools/mortgage-calculator/", emoji: "🏠", label: "Mortgage Calculator" },
  { href: "/tools/retirement-calculator/", emoji: "🧭", label: "Retirement Calculator" },
] as const;

const SIMILAR_TOOLS = [
  { href: "/tools/retirement-calculator/", emoji: "🧭", label: "Retirement Calculator" },
  { href: "/tools/interest-calculator/", emoji: "📈", label: "Interest Calculator" },
  { href: "/tools/mortgage-calculator/", emoji: "🏠", label: "Mortgage Calculator" },
] as const;

const FEATURE_STATS: FeatureStat[] = [
  { variant: "truth", label: "Federal brackets", value: "2025 tables" },
  { variant: "depth", label: "FICA included", value: "SS + Medicare" },
  { variant: "friction", label: "Your state", value: "Custom % rate" },
];

const CONNECTED_TOOLS = [
  { href: "/tools/loan-calculator/", emoji: "💳", label: "Loan Calculator" },
  { href: "/tools/mortgage-calculator/", emoji: "🏠", label: "Mortgage Calculator" },
  { href: "/tools/car-loan-calculator/", emoji: "🚗", label: "Car Loan Calculator" },
] as const;

export function TakeHomePayPageSections() {
  return (
    <>
      <div className="cn-calculator-hero-stack w-full flex flex-col gap-6 my-6 relative block">
        <section className="page-title cn-tool-page-title cn-page-hero space-y-4 text-center sm:text-left">
          <div className="cn-tool-page-title__head flex items-center gap-4 sm:gap-5">
            <div
              className="cn-tool-badge cn-tool-badge--lg cn-tool-badge--planning flex shrink-0 w-[113px] h-[113px] items-center justify-center rounded-2xl shadow-sm"
              aria-hidden="true"
            >
              <svg
                className="cn-theme-icon cn-tool-badge__icon w-14 h-14"
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
                <rect x="2" y="7" width="20" height="14" rx="2" />
                <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
                <path d="M2 13h20" />
              </svg>
            </div>
            <div className="cn-tool-page-title__copy">
              <span className="cn-blog-category-pill cn-blog-category-pill--planning">
                Retirement &amp; planning
              </span>
              <h1>Take-Home Pay Calculator</h1>
            </div>
          </div>
          <p className="muted">
            Estimate net pay after federal income tax, FICA, and state/local withholding—then compare
            monthly, weekly, and per-paycheck amounts at a glance.
          </p>
        </section>

        <section className="cn-quick-actions relative block w-full mt-2">
          <h2 className="cn-section-heading">More tools</h2>
          <div className="cn-quick-actions__grid grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mt-6 sm:mt-8 w-full">
            {QUICK_TOOLS.map((tool) => (
              <Link
                key={tool.href}
                href={tool.href}
                className="cn-quick-action-card"
                data-shared-link
                data-target-path={tool.href}
              >
                <div className="cn-quick-action-card__emoji" aria-hidden="true">
                  {tool.emoji}
                </div>
                <span className="cn-quick-action-card__label">{tool.label}</span>
              </Link>
            ))}
          </div>
        </section>
      </div>

      <section
        className="card cn-feature-panel cn-hero-panel--vibrant"
        aria-label="Why CalnexApp"
        style={{ marginBottom: "1.25rem" }}
      >
        <h2 style={{ margin: 0, marginBottom: "1rem", fontSize: "1.1rem" }}>Why people use this</h2>
        <FeatureStatRow stats={FEATURE_STATS} />
        <div className="cn-partner-mapdiagram" role="note" data-partner="mapdiagram">
          <p>
            Visualize your financial strategy. Draw out your business milestones and debt payoff
            workflows using <strong>MapDiagram</strong>.
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

export function TakeHomePayConnectedSuite() {
  return (
    <section className="cn-quick-actions relative block w-full my-8">
      <h2 className="cn-section-heading">Connected Planning Suite</h2>
      <div className="cn-quick-actions__grid grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mt-6 sm:mt-8 w-full">
        {CONNECTED_TOOLS.map((tool) => (
          <Link
            key={tool.href}
            href={tool.href}
            className="cn-quick-action-card"
            data-shared-link
            data-target-path={tool.href}
          >
            <div className="cn-quick-action-card__emoji" aria-hidden="true">
              {tool.emoji}
            </div>
            <span className="cn-quick-action-card__label">{tool.label}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function TakeHomePayContextCta() {
  return (
    <section
      className="cn-tool-context-cta card flex flex-col sm:flex-row items-center sm:items-start justify-between gap-4 p-4 w-full relative block"
      aria-label="Planning retirement contributions?"
    >
      <div className="cn-tool-context-cta__body space-y-1 min-w-0 flex-1">
        <h2 className="m-0 text-lg font-semibold" style={{ color: "var(--cn-text-primary)" }}>
          Planning retirement contributions?
        </h2>
        <p className="muted m-0">
          Pre-tax 401(k) contributions lower taxable income—model long-term growth in the retirement
          calculator.
        </p>
      </div>
      <Link
        href="/tools/retirement-calculator/"
        className="btn btn-primary cn-tool-context-cta__btn flex-shrink-0 w-full sm:w-auto"
      >
        Open Retirement Calculator
      </Link>
    </section>
  );
}

export function TakeHomePayBottomSections() {
  return (
    <>
      <section className="py-12 border-t mt-16 space-y-6" style={{ borderColor: "var(--cn-border-subtle)" }}>
        <h2 className="cn-section-heading">Related tools/articles</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 my-6">
          {RELATED_LINKS.map((item) => (
            <Link key={item.href} href={item.href} className="cn-dashboard-micro-card">
              <div className="cn-dashboard-micro-card__emoji" aria-hidden="true">
                {item.emoji}
              </div>
              <span className="cn-dashboard-micro-card__label">{item.label}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="card">
        <h2>Take-Home Pay FAQ</h2>
        <details>
          <summary>How accurate is this take-home estimate?</summary>
          <p>
            It uses 2025 federal brackets, standard deduction, and FICA wage bases. Your actual
            paycheck depends on W-4 withholding, pre-tax benefits, and credits.
          </p>
        </details>
        <details>
          <summary>Why use a flat state/local percentage?</summary>
          <p>
            State rules vary widely. A single effective rate keeps planning simple; adjust the %
            field to match your situation.
          </p>
        </details>
        <details>
          <summary>Does bi-weekly vs monthly change annual tax?</summary>
          <p>
            No—the annual tax math is the same. Pay frequency only changes how many paychecks divide
            your net pay.
          </p>
        </details>
      </section>

      <div className="py-12 border-t mt-16 space-y-6" style={{ borderColor: "var(--cn-border-subtle)" }}>
        <section className="cn-tools-dashboard__category">
          <h3 className="cn-section-heading flex items-center gap-2">
            <span aria-hidden="true">💵</span>
            <span>Similar calculators</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 my-6">
            {SIMILAR_TOOLS.map((tool) => (
              <Link key={tool.href} href={tool.href} className="cn-dashboard-micro-card">
                <div className="cn-dashboard-micro-card__emoji" aria-hidden="true">
                  {tool.emoji}
                </div>
                <span className="cn-dashboard-micro-card__label">{tool.label}</span>
              </Link>
            ))}
          </div>
        </section>
      </div>

      <section className="card cn-trust-callout" aria-labelledby="thp-how">
        <h2 id="thp-how" style={{ margin: "0 0 1rem", fontSize: "1.15rem" }}>
          How it works
        </h2>
        <p className="muted" style={{ margin: "0 0 1rem" }}>
          We subtract estimated federal income tax (progressive 2025 brackets after the standard
          deduction), FICA payroll taxes, and a flat state/local percentage from your gross annual
          salary.
        </p>
        <ul className="muted" style={{ lineHeight: 1.6, margin: 0, paddingLeft: "1.25rem" }}>
          <li>Pre-tax 401(k), HSA, or health insurance premiums are not modeled</li>
          <li>Child tax credits and itemized deductions are not included</li>
          <li>Consult a tax professional for filing decisions</li>
        </ul>
      </section>
    </>
  );
}
