const RoiCalculator = (() => {
  const PAGE = "roi-calculator";

  const num = (key, el, fb = 0) =>
    typeof CalnexParse !== "undefined" ? CalnexParse.resolveNumeric(key, el, fb) : Number(el?.value) || fb;

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
      roi_annual_net_income: annualNet,
      roi_cash_on_cash_pct: cashOnCashPct,
      roi_appreciation_gain: appreciationGain,
      roi_total_return_pct: totalReturnPct,
      roi_banner_title: title,
      roi_banner_detail: detail
    };
  };

  const runRoiPipeline = () => computeRoiSnapshot(readInputs());

  const commitSnapshot = (patch) => {
    if (!patch || typeof patch !== "object" || !Object.keys(patch).length) return;
    if (typeof SharedState !== "undefined") {
      SharedState.setState(patch, { engineCommit: true, syncUrl: false });
    }
  };

  const runCalculation = () => {
    const patch = runRoiPipeline();
    if (patch && Object.keys(patch).length) {
      commitSnapshot(patch);
      return true;
    }
    return false;
  };

  const init = () => {
    if (document.body.dataset.page !== PAGE) return;
    if (window.AppEngine) {
      AppEngine.registerToolPipeline(PAGE, runRoiPipeline);
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
  };

  window.addEventListener("DOMContentLoaded", init);
  window.addEventListener("load", () => {
    if (document.body.dataset.page !== PAGE) return;
    if (window.AppEngine) AppEngine.runImmediate();
    else runCalculation();
  });

  return { runRoiPipeline, computeRoiSnapshot };
})();

window.RoiCalculator = RoiCalculator;
