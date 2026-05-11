const UiRenderer = (() => {
  const getState = () => (typeof SharedState !== "undefined" ? SharedState.getState() : {});
  const getDerivedState = () => (window.AppDerivedState && typeof window.AppDerivedState === "object" ? window.AppDerivedState : {});
  const getCurrency = () =>
    (typeof CurrencyLayer !== "undefined" ? CurrencyLayer.getCurrentCurrency() : "USD");
  const getSymbol = () => (typeof CurrencyLayer !== "undefined" ? CurrencyLayer.getCurrencySymbol() : "$");
  const formatMoney = (value) =>
    (typeof CurrencyLayer !== "undefined"
      ? CurrencyLayer.formatCurrency(value)
      : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value) || 0));

  const inferFormattedValue = (key, value) => {
    if (value === null || value === undefined || value === "") return "";
    const asNumber = Number(value);
    if (!Number.isFinite(asNumber)) return String(value);
    if (/(rate|ratio|inflation)/.test(key)) return `${asNumber}%`;
    if (/(amount|payment|cost|interest|income|total|principal|down)/.test(key)) return formatMoney(asNumber);
    return String(asNumber);
  };

  const formatByType = (key, value, formatType) => {
    if (value === null || value === undefined || value === "") return "";
    if (formatType === "text") return String(value);
    const asNumber = Number(value);
    if (formatType === "currency") return formatMoney(asNumber);
    if (formatType === "percent") {
      const display = Math.abs(asNumber) <= 1 ? asNumber * 100 : asNumber;
      return `${Number(display.toFixed(2))}%`;
    }
    if (formatType === "years") return `${Number(asNumber.toFixed(2))} years`;
    if (formatType === "number") return Number(asNumber.toFixed(2)).toLocaleString("en-US");
    const leafKey = key.includes(".") ? key.slice(key.lastIndexOf(".") + 1) : key;
    return inferFormattedValue(leafKey, value);
  };

  const getBindingValue = (state, derived, key) => {
    if (!key) return undefined;
    if (key.includes(".")) {
      const parts = key.split(".");
      let cur = state;
      for (let i = 0; i < parts.length; i += 1) {
        if (cur == null || typeof cur !== "object") return undefined;
        cur = cur[parts[i]];
      }
      return cur;
    }
    if (key in state) return state[key];
    return derived[key];
  };

  const renderCurrency = () => {
    const symbol = getSymbol();
    document.querySelectorAll("[data-currency-symbol]").forEach((node) => {
      node.textContent = symbol;
    });
  };

  const renderLabels = () => {
    const symbol = getSymbol();
    document.querySelectorAll("[data-currency-label]").forEach((node) => {
      if (!node.dataset.baseLabel) node.dataset.baseLabel = node.textContent.trim();
      node.textContent = `${node.dataset.baseLabel} (${symbol})`;
    });
  };

  const renderInputs = () => {
    const state = getState();
    const active = document.activeElement;
    document.querySelectorAll("[data-input-bind]").forEach((node) => {
      const key = node.getAttribute("data-input-bind");
      if (!key || !(key in state)) return;
      if (active === node) return;
      const raw = state[key];
      const next =
        typeof raw === "number"
          ? String(raw)
          : raw === null || raw === undefined
            ? ""
            : String(raw);
      if (node.value === next) return;
      node.dataset.programmaticUpdate = "true";
      node.value = next;
      queueMicrotask(() => {
        delete node.dataset.programmaticUpdate;
      });
    });
  };

  const renderOutputs = () => {
    const state = getState();
    const derived = getDerivedState();
    let boundCount = 0;
    document.querySelectorAll("[data-bind]").forEach((node) => {
      const key = node.getAttribute("data-bind");
      if (!key) return;
      const formatType = node.getAttribute("data-format") || "";
      const value = getBindingValue(state, derived, key);
      node.textContent = formatByType(key, value, formatType);
      boundCount += 1;
    });
    document.querySelectorAll(".financial-validator-badge").forEach((node) => {
      const txt = (node.textContent || "").trim();
      node.classList.toggle("financial-validator-badge--visible", Boolean(txt));
    });
    if (document.body?.dataset?.page === "retirement-calculator") {
      console.log("[RENDER] retirement", { boundCount });
    }
    console.log(`[Renderer] bound ${boundCount} nodes`);
  };

  const renderDashboard = () => {
    if (typeof FinancialDashboard !== "undefined" && typeof FinancialDashboard.renderFromState === "function") {
      FinancialDashboard.renderFromState();
    }
  };

  const renderScenarioState = () => {};

  const renderAll = () => {
    const page = document.body?.dataset?.page || "";
    console.log("[RENDER] ui", { page, currency: getCurrency(), country: getState().selected_country || "US" });
    renderCurrency();
    renderLabels();
    renderInputs();
    renderDashboard();
    renderOutputs();
    console.log("[RENDER] applied");
  };

  const init = () => {
    if (typeof window.CalnexAppRender?.appRenderAll === "function") {
      CalnexAppRender.appRenderAll("init");
    } else {
      renderAll();
    }
    console.log("[Renderer] pure DOM binding active (no appStateChanged listener here)");
  };

  return {
    renderAll,
    renderCurrency,
    renderLabels,
    renderInputs,
    renderOutputs,
    renderDashboard,
    renderScenarioState,
    init
  };
})();

window.UiRenderer = UiRenderer;
if (document.readyState === "loading") {
  window.addEventListener("DOMContentLoaded", UiRenderer.init);
} else {
  UiRenderer.init();
}
