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
      SharedState.setState({
        selected_country: nextCountry,
        geo_defaults: defaults
      });
    }
    document.dispatchEvent(new CustomEvent("geo:changed", { detail: { country: nextCountry, defaults } }));
    return nextCountry;
  };

  const renderSelector = () => {
    const nav = document.querySelector(".site-header .nav");
    if (!nav || nav.querySelector(".country-selector-wrap")) return;
    const selected = getSelectedCountry();
    const wrap = document.createElement("div");
    wrap.className = "country-selector-wrap";
    wrap.innerHTML = `
      <label class="country-selector-label" for="headerCountrySelect">Country</label>
      <select id="headerCountrySelect" class="country-selector">
        ${COUNTRY_CODES.map(
          (code) => `<option value="${code}" ${selected === code ? "selected" : ""}>${code}</option>`
        ).join("")}
      </select>
    `;
    nav.append(wrap);
    wrap.querySelector("select").addEventListener("change", (event) => {
      const next = setCountry(event.target.value);
      document.querySelectorAll(".country-selector").forEach((node) => {
        node.value = next;
      });
    });
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
    const selected = getSelectedCountry();
    const defaults = getCountryData(selected);
    window.localStorage.setItem(STORAGE_KEY, selected);
    if (typeof SharedState !== "undefined") {
      const state = SharedState.getState();
      if (state.selected_country !== selected) {
        SharedState.setState({ selected_country: selected, geo_defaults: defaults });
      } else if (!state.geo_defaults) {
        SharedState.setState({ geo_defaults: defaults });
      }
    }
  };

  return {
    DEFAULT_COUNTRY,
    COUNTRY_DATA,
    getSelectedCountry,
    getCountryData,
    getGlobalAverage,
    normalizeCountry,
    setCountry
  };
})();

window.GeoFinance = GeoFinance;
window.addEventListener("DOMContentLoaded", GeoFinance.init);
