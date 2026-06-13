/**
 * When the user picks a country, sync the header currency to that country's code.
 * Display amounts never convert — only the currency symbol changes elsewhere.
 */
(function () {
  const COUNTRY_TO_CURRENCY = {
    US: "USD",
    EU: "EUR",
    UK: "GBP",
    IL: "ILS",
    CN: "CNY",
    CA: "CAD",
    AU: "AUD",
    JP: "JPY",
  };

  let syncDepth = 0;

  const beginSync = () => {
    syncDepth += 1;
  };

  const endSync = () => {
    syncDepth = Math.max(0, syncDepth - 1);
  };

  const isSyncing = () => syncDepth > 0;

  const syncCurrencySelectors = (currency) => {
    if (!currency) return;
    document.querySelectorAll(".currency-selector").forEach((node) => {
      if (node.value !== currency) node.value = currency;
    });
  };

  const applyCountry = (country) => {
    if (isSyncing() || !window.GeoFinance || !window.CurrencyLayer) return;
    const normalized = window.GeoFinance.normalizeCountry(country);
    const nextCurrency = COUNTRY_TO_CURRENCY[normalized];
    const currentCurrency = window.CurrencyLayer.getSelectedCurrency();
    if (!nextCurrency || nextCurrency === currentCurrency) return;

    beginSync();
    try {
      window.CurrencyLayer.setCurrency(nextCurrency, { skipCountry: true });
      syncCurrencySelectors(nextCurrency);
    } finally {
      endSync();
    }
  };

  document.addEventListener("geo:changed", (event) => {
    applyCountry(event.detail?.country);
  });

  window.CalnexGeoCurrency = {
    COUNTRY_TO_CURRENCY,
    beginSync,
    endSync,
    isSyncing,
    reconcile() {
      if (!window.GeoFinance || !window.CurrencyLayer || isSyncing()) return;
      applyCountry(window.GeoFinance.getSelectedCountry());
    },
  };

  const boot = () => {
    window.CalnexGeoCurrency.reconcile();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
