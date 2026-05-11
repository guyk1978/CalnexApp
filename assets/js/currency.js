const CurrencyLayer = (() => {
  const STORAGE_KEY = "calnex_currency";
  const DEFAULT_CURRENCY = "USD";
  const RATES_FROM_USD = {
    USD: 1,
    EUR: 0.92,
    GBP: 0.79,
    ILS: 3.66
  };
  const SYMBOLS = {
    USD: "$",
    EUR: "€",
    GBP: "£",
    ILS: "₪"
  };
  const LOCALES = {
    USD: "en-US",
    EUR: "de-DE",
    GBP: "en-GB",
    ILS: "he-IL"
  };
  const SUPPORTED = Object.keys(RATES_FROM_USD);

  const normalizeCurrency = (currency) => {
    const code = String(currency || DEFAULT_CURRENCY).toUpperCase();
    return SUPPORTED.includes(code) ? code : DEFAULT_CURRENCY;
  };

  const getSelectedCurrency = () => {
    if (typeof SharedState !== "undefined") {
      const stateCurrency = SharedState.getState().currency;
      if (stateCurrency) return normalizeCurrency(stateCurrency);
    }
    const local = window.localStorage.getItem(STORAGE_KEY);
    return normalizeCurrency(local);
  };

  const convertFromUsd = (value, currency = getSelectedCurrency()) => {
    const nextCurrency = normalizeCurrency(currency);
    const rate = RATES_FROM_USD[nextCurrency] || 1;
    return (Number(value) || 0) * rate;
  };

  const formatCurrency = (value, currency = getSelectedCurrency()) => {
    const nextCurrency = normalizeCurrency(currency);
    const locale = LOCALES[nextCurrency] || "en-US";
    const converted = convertFromUsd(value, nextCurrency);
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: nextCurrency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(converted);
  };

  const setCurrency = (currency) => {
    const nextCurrency = normalizeCurrency(currency);
    window.localStorage.setItem(STORAGE_KEY, nextCurrency);
    if (typeof SharedState !== "undefined") {
      SharedState.setState({ currency: nextCurrency });
    }
    document.dispatchEvent(new CustomEvent("currency:changed", { detail: { currency: nextCurrency } }));
    return nextCurrency;
  };

  const renderSelector = (container, idPrefix) => {
    if (!container) return null;
    const existing = container.querySelector(".currency-selector-wrap");
    if (existing) return existing.querySelector("select");
    const selected = getSelectedCurrency();
    const wrapper = document.createElement("div");
    wrapper.className = "currency-selector-wrap";
    wrapper.innerHTML = `
      <label class="currency-selector-label" for="${idPrefix}CurrencySelect">Currency</label>
      <select id="${idPrefix}CurrencySelect" class="currency-selector">
        ${SUPPORTED.map(
          (code) =>
            `<option value="${code}" ${code === selected ? "selected" : ""}>${code} (${SYMBOLS[code] || ""})</option>`
        ).join("")}
      </select>
    `;
    container.append(wrapper);
    const select = wrapper.querySelector("select");
    select.addEventListener("change", (event) => {
      setCurrency(event.target.value);
      document.querySelectorAll(".currency-selector").forEach((node) => {
        if (node !== event.target) node.value = normalizeCurrency(event.target.value);
      });
    });
    return select;
  };

  const renderHeaderSelector = () => {
    const nav = document.querySelector(".site-header .nav");
    if (!nav) return;
    renderSelector(nav, "header");
  };

  const renderDashboardSelector = () => {
    if (document.body.dataset.page !== "dashboard") return;
    const anchor = document.querySelector("main .page-title");
    if (!anchor || anchor.querySelector(".currency-selector-wrap")) return;
    renderSelector(anchor, "dashboard");
  };

  const syncSelectors = () => {
    const selected = getSelectedCurrency();
    document.querySelectorAll(".currency-selector").forEach((node) => {
      node.value = selected;
    });
  };

  const init = () => {
    renderHeaderSelector();
    renderDashboardSelector();
    const selected = getSelectedCurrency();
    window.localStorage.setItem(STORAGE_KEY, selected);
    if (typeof SharedState !== "undefined" && SharedState.getState().currency !== selected) {
      SharedState.setState({ currency: selected });
    }
    console.log("[CalnexApp] Selected currency", selected);
    document.addEventListener("sharedstate:updated", syncSelectors);
  };

  return {
    DEFAULT_CURRENCY,
    RATES_FROM_USD,
    SYMBOLS,
    getSelectedCurrency,
    setCurrency,
    convertFromUsd,
    formatCurrency,
    normalizeCurrency,
    init
  };
})();

window.formatCurrency = (value, currency) => CurrencyLayer.formatCurrency(value, currency);
if (document.readyState === "loading") {
  window.addEventListener("DOMContentLoaded", CurrencyLayer.init);
} else {
  CurrencyLayer.init();
}
