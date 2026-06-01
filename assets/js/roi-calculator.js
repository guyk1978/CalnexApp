const RoiCalculator = (() => {
  const PAGE = "roi-calculator";

  const num = (key, el, fb = 0) =>
    typeof CalnexParse !== "undefined" ? CalnexParse.resolveNumeric(key, el, fb) : Number(el?.value) || fb;

  const formatCurrency = (value) =>
    typeof CurrencyLayer !== "undefined"
      ? CurrencyLayer.formatCurrency(value)
      : new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
          maximumFractionDigits: 0
        }).format(Number(value) || 0);

  const formatPercent = (value) => {
    const n = Number(value);
    const safe = Number.isFinite(n) ? n : 0;
    return `${safe.toFixed(2)}%`;
  };

  const readInputs = () => ({
    purchasePrice: Math.max(0, num("roi_purchase_price", document.getElementById("roiPurchasePrice"), 250000)),
    annualRent: Math.max(0, num("roi_annual_rent", document.getElementById("roiAnnualRent"), 24000)),
    annualExpenses: Math.max(0, num("roi_annual_expenses", document.getElementById("roiAnnualExpenses"), 6000)),
    appreciationRate: Math.max(0, num("roi_appreciation_rate", document.getElementById("roiAppreciationRate"), 3))
  });

  const computeRoiSnapshot = (inputs) => {
    const purchase = inputs.purchasePrice;
    const annualNet = inputs.annualRent - inputs.annualExpenses;
    const appreciationGain = purchase * (inputs.appreciationRate / 100);
    const cashOnCashPct = purchase > 0 ? (annualNet / purchase) * 100 : 0;
    const totalReturnPct = purchase > 0 ? ((annualNet + appreciationGain) / purchase) * 100 : 0;

    const title =
      totalReturnPct >= 8
        ? "Strong total return"
        : totalReturnPct >= 4
          ? "Moderate total return"
          : "Thin total return";

    const detail = `Cash flow ${annualNet >= 0 ? "positive" : "negative"} at ${cashOnCashPct.toFixed(1)}% cash-on-cash; appreciation adds ${inputs.appreciationRate.toFixed(1)}% on price.`;

    return {
      roi_purchase_price: inputs.purchasePrice,
      roi_annual_rent: inputs.annualRent,
      roi_annual_expenses: inputs.annualExpenses,
      roi_appreciation_rate: inputs.appreciationRate,
      roi_annual_net_income: annualNet,
      roi_cash_on_cash_pct: cashOnCashPct,
      roi_appreciation_gain: appreciationGain,
      roi_total_return_pct: totalReturnPct,
      roi_banner_title: title,
      roi_banner_detail: detail
    };
  };

  const paintResults = (patch) => {
    if (!patch || typeof patch !== "object") return;
    document.querySelectorAll("[data-bind]").forEach((node) => {
      const key = node.getAttribute("data-bind");
      if (!key || !(key in patch)) return;
      const fmt = node.getAttribute("data-format") || "";
      const value = patch[key];
      if (fmt === "currency") node.textContent = formatCurrency(value);
      else if (fmt === "percent") node.textContent = formatPercent(value);
      else node.textContent = value === null || value === undefined ? "" : String(value);
    });
  };

  const runRoiPipeline = () => computeRoiSnapshot(readInputs());

  const applyResults = (patch) => {
    if (!patch || !Object.keys(patch).length) return;
    paintResults(patch);
    if (typeof SharedState !== "undefined") {
      SharedState.setState(patch, { engineCommit: true, syncUrl: false });
    }
    if (typeof window.CalnexAppRender?.appRenderAll === "function") {
      CalnexAppRender.appRenderAll("roi-calculator");
    }
  };

  const runCalculation = () => {
    const patch = runRoiPipeline();
    if (patch && Object.keys(patch).length) {
      applyResults(patch);
      return true;
    }
    return false;
  };

  const init = () => {
    if (document.body.dataset.page !== PAGE) return;
    if (window.AppEngine) {
      AppEngine.registerToolPipeline(PAGE, () => {
        const patch = runRoiPipeline();
        if (patch && Object.keys(patch).length) {
          queueMicrotask(() => paintResults(patch));
        }
        return patch;
      });
      AppEngine.runImmediate();
    } else {
      runCalculation();
    }
    const form = document.getElementById("roi-form");
    if (form && !form.dataset.roiBound) {
      form.dataset.roiBound = "1";
      const onChange = () => {
        if (window.AppEngine) AppEngine.notifyToolInput();
        else runCalculation();
      };
      form.addEventListener("input", onChange);
      form.addEventListener("change", onChange);
    }
    document.addEventListener("currency:changed", () => {
      if (window.AppEngine) AppEngine.runImmediate();
      else runCalculation();
    });
  };

  window.addEventListener("DOMContentLoaded", init);
  window.addEventListener("load", () => {
    if (document.body.dataset.page !== PAGE) return;
    if (window.AppEngine) AppEngine.runImmediate();
    else runCalculation();
  });

  return { runRoiPipeline, computeRoiSnapshot, paintResults, applyResults };
})();

window.RoiCalculator = RoiCalculator;
