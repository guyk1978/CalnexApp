const CarLoanCalculator = (() => {
  const selectors = {
    carPrice: document.getElementById("carPrice"),
    downPaymentType: document.getElementById("carDownPaymentType"),
    downPaymentPercent: document.getElementById("carDownPaymentPercent"),
    downPaymentAmount: document.getElementById("carDownPaymentAmount"),
    tradeInValue: document.getElementById("tradeInValue"),
    fees: document.getElementById("carFees"),
    interestRate: document.getElementById("carInterestRate"),
    loanTerm: document.getElementById("carLoanTerm"),
    termUnit: document.getElementById("carTermUnit"),
    annualIncome: document.getElementById("carAnnualIncome"),
    computedLoanAmount: document.getElementById("carComputedLoanAmount"),
    monthlyPayment: document.getElementById("carMonthlyPayment"),
    totalInterest: document.getElementById("carTotalInterestPaid"),
    totalCost: document.getElementById("carTotalVehicleCost"),
    scheduleBody: document.getElementById("carScheduleBody"),
    principalInterestChart: document.getElementById("carPrincipalInterestChart"),
    balanceChart: document.getElementById("carBalanceChart"),
    toggleSchedule: document.getElementById("toggleCarSchedule"),
    schedulePanel: document.getElementById("carSchedulePanel"),
    safeMin: document.getElementById("carSafeMin"),
    safeMax: document.getElementById("carSafeMax"),
    currentPayment: document.getElementById("carCurrentPayment"),
    affordabilityStatus: document.getElementById("carAffordabilityStatus"),
    comparePriceB: document.getElementById("compareCarPriceB"),
    compareDownB: document.getElementById("compareDownB"),
    compareRateB: document.getElementById("compareRateB"),
    compareTermB: document.getElementById("compareTermB"),
    compareMonthlyA: document.getElementById("compareMonthlyA"),
    compareMonthlyB: document.getElementById("compareMonthlyB"),
    compareDifference: document.getElementById("compareDifference"),
    insight72vs48: document.getElementById("insight72vs48"),
    insightInterestDiff: document.getElementById("insightInterestDiff")
  };

  let principalInterestChartInstance;
  let balanceChartInstance;
  let lastCarSchedule = [];

  const setCurrency = (value) =>
    (typeof CurrencyLayer !== "undefined"
      ? CurrencyLayer.formatCurrency(value)
      : new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
          maximumFractionDigits: 2
        }).format(Number(value) || 0));

  const num = (key, el, fb = 0) =>
    typeof CalnexParse !== "undefined" ? CalnexParse.resolveNumeric(key, el, fb) : Number(el?.value) || fb;
  const numEl = (el, fb = 0) =>
    typeof CalnexParse !== "undefined" ? CalnexParse.parseNumber(el?.value) ?? fb : Number(el?.value) || fb;

  const getTermInMonths = () => {
    const term = num("loan_term", selectors.loanTerm, 0);
    return selectors.termUnit.value === "years" ? term * 12 : term;
  };

  const getAffordabilityRange = () => {
    if (typeof GeoFinance === "undefined") return { min: 0.15, max: 0.2 };
    const geo = GeoFinance.getCountryData();
    console.log("[CalnexApp] Applied car geo defaults", geo);
    return {
      min: Number(geo.car_affordability_min) || 0.15,
      max: Number(geo.car_affordability_max) || 0.2
    };
  };

  const renderSchedule = (schedule) => {
    selectors.scheduleBody.innerHTML = schedule
      .map(
        (row, index) => `
        <tr class="${index === schedule.length - 1 ? "payoff-row" : ""}">
          <td>${row.month}</td>
          <td>${setCurrency(row.payment)}</td>
          <td>${setCurrency(row.principal)}</td>
          <td>${setCurrency(row.interest)}</td>
          <td>${setCurrency(row.balance)}</td>
        </tr>
      `
      )
      .join("");
  };

  const renderCharts = (schedule) => {
    if (!window.Chart) return;
    const labels = schedule.map((row) => row.month);
    const principal = schedule.map((row) => Number(row.principal.toFixed(2)));
    const interest = schedule.map((row) => Number(row.interest.toFixed(2)));
    const balance = schedule.map((row) => Number(row.balance.toFixed(2)));

    if (principalInterestChartInstance) principalInterestChartInstance.destroy();
    if (balanceChartInstance) balanceChartInstance.destroy();

    principalInterestChartInstance = new window.Chart(selectors.principalInterestChart, {
      type: "line",
      data: {
        labels,
        datasets: [
          { label: "Principal", data: principal, borderColor: "#1b63f0", tension: 0.22, pointRadius: 0 },
          { label: "Interest", data: interest, borderColor: "#5f6b7a", tension: 0.22, pointRadius: 0 }
        ]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });

    balanceChartInstance = new window.Chart(selectors.balanceChart, {
      type: "line",
      data: {
        labels,
        datasets: [{ label: "Remaining Balance", data: balance, borderColor: "#144fc1", tension: 0.22, pointRadius: 0 }]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
  };

  const runCarPipeline = () => {
    if (typeof FinancialCore === "undefined" || typeof FinancialCore.computeCarLoanSnapshot !== "function") return {};
    const range = getAffordabilityRange();
    const carPrice = num("loan_amount", selectors.carPrice, 0);
    const tradeInValue = Math.max(0, numEl(selectors.tradeInValue, 0));
    const fees = Math.max(0, numEl(selectors.fees, 0));
    const downType = selectors.downPaymentType.value === "percent" ? "percent" : "fixed";
    const downPercent = Math.max(0, numEl(selectors.downPaymentPercent, 0));
    const downFixed = Math.max(0, numEl(selectors.downPaymentAmount, 0));
    const annualRate = Math.max(0, num("interest_rate", selectors.interestRate, 0));
    const totalMonths = Math.max(1, getTermInMonths());

    const f = FinancialCore.computeCarLoanSnapshot({
      carPrice,
      tradeInValue,
      fees,
      downType,
      downPercent,
      downFixed,
      annualRate,
      totalMonths,
      annualIncome: numEl(selectors.annualIncome, 0),
      affordabilityMin: range.min,
      affordabilityMax: range.max,
      comparePriceB: Math.max(0, numEl(selectors.comparePriceB, 0)),
      compareDownB: Math.max(0, numEl(selectors.compareDownB, 0)),
      compareRateB: Math.max(0, numEl(selectors.compareRateB, 0)),
      compareTermB: Math.max(1, numEl(selectors.compareTermB, 0))
    });

    lastCarSchedule = f.schedule;

    selectors.affordabilityStatus.classList.remove("status-green", "status-yellow", "status-red");
    if (f.affordability_band === "green") selectors.affordabilityStatus.classList.add("status-green");
    else if (f.affordability_band === "yellow") selectors.affordabilityStatus.classList.add("status-yellow");
    else if (f.affordability_band === "red") selectors.affordabilityStatus.classList.add("status-red");

    const insights = {
      car_insight_72_vs_48: `You pay ${setCurrency(
        f.insight_interest_diff
      )} more in total interest with 72 months vs 48 months, while reducing monthly payment by about ${setCurrency(f.insight_monthly_diff)}.`,
      car_insight_interest_diff: `Interest difference over time: ${setCurrency(f.insight_interest_diff)} in additional borrowing cost.`
    };

    const core = {
      loan_amount: f.financed,
      interest_rate: annualRate,
      loan_term: totalMonths,
      extra_payment: 0,
      down_payment: f.downPayment,
      income: numEl(selectors.annualIncome, 0),
      car_computed_loan_amount: f.financed,
      car_monthly_payment: f.car_monthly_payment,
      car_total_interest: f.car_total_interest,
      car_total_cost: f.car_total_cost,
      car_safe_min: f.car_safe_min,
      car_safe_max: f.car_safe_max,
      car_current_payment: f.car_current_payment,
      car_affordability_status: f.car_affordability_status,
      car_compare_monthly_a: f.car_compare_monthly_a,
      car_compare_monthly_b: f.car_compare_monthly_b,
      car_compare_difference: f.car_compare_difference
    };
    if (typeof SharedState !== "undefined") SharedState.refreshToolLinks();
    return { ...core, ...insights };
  };

  const paintCarCharts = () => {
    renderSchedule(lastCarSchedule);
    renderCharts(lastCarSchedule);
  };

  const togglePanel = () => {
    const isOpen = selectors.schedulePanel.classList.toggle("is-open");
    selectors.schedulePanel.setAttribute("aria-hidden", String(!isOpen));
    selectors.toggleSchedule.textContent = isOpen ? "Hide amortization schedule" : "Show amortization schedule";
  };

  const bindEvents = () => {
    [
      selectors.tradeInValue,
      selectors.fees,
      selectors.downPaymentPercent,
      selectors.downPaymentAmount,
      selectors.annualIncome,
      selectors.termUnit,
      selectors.comparePriceB,
      selectors.compareDownB,
      selectors.compareRateB,
      selectors.compareTermB
    ].forEach((node) => {
      if (!node) return;
      node.addEventListener("input", () => {
        if (window.AppEngine) AppEngine.notifyToolInput();
      });
    });

    selectors.downPaymentType.addEventListener("input", () => {
      const isPercent = selectors.downPaymentType.value === "percent";
      selectors.downPaymentPercent.closest(".field").style.display = isPercent ? "" : "none";
      selectors.downPaymentAmount.closest(".field").style.display = isPercent ? "none" : "";
      if (window.AppEngine) AppEngine.notifyToolInput();
    });

    selectors.toggleSchedule.addEventListener("click", togglePanel);
  };

  const applySharedState = () => {
    if (typeof SharedState === "undefined") return;
    const shared = SharedState.getState();
    if (shared.loan_amount !== undefined) selectors.carPrice.value = String(shared.loan_amount);
    if (shared.interest_rate !== undefined) selectors.interestRate.value = String(shared.interest_rate);
    if (shared.loan_term !== undefined) {
      if (shared.loan_term > 84) {
        selectors.termUnit.value = "years";
        selectors.loanTerm.value = String(Math.max(1, Math.round(shared.loan_term / 12)));
      } else {
        selectors.termUnit.value = "months";
        selectors.loanTerm.value = String(shared.loan_term);
      }
    }
    if (shared.down_payment !== undefined) {
      selectors.downPaymentType.value = "fixed";
      selectors.downPaymentAmount.value = String(shared.down_payment);
    }
    if (shared.income !== undefined) selectors.annualIncome.value = String(shared.income);
    SharedState.refreshToolLinks();
  };

  const init = () => {
    if (document.body.dataset.page !== "car-loan-calculator") return;
    if (window.AppEngine) AppEngine.registerToolPipeline("car-loan-calculator", runCarPipeline);
    if (window.CalnexAppRender?.registerCharts) {
      CalnexAppRender.registerCharts("car-loan-calculator", paintCarCharts);
    }
    applySharedState();
    const isPercent = selectors.downPaymentType.value === "percent";
    selectors.downPaymentPercent.closest(".field").style.display = isPercent ? "" : "none";
    selectors.downPaymentAmount.closest(".field").style.display = isPercent ? "none" : "";
    bindEvents();
    if (window.AppEngine) {
      AppEngine.runImmediate();
    } else if (typeof SharedState !== "undefined") {
      SharedState.setState(runCarPipeline(), { engineCommit: true });
      window.CalnexAppRender?.appRenderAll?.("init");
    } else {
      runCarPipeline();
      window.CalnexAppRender?.appRenderAll?.("init");
    }
    document.addEventListener("sharedstate:updated", (event) => {
      if (event.detail?.__engineSource === "commit") return;
      applySharedState();
      if (window.AppEngine) AppEngine.runImmediate();
    });
    document.addEventListener("geo:changed", () => {
      if (window.AppEngine) AppEngine.runImmediate();
    });
    document.addEventListener("currency:changed", () => {
      if (window.AppEngine) AppEngine.runImmediate();
    });
  };

  return { init };
})();

window.addEventListener("DOMContentLoaded", CarLoanCalculator.init);
