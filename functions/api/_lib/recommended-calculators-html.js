/**
 * Worker-safe HTML for blog "Recommended calculators" (no tool-themes.cjs require).
 * Mirrors scripts/tool-themes.cjs renderDefaultRecommendedCalculators().
 */

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const RELATED_SECTION_WRAP_CLASS =
  "py-12 border-t border-slate-100 dark:border-slate-800/60 mt-16 space-y-6";

const RELATED_GRID_CLASS =
  "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 my-6";

const RELATED_LINK_CLASS =
  "flex items-center gap-3 p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800/80 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all group no-underline";

const RELATED_TITLE_CLASS =
  "text-sm font-bold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 transition-colors";

const RELATED_HEADING_CLASS =
  "text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-white";

const RELATED_MINI_ICON_CLASS = {
  housing:
    "w-10 h-10 shrink-0 rounded-lg flex items-center justify-center bg-emerald-50 text-lg font-bold text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400",
  lending:
    "w-10 h-10 shrink-0 rounded-lg flex items-center justify-center bg-indigo-50 text-lg font-bold text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400",
  auto: "w-10 h-10 shrink-0 rounded-lg flex items-center justify-center bg-amber-50 text-lg font-bold text-amber-600 dark:bg-amber-950/40 dark:text-amber-400"
};

const DEFAULT_CALCULATORS = [
  {
    url: "/tools/loan-calculator/",
    title: "Loan Calculator",
    accent: "lending",
    emoji: "💳"
  },
  {
    url: "/tools/mortgage-calculator/",
    title: "Mortgage Calculator",
    accent: "housing",
    emoji: "🏠"
  },
  {
    url: "/tools/car-loan-calculator/",
    title: "Car Loan Calculator",
    accent: "auto",
    emoji: "🚗"
  }
];

function renderRelatedLink(item) {
  const miniIcon = RELATED_MINI_ICON_CLASS[item.accent] || RELATED_MINI_ICON_CLASS.lending;
  return `          <a href="${escapeHtml(item.url)}" class="${RELATED_LINK_CLASS}">
            <div class="${miniIcon}" aria-hidden="true">${item.emoji}</div>
            <span class="${RELATED_TITLE_CLASS}">${escapeHtml(item.title)}</span>
          </a>`;
}

/** Static tool links for blog publish templates (no registry lookup). */
export function renderDefaultRecommendedCalculators(title = "Recommended calculators") {
  const tiles = DEFAULT_CALCULATORS.map((item) => renderRelatedLink(item)).join("\n");
  return `      <section class="${RELATED_SECTION_WRAP_CLASS}">
        <h2 class="${RELATED_HEADING_CLASS}">${escapeHtml(title)}</h2>
        <div class="${RELATED_GRID_CLASS}">
${tiles}
        </div>
      </section>`;
}
