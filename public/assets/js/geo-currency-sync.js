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

  let syncing = false;

  const syncCurrencySelectors = (currency) => {
    if (!currency) return;
    document.querySelectorAll(".currency-selector").forEach((node) => {
      node.value = currency;
    });
  };

  const applyCountry = (country) => {
    if (syncing || !window.GeoFinance || !window.CurrencyLayer) return;
    const normalized = window.GeoFinance.normalizeCountry(country);
    const nextCurrency = COUNTRY_TO_CURRENCY[normalized];
    if (!nextCurrency || nextCurrency === window.CurrencyLayer.getSelectedCurrency()) return;

    syncing = true;
    window.CurrencyLayer.setCurrency(nextCurrency);
    syncCurrencySelectors(nextCurrency);
    syncing = false;
  };

  document.addEventListener("geo:changed", (event) => {
    applyCountry(event.detail?.country);
  });

  window.CalnexGeoCurrency = {
    COUNTRY_TO_CURRENCY,
    reconcile() {
      if (!window.GeoFinance || !window.CurrencyLayer) return;
      const country = window.GeoFinance.getSelectedCountry();
      applyCountry(country);
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
