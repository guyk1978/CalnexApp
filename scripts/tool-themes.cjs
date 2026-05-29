/** Shared calculator & blog accent themes for build scripts */

const { toToolSlug } = require("./loan-scenario-core.cjs");

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const ICONS = {
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/>',
  building: '<path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12h4M6 16h4M6 8h4M14 12h4M14 16h4M14 8h4"/>',
  "credit-card": '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>',
  "trending-down": '<polyline points="22 17 13.5 8.5 8.5 13.5 2 7"/><polyline points="16 17 22 17 22 11"/>',
  car: '<path d="M5 17h14"/><path d="M7 17l1-5h8l1 5"/><circle cx="7.5" cy="17.5" r="1.5"/><circle cx="16.5" cy="17.5" r="1.5"/><path d="M5 12h14l-1.5-4h-11z"/>',
  percent: '<line x1="19" x2="5" y1="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>',
  "trending-up": '<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>',
  briefcase: '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><path d="M2 13h20"/>',
  compass: '<circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>',
  scale: '<path d="M12 3v18"/><path d="M3 8h4v13H3zM17 5h4v16h-4z"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8M8 17h5"/>'
};

const NAV_GROUP_THEMES = {
  housing: { key: "housing", label: "Housing", icon: "home" },
  lending: { key: "lending", label: "Loans & credit", icon: "credit-card" },
  auto: { key: "auto", label: "Auto", icon: "car" },
  growth: { key: "growth", label: "Interest & growth", icon: "percent" },
  planning: { key: "planning", label: "Retirement & planning", icon: "compass" }
};

const TOOL_THEMES = {
  "mortgage-calculator": { navGroup: "housing", icon: "home" },
  "rent-vs-buy-calculator": { navGroup: "housing", icon: "building" },
  "loan-calculator": { navGroup: "lending", icon: "credit-card" },
  "debt-payoff": { navGroup: "lending", icon: "trending-down" },
  "loan-comparison": { navGroup: "lending", icon: "scale" },
  "car-loan-calculator": { navGroup: "auto", icon: "car" },
  "interest-calculator": { navGroup: "growth", icon: "trending-up" },
  "retirement-calculator": { navGroup: "planning", icon: "compass" }
};

const SLUG_ALIASES = {
  "rent-vs-buy": "rent-vs-buy-calculator"
};

function resolveToolSlug(slug) {
  return SLUG_ALIASES[slug] || slug;
}

function getToolTheme(slug) {
  const key = resolveToolSlug(slug);
  const tool = TOOL_THEMES[key] || { navGroup: "lending", icon: "credit-card" };
  const group = NAV_GROUP_THEMES[tool.navGroup] || NAV_GROUP_THEMES.lending;
  return {
    slug: key,
    navGroup: tool.navGroup,
    accent: group.key,
    groupLabel: group.label,
    icon: tool.icon || group.icon
  };
}

function classifyBlogCategory(category = "") {
  const c = String(category).toLowerCase();
  if (c.includes("auto") || c.includes("car")) return "auto";
  if (c.includes("retirement") || c.includes("401")) return "planning";
  if (
    c.includes("mortgage") ||
    c.includes("home equity") ||
    c.includes("housing") ||
    c.includes("rent") ||
    c.includes("pmi")
  ) {
    return "housing";
  }
  if (c.includes("interest") || c.includes("growth") || c.includes("invest")) return "growth";
  if (
    c.includes("personal loan") ||
    c.includes("loan basic") ||
    c.includes("repayment") ||
    c.includes("term plan") ||
    c.includes("debt") ||
    c.includes("consolidation") ||
    c.includes("credit")
  ) {
    return "lending";
  }
  return "lending";
}

function renderIconSvg(iconName, size = 16) {
  const paths = ICONS[iconName] || ICONS["credit-card"];
  return `<svg class="cn-theme-icon" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
}

function renderNavToolLink(tool) {
  const slug = tool.slug || tool.path?.replace(/^\/tools\/|\/$/g, "");
  const theme = getToolTheme(slug);
  const name = tool.name || slug;
  const path = tool.path || `/tools/${slug}/`;
  return `<a href="${escapeHtml(path)}" class="cn-nav-dropdown__link cn-nav-dropdown__link--icon" role="menuitem"><span class="cn-nav-tool-icon cn-nav-tool-icon--${theme.accent}">${renderIconSvg(theme.icon, 14)}</span><span>${escapeHtml(name)}</span></a>`;
}

function formatScenarioLabel(entry) {
  const amount =
    entry.loan_amount >= 1000
      ? `$${Math.round(entry.loan_amount / 1000)}k`
      : `$${entry.loan_amount}`;
  const rate = String(entry.interest_rate).replace(/\.0$/, "");
  return `${amount} · ${rate}% · ${entry.loan_term} yr`;
}

function renderNavScenarioLink(entry) {
  const slug = toToolSlug(entry.loan_amount, entry.interest_rate, entry.loan_term);
  const path = `/tools/loan-calculator/${slug}/`;
  return `<a href="${escapeHtml(path)}" class="cn-nav-dropdown__link cn-nav-dropdown__link--scenario" role="menuitem">${escapeHtml(formatScenarioLabel(entry))}</a>`;
}

const TOOL_BADGE_SURFACE_CLASS = {
  housing:
    "bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/60",
  lending:
    "bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60",
  auto: "bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/60",
  growth:
    "bg-purple-50 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-900/60",
  planning: "bg-teal-50 dark:bg-teal-950/40 border border-teal-100 dark:border-teal-900/60"
};

const TOOL_BADGE_ICON_CLASS = {
  housing: "text-emerald-600 dark:text-emerald-400",
  lending: "text-indigo-600 dark:text-indigo-400",
  auto: "text-amber-600 dark:text-amber-400",
  growth: "text-purple-600 dark:text-purple-400",
  planning: "text-teal-600 dark:text-teal-400"
};

const TOOL_PAGE_TITLE_HEAD_CLASS = "cn-tool-page-title__head flex items-center gap-4 sm:gap-5";

const TOOL_BADGE_WRAP_CLASS =
  "cn-tool-badge cn-tool-badge--lg flex shrink-0 w-[113px] h-[113px] items-center justify-center rounded-2xl shadow-sm";

function renderToolBadgeIcon(iconName, accent) {
  const paths = ICONS[iconName] || ICONS["credit-card"];
  const tone = TOOL_BADGE_ICON_CLASS[accent] || TOOL_BADGE_ICON_CLASS.lending;
  return `<svg class="cn-theme-icon cn-tool-badge__icon w-14 h-14 ${tone}" viewBox="0 0 24 24" width="56" height="56" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
}

function renderToolBadge(slug, { large = true } = {}) {
  const theme = getToolTheme(slug);
  const surface = TOOL_BADGE_SURFACE_CLASS[theme.accent] || TOOL_BADGE_SURFACE_CLASS.lending;
  const cls = large
    ? `${TOOL_BADGE_WRAP_CLASS} ${surface}`
    : "cn-tool-badge flex shrink-0 w-12 h-12 items-center justify-center rounded-xl border";
  const icon = large ? renderToolBadgeIcon(theme.icon, theme.accent) : renderIconSvg(theme.icon, 20);
  return `<div class="${cls} cn-tool-badge--${theme.accent}" aria-hidden="true">${icon}</div>`;
}

function renderToolPageTitle(tool) {
  const slug = tool.slug || tool.path?.replace(/^\/tools\/|\/$/g, "");
  const theme = getToolTheme(slug);
  return `<section class="${TOOL_PAGE_TITLE_SECTION_CLASS}">
        <div class="${TOOL_PAGE_TITLE_HEAD_CLASS}">
          ${renderToolBadge(slug)}
          <div class="cn-tool-page-title__copy">
            <span class="cn-blog-category-pill cn-blog-category-pill--${theme.accent}">${theme.groupLabel}</span>
            <h1>${escapeHtml(tool.name)}</h1>
          </div>
        </div>`;
}

/** Main content wrapper below sticky site header (all pages). */
const CN_MAIN_LAYOUT_CLASS =
  "cn-main-layout pt-10 sm:pt-14 px-4 sm:px-6 max-w-7xl mx-auto";

/** Hero / page-title intro block (H1, subtitle, badges). */
const CN_PAGE_HERO_CLASS = "cn-page-hero space-y-4 text-center sm:text-left";

const TOOL_PAGE_TITLE_SECTION_CLASS = `page-title cn-tool-page-title ${CN_PAGE_HERO_CLASS}`;

/** Title + quick-action row — normal flex column flow (no overlap). */
const CALCULATOR_HERO_STACK_CLASS =
  "cn-calculator-hero-stack w-full flex flex-col gap-6 my-6 relative block";

const TOOLS_GRID_CLASS =
  "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6";

const BLOG_GRID_CLASS =
  "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6";

/** Page-level section wrapper (tools hub, blog grids, homepage listings). */
const LISTING_SECTION_WRAP_CLASS =
  "py-16 md:py-24 px-4 sm:px-6 max-w-7xl mx-auto space-y-16";

/** 4-column hub / blog index grid (single source for build scripts). */
const HUB_GRID_CLASS =
  "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8";

const HUB_CARD_LINK_CLASS =
  "group flex flex-col items-center text-center p-8 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800/60 hover:-translate-y-1 transition-all no-underline";

const HUB_CARD_TITLE_CLASS =
  "text-lg font-extrabold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors";

const HUB_ICON_BADGE_CLASS = {
  housing:
    "w-14 h-14 rounded-2xl flex items-center justify-center mb-4 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400",
  lending:
    "w-14 h-14 rounded-2xl flex items-center justify-center mb-4 bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400",
  auto: "w-14 h-14 rounded-2xl flex items-center justify-center mb-4 bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400",
  growth:
    "w-14 h-14 rounded-2xl flex items-center justify-center mb-4 bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400",
  planning:
    "w-14 h-14 rounded-2xl flex items-center justify-center mb-4 bg-teal-50 text-teal-600 dark:bg-teal-950/50 dark:text-teal-400"
};

const HUB_BLOG_PILL_CLASS = {
  housing:
    "mb-3 inline-flex rounded-md bg-emerald-100 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200",
  lending:
    "mb-3 inline-flex rounded-md bg-indigo-100 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-200",
  auto: "mb-3 inline-flex rounded-md bg-amber-100 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-amber-800 dark:bg-amber-900/60 dark:text-amber-200",
  growth:
    "mb-3 inline-flex rounded-md bg-purple-100 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-purple-800 dark:bg-purple-900/60 dark:text-purple-200",
  planning:
    "mb-3 inline-flex rounded-md bg-teal-100 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-teal-800 dark:bg-teal-900/60 dark:text-teal-200"
};

/** Listing sections (recent updates, featured pages) — same grid as hub. */
const LISTING_GRID_CLASS = HUB_GRID_CLASS;

const LISTING_HEADING_CLASS =
  "text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-white mb-10 md:mb-12";

/** Related tools / categories footer (4-col micro-card grid). */
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

const ACCENT_EMOJI = {
  housing: "🏠",
  lending: "💳",
  auto: "🚗",
  growth: "📊",
  planning: "🧭"
};

const DASHBOARD_MINI_ICON_CLASS = {
  housing:
    "w-10 h-10 shrink-0 rounded-lg flex items-center justify-center bg-emerald-50 text-lg font-bold text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400",
  lending:
    "w-10 h-10 shrink-0 rounded-lg flex items-center justify-center bg-indigo-50 text-lg font-bold text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400",
  auto: "w-10 h-10 shrink-0 rounded-lg flex items-center justify-center bg-amber-50 text-lg font-bold text-amber-600 dark:bg-amber-950/40 dark:text-amber-400",
  growth:
    "w-10 h-10 shrink-0 rounded-lg flex items-center justify-center bg-blue-50 text-lg font-bold text-blue-600 dark:bg-blue-950/40 dark:text-blue-400",
  planning:
    "w-10 h-10 shrink-0 rounded-lg flex items-center justify-center bg-teal-50 text-lg font-bold text-teal-600 dark:bg-teal-950/40 dark:text-teal-400"
};

const RELATED_MINI_ICON_CLASS = DASHBOARD_MINI_ICON_CLASS;

/** Category-grouped tools catalog (tools hub bottom / homepage). */
const DASHBOARD_WRAP_CLASS =
  `cn-tools-dashboard ${RELATED_SECTION_WRAP_CLASS} px-4 sm:px-6 max-w-7xl mx-auto`;

const DASHBOARD_HEADING_CLASS =
  "text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-8 md:mb-10";

const DASHBOARD_CATEGORY_TITLE_CLASS =
  "text-xl font-extrabold text-slate-900 dark:text-white mb-4 mt-8 flex items-center gap-2";

const DASHBOARD_CATEGORY_GRID_CLASS = RELATED_GRID_CLASS;

const DASHBOARD_MICRO_CARD_LINK_CLASS = `cn-dashboard-micro-card ${RELATED_LINK_CLASS}`;

const DASHBOARD_MICRO_CARD_TITLE_CLASS = RELATED_TITLE_CLASS;

const NAV_GROUP_ORDER = ["housing", "lending", "auto", "growth", "planning"];

const TOOL_ICON_BADGE_CLASS = {
  housing:
    "w-14 h-14 rounded-2xl flex items-center justify-center mb-3 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400",
  lending:
    "w-14 h-14 rounded-2xl flex items-center justify-center mb-3 bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400",
  auto: "w-14 h-14 rounded-2xl flex items-center justify-center mb-3 bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400",
  growth:
    "w-14 h-14 rounded-2xl flex items-center justify-center mb-3 bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400",
  planning:
    "w-14 h-14 rounded-2xl flex items-center justify-center mb-3 bg-teal-50 text-teal-600 dark:bg-teal-950/50 dark:text-teal-400"
};

const TOOL_TILE_LINK_CLASS =
  "group block rounded-xl border border-slate-200 bg-white p-4 no-underline transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-900";

const TOOL_TILE_TITLE_CLASS =
  "text-lg font-bold text-slate-900 transition-colors group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400";

const BLOG_TILE_CLASS = {
  housing:
    "group block rounded-xl border-2 border-t-4 border-emerald-200 border-t-emerald-500 bg-emerald-50/60 p-4 no-underline transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-emerald-800 dark:bg-emerald-950/30",
  lending:
    "group block rounded-xl border-2 border-t-4 border-indigo-200 border-t-indigo-500 bg-indigo-50/60 p-4 no-underline transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-indigo-800 dark:bg-indigo-950/30",
  auto: "group block rounded-xl border-2 border-t-4 border-amber-200 border-t-amber-500 bg-amber-50/60 p-4 no-underline transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-amber-800 dark:bg-amber-950/30",
  growth:
    "group block rounded-xl border-2 border-t-4 border-purple-200 border-t-purple-500 bg-purple-50/60 p-4 no-underline transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-purple-800 dark:bg-purple-950/30",
  planning:
    "group block rounded-xl border-2 border-t-4 border-teal-200 border-t-teal-500 bg-teal-50/60 p-4 no-underline transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-teal-800 dark:bg-teal-950/30"
};

const BLOG_PILL_CLASS = {
  housing:
    "mb-3 inline-flex rounded-md bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200",
  lending:
    "mb-3 inline-flex rounded-md bg-indigo-100 px-2.5 py-1 text-xs font-semibold text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-200",
  auto: "mb-3 inline-flex rounded-md bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-900/60 dark:text-amber-200",
  growth:
    "mb-3 inline-flex rounded-md bg-purple-100 px-2.5 py-1 text-xs font-semibold text-purple-800 dark:bg-purple-900/60 dark:text-purple-200",
  planning:
    "mb-3 inline-flex rounded-md bg-teal-100 px-2.5 py-1 text-xs font-semibold text-teal-800 dark:bg-teal-900/60 dark:text-teal-200"
};

const BLOG_TILE_TITLE_CLASS =
  "mb-2 text-xl font-extrabold tracking-tight text-slate-900 transition-colors group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400";

function renderBlogCategoryPill(category) {
  const accent = classifyBlogCategory(category);
  return `<span class="${BLOG_PILL_CLASS[accent] || BLOG_PILL_CLASS.lending}">${escapeHtml(category)}</span>`;
}

function renderBlogCard(post) {
  const accent = classifyBlogCategory(post.category);
  const slug = post.slug;
  const title = post.title || slug;
  const category = post.category || "Blog";
  const tileClass = BLOG_TILE_CLASS[accent] || BLOG_TILE_CLASS.lending;
  return `        <a href="/blog/${escapeHtml(slug)}/" class="${tileClass}">
          ${renderBlogCategoryPill(category)}
          <h3 class="${BLOG_TILE_TITLE_CLASS}">${escapeHtml(title)}</h3>
        </a>`;
}

function slugFromToolUrl(url = "") {
  const match = String(url).match(/\/tools\/([^/]+)/);
  return match ? match[1] : "";
}

function resolveToolNavGroup(tool) {
  const slug = tool.slug || slugFromToolUrl(tool.path || tool.url);
  const theme = getToolTheme(slug || "loan-calculator");
  return tool.navGroup || theme.navGroup || "lending";
}

function groupToolsByNavGroup(tools) {
  const buckets = Object.fromEntries(NAV_GROUP_ORDER.map((key) => [key, []]));
  for (const tool of tools || []) {
    const key = resolveToolNavGroup(tool);
    const bucket = buckets[key] || buckets.lending;
    bucket.push(tool);
  }
  return NAV_GROUP_ORDER.filter((key) => buckets[key].length > 0).map((key) => ({
    key,
    ...NAV_GROUP_THEMES[key],
    tools: buckets[key]
  }));
}

/** Interactive micro-card for category dashboards (icon + title only). */
function renderDashboardMicroCard(item, accentOverride) {
  const url = normalizeToolPath(item);
  const slug = item.slug || slugFromToolUrl(url);
  const accent = accentOverride || resolveToolNavGroup(item);
  const title = item.name || item.title || slug;
  const emoji = ACCENT_EMOJI[accent] || "📊";
  const iconClass = DASHBOARD_MINI_ICON_CLASS[accent] || DASHBOARD_MINI_ICON_CLASS.lending;
  return `          <a href="${escapeHtml(url)}" class="${DASHBOARD_MICRO_CARD_LINK_CLASS}">
            <div class="${iconClass}" aria-hidden="true">${emoji}</div>
            <span class="${DASHBOARD_MICRO_CARD_TITLE_CLASS}">${escapeHtml(title)}</span>
          </a>`;
}

function renderDashboardCategoryPanel(groupKey, title, items) {
  const accent = groupKey || "lending";
  const emoji = ACCENT_EMOJI[accent] || "📊";
  const cards = (items || []).map((item) => renderDashboardMicroCard(item)).join("\n");
  if (!cards.trim()) return "";
  return `        <section class="cn-tools-dashboard__category">
          <h3 class="${DASHBOARD_CATEGORY_TITLE_CLASS}">
            <span aria-hidden="true">${emoji}</span>
            <span>${escapeHtml(title)}</span>
          </h3>
          <div class="${DASHBOARD_CATEGORY_GRID_CLASS}">
${cards}
          </div>
        </section>`;
}

/** Full tools catalog grouped by nav category. */
function renderToolsCatalogDashboard(tools, options = {}) {
  const { heading = "Explore calculators", includeScenarios = [] } = options;
  const groups = groupToolsByNavGroup(tools);
  const categoryPanels = groups
    .map((group) =>
      renderDashboardCategoryPanel(group.key, `${group.label} calculators`, group.tools, group.key)
    )
    .join("\n");

  const scenarioPanel =
    includeScenarios.length > 0
      ? renderDashboardCategoryPanel("lending", "Popular loan scenarios", includeScenarios)
      : "";

  return `<div id="cn-tools-catalog" class="${DASHBOARD_WRAP_CLASS}" aria-live="polite">
        <h2 class="${DASHBOARD_HEADING_CLASS}">${escapeHtml(heading)}</h2>
${categoryPanels}
${scenarioPanel}
      </div>`;
}

function slugFromBlogUrl(url = "") {
  const match = String(url).match(/\/blog\/([^/]+)/);
  return match ? match[1] : "";
}

function resolveRelatedAccent(item) {
  const url = normalizeListingUrl(item.url || item.path);
  if (item.type === "blog" || url.includes("/blog/")) {
    return classifyBlogCategory(item.category || item.title || "");
  }
  const slug = item.slug || slugFromToolUrl(url) || "loan-calculator";
  return getToolTheme(slug).accent;
}

/** Mini-card link for related tools / recommended calculators (icon + title only). */
function renderRelatedLink(item) {
  const url = normalizeListingUrl(item.url || item.path);
  const title = item.title || item.name || url;
  const accent = resolveRelatedAccent(item);
  const miniIcon = RELATED_MINI_ICON_CLASS[accent] || RELATED_MINI_ICON_CLASS.lending;
  const emoji = ACCENT_EMOJI[accent] || "📊";
  return `          <a href="${escapeHtml(url)}" class="${RELATED_LINK_CLASS}">
            <div class="${miniIcon}" aria-hidden="true">${emoji}</div>
            <span class="${RELATED_TITLE_CLASS}">${escapeHtml(title)}</span>
          </a>`;
}

function renderRelatedGrid(items) {
  const tiles = (items || []).map((item) => renderRelatedLink(item)).join("\n");
  return `        <div class="${RELATED_GRID_CLASS}">
${tiles}
        </div>`;
}

function renderRelatedSection(title, items, options = {}) {
  const wrapClass = options.wrapClass || RELATED_SECTION_WRAP_CLASS;
  const headingClass = options.headingClass || RELATED_HEADING_CLASS;
  return `      <section class="${wrapClass}">
        <h2 class="${headingClass}">${escapeHtml(title)}</h2>
${renderRelatedGrid(items)}
      </section>`;
}

/** Static tool links for blog publish templates (no registry lookup). */
function renderDefaultRecommendedCalculators(title = "Recommended calculators") {
  return renderRelatedSection(title, [
    { url: "/tools/loan-calculator/", title: "Loan Calculator", slug: "loan-calculator" },
    { url: "/tools/mortgage-calculator/", title: "Mortgage Calculator", slug: "mortgage-calculator" },
    { url: "/tools/car-loan-calculator/", title: "Car Loan Calculator", slug: "car-loan-calculator" }
  ]);
}

function renderToolGridTile(item) {
  const path = normalizeToolPath(item);
  const slug = item.slug || slugFromToolUrl(path);
  const theme = getToolTheme(slug || "loan-calculator");
  const title = item.name || item.title || slug;
  const iconBadge = TOOL_ICON_BADGE_CLASS[theme.accent] || TOOL_ICON_BADGE_CLASS.lending;
  return `          <a href="${escapeHtml(path)}" class="${TOOL_TILE_LINK_CLASS}">
            <div class="${iconBadge}">${renderIconSvg(theme.icon, 26)}</div>
            <h3 class="${TOOL_TILE_TITLE_CLASS}">${escapeHtml(title)}</h3>
          </a>`;
}

function normalizeToolPath(item) {
  const raw = item.path || item.url || "";
  if (!raw) return `/tools/${item.slug || ""}/`;
  return raw.startsWith("/") ? (raw.endsWith("/") ? raw : `${raw}/`) : `/${raw}`;
}

function renderToolHubCard(tool) {
  return renderHubToolCard(tool);
}

/** Centered hub tile: icon + title only (no description). */
function renderHubToolCard(tool) {
  const url = normalizeToolPath(tool);
  const slug = tool.slug || slugFromToolUrl(url);
  const theme = getToolTheme(slug || "loan-calculator");
  const title = tool.name || tool.title || slug;
  const iconBadge = HUB_ICON_BADGE_CLASS[theme.accent] || HUB_ICON_BADGE_CLASS.lending;
  return `          <a href="${escapeHtml(url)}" class="${HUB_CARD_LINK_CLASS}">
            <div class="${iconBadge}">${renderIconSvg(theme.icon, 26)}</div>
            <h3 class="${HUB_CARD_TITLE_CLASS}">${escapeHtml(title)}</h3>
          </a>`;
}

/** Centered blog index tile: category badge + title only (no excerpt). */
function renderHubBlogCard(post) {
  const slug = post.slug;
  const title = post.title || slug;
  const category = post.category || "Blog";
  const accent = classifyBlogCategory(category);
  const pill = HUB_BLOG_PILL_CLASS[accent] || HUB_BLOG_PILL_CLASS.lending;
  return `          <a href="/blog/${escapeHtml(slug)}/" class="${HUB_CARD_LINK_CLASS}">
            <span class="${pill}">${escapeHtml(category)}</span>
            <h3 class="${HUB_CARD_TITLE_CLASS}">${escapeHtml(title)}</h3>
          </a>`;
}

function normalizeListingUrl(url = "") {
  const raw = String(url || "");
  if (!raw) return "/";
  const withSlash = raw.startsWith("/") ? raw : `/${raw}`;
  return withSlash.endsWith("/") ? withSlash : `${withSlash}/`;
}

/** Icon + bold title tile for registry / mixed listing rows (hub card style). */
function renderListingGridTile(item) {
  const url = normalizeListingUrl(item.url || item.path);
  const title = item.title || item.name || url;

  if (item.type === "blog" || url.includes("/blog/")) {
    return renderHubBlogCard({
      slug: item.slug || slugFromBlogUrl(url),
      title,
      category: item.category || "Blog"
    });
  }

  return renderHubToolCard({
    ...item,
    path: url,
    name: title,
    slug: item.slug || slugFromToolUrl(url) || "loan-calculator"
  });
}

/** Blog post tile for listing grids — icon + title only (no category pill or excerpt). */
function renderBlogListingTile(post) {
  const slug = post.slug;
  const title = post.title || slug;
  const accent = classifyBlogCategory(post.category || title);
  const iconBadge = TOOL_ICON_BADGE_CLASS[accent] || TOOL_ICON_BADGE_CLASS.lending;
  return `          <a href="/blog/${escapeHtml(slug)}/" class="${TOOL_TILE_LINK_CLASS}">
            <div class="${iconBadge}">${renderIconSvg("file", 26)}</div>
            <h3 class="${TOOL_TILE_TITLE_CLASS}">${escapeHtml(title)}</h3>
          </a>`;
}

function renderListingSectionInner(title, tilesHtml) {
  return `<section>
        <h2 class="${LISTING_HEADING_CLASS}">${escapeHtml(title)}</h2>
        <div class="${HUB_GRID_CLASS}">
${tilesHtml}
        </div>
      </section>`;
}

function renderListingSection(title, tilesHtml) {
  return `<div class="${LISTING_SECTION_WRAP_CLASS}">
      <section>
        <h2 class="${LISTING_HEADING_CLASS}">${escapeHtml(title)}</h2>
        <div class="${HUB_GRID_CLASS}">
${tilesHtml}
        </div>
      </section>
      </div>`;
}

/** Fintech-style quick-action widgets below calculator titles. */
const QUICK_ACTION_CARD_CLASS =
  "cn-quick-action-card relative flex flex-col items-center justify-center p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-sm hover:shadow-md transition-shadow group text-center no-underline";

const QUICK_ACTION_BADGE_BASE =
  "w-12 h-12 rounded-xl flex items-center justify-center mb-3 font-bold text-xl";

const QUICK_ACTION_SECTION_CLASS = "cn-quick-actions relative block w-full mt-2";

const QUICK_ACTION_GRID_CLASS =
  "cn-quick-actions__grid grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mt-6 sm:mt-8 w-full";

const QUICK_ACTION_HEADING_CLASS =
  "text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-white mb-4";

const QUICK_ACTION_THEME_BADGE = {
  blue: "bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400",
  emerald: "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400",
  indigo: "bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400",
  amber: "bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400",
  purple: "bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400",
  rose: "bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400",
  teal: "bg-teal-500/10 text-teal-600 dark:bg-teal-500/20 dark:text-teal-400"
};

function getQuickActionCatalog() {
  return {
    moreTools: { label: "More tools", path: "/tools/", emoji: "🎛️", theme: "blue" },
    dashboard: { label: "Open Dashboard", path: "/dashboard/", emoji: "📊", theme: "emerald" },
    dashboardShort: { label: "Dashboard", path: "/dashboard/", emoji: "📊", theme: "emerald" },
    switchMortgage: {
      label: "Switch to Mortgage Calculator",
      path: "/tools/mortgage-calculator/",
      emoji: "🏠",
      theme: "indigo"
    },
    compareLoans: {
      label: "Compare Loan Scenarios",
      path: "/tools/loan-calculator/",
      emoji: "⚖️",
      theme: "amber"
    },
    checkAffordability: {
      label: "Check Affordability",
      path: "/tools/mortgage-calculator/",
      emoji: "🛡️",
      theme: "purple"
    },
    optimizePayments: {
      label: "Optimize Payments",
      path: "/tools/loan-calculator/",
      emoji: "⚡",
      theme: "rose"
    },
    loanCalculator: { label: "Loan Calculator", path: "/tools/loan-calculator/", emoji: "💳", theme: "indigo" },
    mortgageCalculator: {
      label: "Mortgage Calculator",
      path: "/tools/mortgage-calculator/",
      emoji: "🏠",
      theme: "indigo"
    },
    carLoanCalculator: {
      label: "Car Loan Calculator",
      path: "/tools/car-loan-calculator/",
      emoji: "🚗",
      theme: "amber"
    },
    rentVsBuy: { label: "Rent vs. Buy", path: "/tools/rent-vs-buy/", emoji: "🏘️", theme: "emerald" },
    allCalculators: { label: "All calculators", path: "/tools/", emoji: "🎛️", theme: "blue" },
    loanComparison: {
      label: "Loan offer comparison",
      path: "/tools/loan-comparison/",
      emoji: "⚖️",
      theme: "amber"
    },
    debtPayoff: { label: "Debt payoff planner", path: "/tools/debt-payoff/", emoji: "📉", theme: "indigo" },
    openLoanCalculator: {
      label: "Open Loan Calculator",
      path: "/tools/loan-calculator/",
      emoji: "💳",
      theme: "indigo"
    },
    openMortgageCalculator: {
      label: "Open Mortgage Calculator",
      path: "/tools/mortgage-calculator/",
      emoji: "🏠",
      theme: "indigo"
    },
    openRetirementCalculator: {
      label: "Open Retirement Calculator",
      path: "/tools/retirement-calculator/",
      emoji: "🧭",
      theme: "teal"
    },
    interestCalculator: {
      label: "Interest Calculator",
      path: "/tools/interest-calculator/",
      emoji: "📈",
      theme: "purple"
    },
    retirementCalculator: {
      label: "Retirement Calculator",
      path: "/tools/retirement-calculator/",
      emoji: "🧭",
      theme: "teal"
    }
  };
}

const TOOL_QUICK_ACTION_PRESETS = {
  "loan-calculator": {
    primary: {
      title: "More tools",
      keys: ["moreTools", "dashboard", "switchMortgage", "compareLoans", "checkAffordability", "optimizePayments"]
    },
    connected: {
      title: "Connected Planning Suite",
      keys: ["dashboardShort", "loanCalculator", "mortgageCalculator", "carLoanCalculator"]
    }
  },
  "mortgage-calculator": {
    primary: {
      title: "Cross-Tool Navigation",
      keys: ["moreTools", "dashboard", "switchMortgage", "compareLoans", "checkAffordability", "optimizePayments"]
    },
    connected: {
      title: "Connected Planning Suite",
      keys: ["dashboardShort", "loanCalculator", "mortgageCalculator", "carLoanCalculator"]
    }
  },
  "car-loan-calculator": {
    primary: {
      title: "Cross-Tool Navigation",
      keys: ["moreTools", "dashboard", "switchMortgage", "compareLoans", "checkAffordability", "optimizePayments"]
    }
  },
  "rent-vs-buy-calculator": {
    primary: {
      title: "More tools",
      keys: ["mortgageCalculator", "loanCalculator", "rentVsBuy", "allCalculators"]
    }
  },
  "debt-payoff": {
    primary: {
      title: "Related tools",
      keys: ["loanCalculator", "loanComparison", "carLoanCalculator", "allCalculators"]
    }
  },
  "loan-comparison": {
    primary: {
      title: "Related tools",
      keys: ["loanCalculator", "carLoanCalculator", "mortgageCalculator", "allCalculators"]
    }
  },
  "interest-calculator": {
    primary: {
      title: "Cross-Tool Navigation",
      keys: ["openLoanCalculator", "openMortgageCalculator", "openRetirementCalculator", "dashboard"]
    }
  },
  "retirement-calculator": {
    primary: {
      title: "Connected Planning Tools",
      keys: ["interestCalculator", "mortgageCalculator", "dashboardShort"]
    }
  }
};

function resolveQuickActions(actionKeys) {
  const catalog = getQuickActionCatalog();
  return (actionKeys || []).map((key) => catalog[key]).filter(Boolean);
}

function renderQuickActionCard(action) {
  const themeClass = QUICK_ACTION_THEME_BADGE[action.theme] || QUICK_ACTION_THEME_BADGE.blue;
  const path = action.path || "/tools/";
  const href = path.endsWith("/") ? path : `${path}/`;
  return `          <a href="${escapeHtml(href)}" class="${QUICK_ACTION_CARD_CLASS}" data-shared-link data-target-path="${escapeHtml(href)}">
            <div class="${QUICK_ACTION_BADGE_BASE} ${themeClass}" aria-hidden="true">${action.emoji}</div>
            <span class="text-sm font-extrabold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 transition-colors">${escapeHtml(action.label)}</span>
          </a>`;
}

function renderQuickActionGrid(actionKeys) {
  const cards = resolveQuickActions(actionKeys).map((action) => renderQuickActionCard(action)).join("\n");
  return `        <div class="${QUICK_ACTION_GRID_CLASS}">
${cards}
        </div>`;
}

function renderQuickActionBlock(title, actionKeys, markers = { start: "CN_QUICK_ACTIONS_START", end: "CN_QUICK_ACTIONS_END" }) {
  const grid = renderQuickActionGrid(actionKeys);
  if (!grid.includes("cn-quick-action-card")) return "";
  return `      <!-- ${markers.start} -->
      <section class="${QUICK_ACTION_SECTION_CLASS}">
        <h2 class="${QUICK_ACTION_HEADING_CLASS}">${escapeHtml(title)}</h2>
${grid}
      </section>
      <!-- ${markers.end} -->`;
}

function getToolQuickActionPreset(slug) {
  const key = resolveToolSlug(slug);
  return TOOL_QUICK_ACTION_PRESETS[key] || TOOL_QUICK_ACTION_PRESETS["loan-calculator"];
}

function renderToolQuickActions(slug) {
  const preset = getToolQuickActionPreset(slug);
  if (!preset?.primary) return "";
  return renderQuickActionBlock(preset.primary.title, preset.primary.keys);
}

function renderToolConnectedSuite(slug) {
  const preset = getToolQuickActionPreset(slug);
  if (!preset?.connected) return "";
  return renderQuickActionBlock(preset.connected.title, preset.connected.keys, {
    start: "CN_CONNECTED_SUITE_START",
    end: "CN_CONNECTED_SUITE_END"
  });
}

/** Context CTA below calculator inputs — flex row/col, no overlapping absolute layout. */
const TOOL_CONTEXT_CTA_WRAP_CLASS =
  "cn-tool-context-cta card flex flex-col sm:flex-row items-center sm:items-start justify-between gap-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800/80 w-full relative block";

const TOOL_CONTEXT_CTA_BODY_CLASS = "cn-tool-context-cta__body space-y-1 min-w-0 flex-1";

const TOOL_CONTEXT_CTA_BTN_CLASS = "btn btn-primary cn-tool-context-cta__btn flex-shrink-0 w-full sm:w-auto";

const TOOL_CONTEXT_CTA_ACTIONS_CLASS =
  "cn-tool-context-cta__actions flex flex-shrink-0 flex-col sm:flex-row gap-2 w-full sm:w-auto";

const TOOL_CONTEXT_CTA_PRESETS = {
  "loan-calculator": {
    title: "Planning a Home Purchase?",
    body:
      "For property tax, insurance, and 15 vs 30 year affordability planning, switch to the dedicated mortgage tool.",
    href: "/tools/mortgage-calculator/",
    label: "Open Mortgage Calculator"
  },
  "debt-payoff": {
    title: "How snowball vs. avalanche works",
    bodyHtml: `<strong>Snowball</strong> pays extra toward the smallest balance first for quick psychological wins.
          <strong>Avalanche</strong> attacks the highest APR first to minimize interest mathematically. Both assume you pay
          at least every minimum and roll freed payments forward as debts are eliminated.`,
    href: "/tools/loan-calculator/",
    label: "Open loan calculator"
  },
  "loan-comparison": {
    title: "How we compare offers",
    body:
      "Monthly payments use standard amortization. Total out-of-pocket adds upfront fees to all payments. Effective APR solves for the rate that matches your net proceeds after fees to the payment stream—so a low headline rate with high fees cannot hide.",
    href: "/tools/loan-calculator/",
    label: "Open full loan calculator"
  },
  "loan-scenario-plan": {
    title: "Plan this loan your way",
    body:
      "Customize assumptions like extra monthly payments, lump sums, payoff strategy, and amortization schedule.",
    actionsHtml: `<a class="btn btn-primary flex-shrink-0 w-full sm:w-auto" href="/tools/loan-calculator/">Customize this loan</a>
          <a class="btn btn-ghost flex-shrink-0 w-full sm:w-auto" href="/blog/">Read loan planning guides</a>`
  },
  "loan-scenario-try": {
    title: "Try this scenario in the calculator",
    body: "Open the live loan calculator to adjust amount, rate, term, and extra payments for this scenario.",
    href: "/tools/loan-calculator/",
    label: "Open calculator"
  },
  "blog-next-step": {
    title: "Next step: run a live scenario",
    body: "Apply this guide directly in the calculator to test your assumptions.",
    href: "/tools/loan-calculator/",
    label: "Open Loan Calculator"
  }
};

function renderToolContextCta({ title, body, bodyHtml, href, label, actionsHtml }) {
  const paragraph =
    bodyHtml != null ? bodyHtml : escapeHtml(body || "");
  const bodyBlock = `<div class="${TOOL_CONTEXT_CTA_BODY_CLASS}">
          <h2 class="m-0 text-lg font-semibold text-slate-900 dark:text-white">${escapeHtml(title)}</h2>
          <p class="muted m-0">${paragraph}</p>
        </div>`;

  const ctaColumn = actionsHtml
    ? `<div class="${TOOL_CONTEXT_CTA_ACTIONS_CLASS}">
${actionsHtml}
        </div>`
    : `<a class="${TOOL_CONTEXT_CTA_BTN_CLASS}" href="${escapeHtml(href || "/tools/")}">${escapeHtml(label || "Open calculator")}</a>`;

  return `      <!-- CN_TOOL_CONTEXT_CTA_START -->
      <section class="${TOOL_CONTEXT_CTA_WRAP_CLASS}" aria-label="${escapeHtml(title)}">
${bodyBlock}
        ${ctaColumn}
      </section>
      <!-- CN_TOOL_CONTEXT_CTA_END -->`;
}

function renderToolContextCtaForSlug(slug) {
  const preset = TOOL_CONTEXT_CTA_PRESETS[resolveToolSlug(slug)];
  if (!preset) return "";
  return renderToolContextCta(preset);
}

function getToolContextCtaPreset(key) {
  return TOOL_CONTEXT_CTA_PRESETS[key] || null;
}

module.exports = {
  ICONS,
  NAV_GROUP_THEMES,
  TOOL_THEMES,
  TOOLS_GRID_CLASS,
  BLOG_GRID_CLASS,
  CN_MAIN_LAYOUT_CLASS,
  CN_PAGE_HERO_CLASS,
  TOOL_PAGE_TITLE_SECTION_CLASS,
  TOOL_PAGE_TITLE_HEAD_CLASS,
  TOOL_BADGE_WRAP_CLASS,
  TOOL_BADGE_SURFACE_CLASS,
  TOOL_BADGE_ICON_CLASS,
  HUB_GRID_CLASS,
  HUB_CARD_LINK_CLASS,
  HUB_CARD_TITLE_CLASS,
  renderHubToolCard,
  renderHubBlogCard,
  LISTING_GRID_CLASS,
  LISTING_SECTION_WRAP_CLASS,
  LISTING_HEADING_CLASS,
  TOOL_ICON_BADGE_CLASS,
  TOOL_TILE_LINK_CLASS,
  TOOL_TILE_TITLE_CLASS,
  BLOG_TILE_CLASS,
  BLOG_PILL_CLASS,
  BLOG_TILE_TITLE_CLASS,
  getToolTheme,
  classifyBlogCategory,
  renderIconSvg,
  renderNavToolLink,
  renderNavScenarioLink,
  formatScenarioLabel,
  renderToolBadge,
  renderToolPageTitle,
  renderBlogCategoryPill,
  renderBlogCard,
  renderToolGridTile,
  renderToolHubCard,
  renderListingGridTile,
  renderBlogListingTile,
  renderListingSection,
  renderListingSectionInner,
  renderRelatedLink,
  renderRelatedGrid,
  renderRelatedSection,
  renderDefaultRecommendedCalculators,
  RELATED_SECTION_WRAP_CLASS,
  RELATED_GRID_CLASS,
  RELATED_LINK_CLASS,
  RELATED_TITLE_CLASS,
  RELATED_HEADING_CLASS,
  DASHBOARD_WRAP_CLASS,
  DASHBOARD_CATEGORY_GRID_CLASS,
  DASHBOARD_MICRO_CARD_LINK_CLASS,
  renderDashboardMicroCard,
  renderDashboardCategoryPanel,
  renderToolsCatalogDashboard,
  groupToolsByNavGroup,
  resolveToolSlug,
  QUICK_ACTION_CARD_CLASS,
  QUICK_ACTION_GRID_CLASS,
  QUICK_ACTION_SECTION_CLASS,
  CALCULATOR_HERO_STACK_CLASS,
  getQuickActionCatalog,
  TOOL_QUICK_ACTION_PRESETS,
  renderQuickActionCard,
  renderQuickActionGrid,
  renderQuickActionBlock,
  renderToolQuickActions,
  renderToolConnectedSuite,
  getToolQuickActionPreset,
  TOOL_CONTEXT_CTA_WRAP_CLASS,
  TOOL_CONTEXT_CTA_BODY_CLASS,
  TOOL_CONTEXT_CTA_BTN_CLASS,
  TOOL_CONTEXT_CTA_ACTIONS_CLASS,
  TOOL_CONTEXT_CTA_PRESETS,
  renderToolContextCta,
  renderToolContextCtaForSlug,
  getToolContextCtaPreset
};
