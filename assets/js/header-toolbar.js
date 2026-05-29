/**
 * Single-row header utilities — country/currency pills + theme toggle at far right.
 */
(function () {
  /** Shared pill + native select styling (light/dark). */
  const PILL_WRAP_CLASS =
    "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg text-slate-800 dark:text-slate-100";

  const PILL_SELECT_CLASS =
    "cn-header-pill__select text-slate-700 dark:text-slate-200";

  const PILL_OPTION_CLASS =
    "cn-header-pill__option text-slate-700 dark:text-slate-200";

  const renderPillOption = (value, label, isSelected) => {
    const safeValue = String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;");
    const safeLabel = String(label ?? value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;");
    return `<option value="${safeValue}" class="${PILL_OPTION_CLASS}"${isSelected ? " selected" : ""}>${safeLabel}</option>`;
  };

  const ensure = () => {
    const nav = document.querySelector(".site-header .nav");
    if (!nav) return null;

    let actions = nav.querySelector(".cn-header-actions");
    if (!actions) {
      actions = document.createElement("div");
      actions.className = "cn-header-actions";
      nav.appendChild(actions);
    }

    let pills = actions.querySelector(".cn-header-pills");
    if (!pills) {
      pills = document.createElement("div");
      pills.className = "cn-header-pills";
      actions.insertBefore(pills, actions.firstChild);
    }

    return { nav, actions, pills };
  };

  const consolidate = () => {
    const ctx = ensure();
    if (!ctx) return;
    const { nav, actions, pills } = ctx;

    nav.querySelectorAll(".country-selector-wrap").forEach((el) => {
      if (el.parentElement !== pills) pills.appendChild(el);
    });
    nav.querySelectorAll(".currency-selector-wrap").forEach((el) => {
      if (el.parentElement !== pills) pills.appendChild(el);
    });

    const theme = document.getElementById("cn-theme-toggle");
    if (theme && theme.parentElement !== actions) actions.appendChild(theme);

    nav.querySelectorAll(".geo-indicator").forEach((el) => {
      el.hidden = true;
      el.setAttribute("aria-hidden", "true");
    });

    if (nav.lastElementChild !== actions) nav.appendChild(actions);
  };

  window.CalnexHeaderToolbar = {
    ensure,
    consolidate,
    PILL_WRAP_CLASS,
    PILL_SELECT_CLASS,
    PILL_OPTION_CLASS,
    renderPillOption
  };

  const boot = () => {
    ensure();
    consolidate();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  document.addEventListener("cn-header:updated", consolidate);
})();
