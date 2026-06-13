const CurrencyLayer = (() => {
  const STORAGE_KEY = "calnex_currency";
  const DEFAULT_CURRENCY = "USD";
  const RATES_FROM_USD = {
    USD: 1,
    EUR: 0.92,
    GBP: 0.79,
    ILS: 3.66,
    CNY: 7.24,
    CAD: 1.36,
    AUD: 1.52,
    JPY: 150
  };
  const SYMBOLS = {
    USD: "$",
    EUR: "€",
    GBP: "£",
    ILS: "₪",
    CNY: "¥",
    CAD: "$",
    AUD: "$",
    JPY: "¥"
  };
  const LOCALES = {
    USD: "en-US",
    EUR: "de-DE",
    GBP: "en-GB",
    ILS: "he-IL",
    CNY: "zh-CN",
    CAD: "en-CA",
    AUD: "en-AU",
    JPY: "ja-JP"
  };
  const CURRENCY_LABELS = {
    CNY: "CNY (¥)",
    CAD: "CAD ($)",
    AUD: "AUD ($)",
    JPY: "JPY (¥)"
  };
  const SUPPORTED = Object.keys(RATES_FROM_USD);

  const getCurrencyOptionLabel = (code) => CURRENCY_LABELS[code] || code;

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

  const getCurrentCurrency = () => getSelectedCurrency();
  const getCurrencySymbol = (currency = getSelectedCurrency()) => {
    const code = normalizeCurrency(currency);
    return SYMBOLS[code] || "$";
  };

  const formatCurrency = (value, currency = getSelectedCurrency()) => {
    const code = normalizeCurrency(currency);
    const symbol = SYMBOLS[code] || "$";
    const safe = Number(value) || 0;
    const formatted = Math.abs(safe).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    return safe < 0 ? `-${symbol}${formatted}` : `${symbol}${formatted}`;
  };

  const setCurrency = (currency) => {
    const nextCurrency = normalizeCurrency(currency);
    window.localStorage.setItem(STORAGE_KEY, nextCurrency);
    if (typeof SharedState !== "undefined") {
      SharedState.setState({ currency: nextCurrency }, { system: true, syncUrl: true });
    }
    const CURRENCY_TO_COUNTRY = {
      USD: "US",
      EUR: "EU",
      GBP: "UK",
      ILS: "IL",
      CNY: "CN",
      CAD: "CA",
      AUD: "AU",
      JPY: "JP"
    };
    const linkedCountry = CURRENCY_TO_COUNTRY[nextCurrency];
    if (linkedCountry && typeof window.GeoFinance !== "undefined") {
      const currentCountry = window.GeoFinance.getSelectedCountry();
      if (linkedCountry !== currentCountry) {
        window.GeoFinance.setCountry(linkedCountry);
        document.querySelectorAll(".country-selector").forEach((node) => {
          node.value = linkedCountry;
        });
      }
    }
    document.dispatchEvent(new CustomEvent("currency:changed", { detail: { currency: nextCurrency } }));
    window.dispatchEvent(new CustomEvent("appStateChanged", { detail: { source: "currency", currency: nextCurrency } }));
    return nextCurrency;
  };

  const renderSelector = (container, idPrefix) => {
    if (!container) return null;
    const existing = container.querySelector(".currency-selector-wrap");
    if (existing) return existing.querySelector("select");
    const selected = getSelectedCurrency();
    const pill = window.CalnexHeaderToolbar || {};
    const wrapClass = `currency-selector-wrap cn-header-pill cn-header-pill--currency ${pill.PILL_WRAP_CLASS || ""}`.trim();
    const selectClass = `currency-selector ${pill.PILL_SELECT_CLASS || "cn-header-pill__select"}`;
    const renderOption = pill.renderPillOption || ((value, label, isSel) => `<option value="${value}"${isSel ? " selected" : ""}>${label}</option>`);
    const wrapper = document.createElement("div");
    wrapper.className = wrapClass;
    wrapper.innerHTML = `
      <label class="sr-only" for="${idPrefix}CurrencySelect">Currency</label>
      <span class="cn-header-pill__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 0 1 0 4H8"/><path d="M12 18V6"/></svg>
      </span>
      <select id="${idPrefix}CurrencySelect" class="${selectClass}" aria-label="Currency">
        ${SUPPORTED.map((code) => renderOption(code, getCurrencyOptionLabel(code), code === selected)).join("")}
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
    document.dispatchEvent(new CustomEvent("cn-header:updated"));
    return select;
  };

  const renderHeaderSelector = () => {
    if (document.querySelector("[data-cn-react-header]")) return;
    const pills = window.CalnexHeaderToolbar?.ensure?.()?.pills;
    const nav = document.querySelector(".site-header .nav");
    const host = pills || nav;
    if (!host) return;
    renderSelector(host, "header");
  };

  const renderDashboardSelector = () => {
    if (document.body.dataset.page !== "dashboard") return;
    const anchor = document.getElementById("dashCurrencyMount") || document.querySelector("main .page-title");
    if (!anchor || anchor.querySelector(".currency-selector-wrap")) return;
    renderSelector(anchor, "dashboard");
  };

  const syncSelectors = () => {
    const selected = getSelectedCurrency();
    document.querySelectorAll(".currency-selector").forEach((node) => {
      node.value = selected;
    });
  };

  const syncCurrencySymbols = () => {
    const symbol = getCurrencySymbol();
    document.querySelectorAll("[data-currency-symbol]").forEach((node) => {
      node.textContent = symbol;
    });
  };

  /** Wire existing header/dashboard selects (Next static export + data-cn-react-header). */
  const bindExistingSelectors = () => {
    document.querySelectorAll(".currency-selector").forEach((select) => {
      if (!select || select.dataset.cnCurrencyBound === "1") return;
      select.dataset.cnCurrencyBound = "1";
      select.addEventListener("change", (event) => {
        const next = normalizeCurrency(event.target.value);
        setCurrency(next);
        document.querySelectorAll(".currency-selector").forEach((node) => {
          if (node !== event.target) node.value = next;
        });
      });
    });
  };

  const init = () => {
    renderHeaderSelector();
    renderDashboardSelector();
    bindExistingSelectors();
    const selected = getSelectedCurrency();
    window.localStorage.setItem(STORAGE_KEY, selected);
    if (typeof SharedState !== "undefined" && SharedState.getState().currency !== selected) {
      SharedState.setState({ currency: selected }, { system: true, syncUrl: true });
    }
    syncSelectors();
    syncCurrencySymbols();
    console.log("[CalnexApp] Selected currency", selected, "sample:", formatCurrency(1234.56, selected));
    document.addEventListener("sharedstate:updated", syncSelectors);
    document.addEventListener("sharedstate:updated", syncCurrencySymbols);
    document.addEventListener("currency:changed", syncCurrencySymbols);
    document.addEventListener("cn-header:updated", bindExistingSelectors);
  };

  return {
    DEFAULT_CURRENCY,
    RATES_FROM_USD,
    SYMBOLS,
    getSelectedCurrency,
    getCurrentCurrency,
    getCurrencySymbol,
    setCurrency,
    formatCurrency,
    normalizeCurrency,
    bindExistingSelectors,
    init
  };
})();

window.formatCurrency = (value, currency) => CurrencyLayer.formatCurrency(value, currency);
window.getCurrencySymbol = (currency) => CurrencyLayer.getCurrencySymbol(currency);
window.getCurrentCurrency = () => CurrencyLayer.getCurrentCurrency();
if (document.readyState === "loading") {
  window.addEventListener("DOMContentLoaded", CurrencyLayer.init);
} else {
  CurrencyLayer.init();
}
