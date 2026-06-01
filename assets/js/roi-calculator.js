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
    const scope = document.querySelector(".output-card") || document;
    scope.querySelectorAll("[data-bind]").forEach((node) => {
      const key = node.getAttribute("data-bind");
      if (!key || !(key in patch)) return;
      const fmt = node.getAttribute("data-format") || "";
      const value = patch[key];
      if (fmt === "currency") node.textContent = formatCurrency(value);
      else if (fmt === "percent") node.textContent = formatPercent(value);
      else node.textContent = value === null || value === undefined ? "" : String(value);
    });
  };

  const syncResults = () => {
    const patch = computeRoiSnapshot(readInputs());
    paintResults(patch);
    if (typeof SharedState !== "undefined") {
      SharedState.setState(patch, { engineCommit: true, syncUrl: false });
    }
    return patch;
  };

  const runRoiPipeline = () => computeRoiSnapshot(readInputs());

  let renderHookInstalled = false;
  const installRenderHook = () => {
    if (renderHookInstalled || !window.CalnexAppRender?.appRenderAll) return;
    renderHookInstalled = true;
    const original = CalnexAppRender.appRenderAll.bind(CalnexAppRender);
    CalnexAppRender.appRenderAll = (source = "", opts) => {
      original(source, opts);
      if (document.body?.dataset?.page === PAGE) {
        paintResults(runRoiPipeline());
      }
    };
  };

  const init = () => {
    if (document.body.dataset.page !== PAGE) return;
    installRenderHook();

    if (window.AppEngine) {
      AppEngine.registerToolPipeline(PAGE, runRoiPipeline);
      AppEngine.runImmediate();
    }
    syncResults();

    const form = document.getElementById("roi-form");
    if (form && !form.dataset.roiBound) {
      form.dataset.roiBound = "1";
      const onChange = () => {
        if (window.AppEngine) AppEngine.notifyToolInput();
        else syncResults();
      };
      form.addEventListener("input", onChange);
      form.addEventListener("change", onChange);
    }

    document.addEventListener("currency:changed", () => {
      if (window.AppEngine) AppEngine.runImmediate();
      else syncResults();
    });
  };

  window.addEventListener("DOMContentLoaded", init);
  window.addEventListener("load", () => {
    if (document.body.dataset.page !== PAGE) return;
    if (window.AppEngine) AppEngine.runImmediate();
    syncResults();
  });

  return { runRoiPipeline, computeRoiSnapshot, paintResults, syncResults };
})();

window.RoiCalculator = RoiCalculator;
