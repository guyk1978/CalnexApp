/** Node mirror of src/lib/list-link-icons.ts for build scripts */
const ICON_PATHS = {
  loan: '<path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
  mortgage:
    '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/>',
  auto:
    '<path d="M5 17h14"/><path d="M7 17l1-5h8l1 5"/><circle cx="7.5" cy="17.5" r="1.5"/><circle cx="16.5" cy="17.5" r="1.5"/><path d="M5 12h14l-1.5-4h-11z"/>',
  compare: '<path d="M12 3v18"/><path d="M3 8h4v13H3zM17 5h4v16h-4z"/>',
  interest: '<path d="M12 2v4"/><path d="m4.93 4.93 2.83 2.83"/><path d="M2 12h4"/><path d="m4.93 19.07 2.83-2.83"/><path d="M12 18v4"/><path d="m19.07 19.07-2.83-2.83"/><path d="M18 12h4"/><path d="m19.07 4.93-2.83 2.83"/>',
  blog: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8M8 17h5"/>',
  default: '<circle cx="12" cy="12" r="9"/>'
};

function classifyLinkIcon(url, title = "") {
  const u = String(url || "").toLowerCase();
  const t = String(title || "").toLowerCase();
  if (u.includes("car-loan") || t.includes("car ") || t.includes("auto") || t.includes("leasing")) return "auto";
  if (u.includes("mortgage") || t.includes("mortgage") || t.includes("pmi") || t.includes("home equity"))
    return "mortgage";
  if (u.includes("loan-comparison") || t.includes("comparison") || t.includes(" vs ")) return "compare";
  if (u.includes("interest-calculator")) return "interest";
  if (u.includes("/blog/")) return "blog";
  if (u.includes("loan-calculator") || u.includes("/tools/loan") || (t.includes("loan") && !t.includes("student"))) return "loan";
  if (t.includes("interest")) return "interest";
  return "default";
}

function linkIconSvg(kind) {
  return `<svg class="cn-link-list__icon-svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON_PATHS[kind]}</svg>`;
}

function renderIconListItem(item, { showDate = true } = {}) {
  const kind = classifyLinkIcon(item.url, item.title);
  const dateHtml = showDate && item.lastmod ? `<span class="muted cn-link-list__date">${item.lastmod}</span>` : "";
  return `<li class="cn-link-list__item cn-link-list__item--${kind}">
  <div class="cn-link-list__card">
    <span class="cn-link-list__icon-circle cn-link-list__icon-circle--${kind}">${linkIconSvg(kind)}</span>
    <div class="cn-link-list__body">
      <a href="${item.url}">${item.title}</a>
      ${dateHtml}
    </div>
  </div>
</li>`;
}

module.exports = { classifyLinkIcon, linkIconSvg, renderIconListItem };
