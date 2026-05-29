const GeoFinance = (() => {
  const STORAGE_KEY = "calnex_country";
  const DEFAULT_COUNTRY = "US";
  const COUNTRY_DATA = {
    US: {
      label: "United States",
      average_interest_rate: 6.8,
      inflation_rate: 3.1,
      average_income: 78000,
      loan_norm_years: 5,
      car_affordability_min: 0.15,
      car_affordability_max: 0.2
    },
    EU: {
      label: "European Union",
      average_interest_rate: 4.9,
      inflation_rate: 2.7,
      average_income: 48000,
      loan_norm_years: 6,
      car_affordability_min: 0.12,
      car_affordability_max: 0.18
    },
    UK: {
      label: "United Kingdom",
      average_interest_rate: 5.6,
      inflation_rate: 3.0,
      average_income: 46000,
      loan_norm_years: 6,
      car_affordability_min: 0.13,
      car_affordability_max: 0.19
    },
    IL: {
      label: "Israel",
      average_interest_rate: 5.9,
      inflation_rate: 3.3,
      average_income: 168000,
      loan_norm_years: 6,
      car_affordability_min: 0.14,
      car_affordability_max: 0.2
    },
    CN: {
      label: "China",
      average_interest_rate: 4.5,
      inflation_rate: 2.0,
      average_income: 120000,
      loan_norm_years: 5,
      car_affordability_min: 0.15,
      car_affordability_max: 0.2
    },
    CA: {
      label: "Canada",
      average_interest_rate: 5.5,
      inflation_rate: 2.5,
      average_income: 85000,
      loan_norm_years: 5,
      car_affordability_min: 0.15,
      car_affordability_max: 0.2
    },
    AU: {
      label: "Australia",
      average_interest_rate: 6.2,
      inflation_rate: 3.2,
      average_income: 98000,
      loan_norm_years: 5,
      car_affordability_min: 0.14,
      car_affordability_max: 0.2
    },
    JP: {
      label: "Japan",
      average_interest_rate: 1.2,
      inflation_rate: 2.5,
      average_income: 5500000,
      loan_norm_years: 6,
      car_affordability_min: 0.12,
      car_affordability_max: 0.18
    }
  };

  const COUNTRY_CODES = Object.keys(COUNTRY_DATA);
  const normalizeCountry = (country) => {
    const code = String(country || DEFAULT_COUNTRY).toUpperCase();
    return COUNTRY_CODES.includes(code) ? code : DEFAULT_COUNTRY;
  };

  const getCountryFromUrl = () => {
    const params = new URLSearchParams(window.location.search);
    return params.get("country") || params.get("selected_country");
  };

  const getSelectedCountry = () => {
    const urlCountry = getCountryFromUrl();
    if (urlCountry) return normalizeCountry(urlCountry);
    if (typeof SharedState !== "undefined") {
      const fromState = SharedState.getState().selected_country;
      if (fromState) return normalizeCountry(fromState);
    }
    const fromStorage = window.localStorage.getItem(STORAGE_KEY);
    return normalizeCountry(fromStorage);
  };

  const getCountryData = (country = getSelectedCountry()) => COUNTRY_DATA[normalizeCountry(country)] || COUNTRY_DATA.US;

  const setCountry = (country) => {
    const nextCountry = normalizeCountry(country);
    const defaults = getCountryData(nextCountry);
    window.localStorage.setItem(STORAGE_KEY, nextCountry);
    if (typeof SharedState !== "undefined") {
      SharedState.setState(
        {
          selected_country: nextCountry,
          geo_defaults: defaults
        },
        { system: true, syncUrl: true }
      );
    }
    document.dispatchEvent(new CustomEvent("geo:changed", { detail: { country: nextCountry, defaults } }));
    window.dispatchEvent(new CustomEvent("appStateChanged", { detail: { source: "geo", country: nextCountry } }));
    return nextCountry;
  };

  const renderSelector = () => {
    const pills = window.CalnexHeaderToolbar?.ensure?.()?.pills;
    const nav = document.querySelector(".site-header .nav");
    const host = pills || nav;
    if (!host || host.querySelector(".country-selector-wrap")) return;
    const selected = getSelectedCountry();
    const pill = window.CalnexHeaderToolbar || {};
    const wrapClass = `country-selector-wrap cn-header-pill cn-header-pill--country ${pill.PILL_WRAP_CLASS || ""}`.trim();
    const selectClass = `country-selector ${pill.PILL_SELECT_CLASS || "cn-header-pill__select"}`;
    const renderOption = pill.renderPillOption || ((value, label, isSel) => `<option value="${value}"${isSel ? " selected" : ""}>${label}</option>`);
    const wrap = document.createElement("div");
    wrap.className = wrapClass;
    wrap.innerHTML = `
      <label class="sr-only" for="headerCountrySelect">Country</label>
      <span class="cn-header-pill__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
      </span>
      <select id="headerCountrySelect" class="${selectClass}" aria-label="Country">
        ${COUNTRY_CODES.map((code) => renderOption(code, code, selected === code)).join("")}
      </select>
    `;
    host.append(wrap);
    wrap.querySelector("select").addEventListener("change", (event) => {
      const next = setCountry(event.target.value);
      document.querySelectorAll(".country-selector").forEach((node) => {
        node.value = next;
      });
    });
    document.dispatchEvent(new CustomEvent("cn-header:updated"));
  };

  const renderIndicator = () => {
    /* Location hint is consolidated into the country pill; no inline header text. */
  };

  const getGlobalAverage = () => {
    const list = COUNTRY_CODES.map((code) => COUNTRY_DATA[code]);
    const sum = (key) => list.reduce((acc, item) => acc + (Number(item[key]) || 0), 0);
    return {
      average_interest_rate: sum("average_interest_rate") / list.length,
      inflation_rate: sum("inflation_rate") / list.length,
      average_income: sum("average_income") / list.length,
      loan_norm_years: sum("loan_norm_years") / list.length
    };
  };

  const init = () => {
    renderSelector();
    renderIndicator();
    const selected = getSelectedCountry();
    const defaults = getCountryData(selected);
    console.log("[CalnexApp] Detected country", selected, defaults);
    window.localStorage.setItem(STORAGE_KEY, selected);
    if (typeof SharedState !== "undefined") {
      const state = SharedState.getState();
      if (state.selected_country !== selected) {
        SharedState.setState({ selected_country: selected, geo_defaults: defaults }, { system: true, syncUrl: true });
      } else if (!state.geo_defaults) {
        SharedState.setState({ geo_defaults: defaults }, { system: true, syncUrl: true });
      }
    }
    document.addEventListener("sharedstate:updated", renderIndicator);
    document.addEventListener("geo:changed", renderIndicator);
  };

  return {
    DEFAULT_COUNTRY,
    COUNTRY_DATA,
    getSelectedCountry,
    getCountryData,
    getGlobalAverage,
    normalizeCountry,
    setCountry,
    init
  };
})();

window.GeoFinance = GeoFinance;
if (document.readyState === "loading") {
  window.addEventListener("DOMContentLoaded", GeoFinance.init);
} else {
  GeoFinance.init();
}
