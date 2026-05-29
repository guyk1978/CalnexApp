const UiRenderer = (() => {
  const getState = () => (typeof SharedState !== "undefined" ? SharedState.getState() : {});
  const getDerivedState = () => (window.AppDerivedState && typeof window.AppDerivedState === "object" ? window.AppDerivedState : {});
  const getCurrency = () =>
    (typeof CurrencyLayer !== "undefined" ? CurrencyLayer.getCurrentCurrency() : "USD");
  const getSymbol = () => (typeof CurrencyLayer !== "undefined" ? CurrencyLayer.getCurrencySymbol() : "$");

  const inferFormatType = (key, explicit) => {
    if (explicit) return explicit;
    if (!key) return "";
    const k = String(key).toLowerCase();
    if (/_status$|_warning$|_feedback$|_toast|_date$|_label$|_badge$|_text$|insight_/.test(k)) return "text";
    if (k.includes("readiness")) return "percent";
    if (/_months_saved$|_loan_count$|confidence_score$|years_to_retirement$/.test(k)) return "number";
    if (
      /(?:^|_)(?:monthly_payment|total_interest|total_cost|total_repayment|computed_loan|principal_interest|tax_insurance|recommended_payment|actual_payment|interest_saved|total_paid|final_amount|simple_total|compound_total|safe_min|safe_max|current_payment|funding_gap|projected_balance|inflation_adjusted|estimated_monthly|growth_projection|summary_total)/.test(
        k
      ) ||
      /(?:payment|interest|cost|amount|repayment|saved|balance|gap|income|projection|diff|principal|paid|financed|compare_)/.test(k)
    ) {
      return "currency";
    }
    return "";
  };

  const formatFinancial = (value, formatType) => {
    if (value === null || value === undefined || value === "") return "";

    if (formatType === "text") return String(value);

    const asNumber = Number(value);
    const safeNumber = Number.isFinite(asNumber) ? asNumber : 0;

    if (formatType === "currency") {
      if (typeof CurrencyLayer !== "undefined" && typeof CurrencyLayer.formatCurrency === "function") {
        return CurrencyLayer.formatCurrency(safeNumber);
      }
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(safeNumber);
    }

    if (formatType === "percent") {
      const display = Math.abs(safeNumber) <= 1 ? safeNumber * 100 : safeNumber;
      return `${Number(display.toFixed(2))}%`;
    }

    if (formatType === "years") return `${Number(safeNumber.toFixed(2))} years`;
    if (formatType === "number") return Number(safeNumber.toFixed(2)).toLocaleString("en-US");

    if (Number.isFinite(asNumber)) return String(safeNumber);
    return String(value);
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

  let lastRenderedCurrency = null;

  const renderOutputs = () => {
    const state = getState();
    const derived = getDerivedState();
    const currentCurrency = getCurrency();

    if (lastRenderedCurrency && currentCurrency && currentCurrency !== lastRenderedCurrency) {
      if (typeof window.CalnexAppRender?.appRenderAll === "function") {
        CalnexAppRender.appRenderAll("currency-refresh");
      } else {
        renderAll();
      }
      lastRenderedCurrency = currentCurrency;
      return;
    }

    let boundCount = 0;
    document.querySelectorAll("[data-bind]").forEach((node) => {
      const key = node.getAttribute("data-bind");
      if (!key) return;
      const formatType = inferFormatType(key, node.getAttribute("data-format") || "");
      const value = getBindingValue(state, derived, key);
      node.textContent = formatFinancial(value, formatType);
      boundCount += 1;
    });
    document.querySelectorAll(".financial-validator-badge").forEach((node) => {
      const txt = (node.textContent || "").trim();
      node.classList.toggle("financial-validator-badge--visible", Boolean(txt));
    });
    document.querySelectorAll("[data-confidence-fill]").forEach((fill) => {
      const widget = fill.closest(".cn-confidence-widget");
      const panel = fill.closest(".financial-validation-panel, .cn-confidence-widget");
      const scoreEl = panel?.querySelector('[data-bind="financial_validation_confidence_score"]');
      const raw = scoreEl ? Number(String(scoreEl.textContent).replace(/,/g, "")) : 100;
      const pct = Math.max(0, Math.min(100, Number.isFinite(raw) ? raw : 0));
      fill.style.width = `${pct}%`;
      widget?.style.setProperty("--cn-confidence-pct", `${pct}%`);
      if (widget) {
        widget.classList.remove("cn-confidence-widget--high", "cn-confidence-widget--mid", "cn-confidence-widget--low");
        if (pct >= 80) widget.classList.add("cn-confidence-widget--high");
        else if (pct >= 50) widget.classList.add("cn-confidence-widget--mid");
        else widget.classList.add("cn-confidence-widget--low");
      }
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
    lastRenderedCurrency = getCurrency();
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
