const MortgageCalculator = (() => {
  const selectors = {
    homePrice: document.getElementById("homePrice"),
    downPaymentType: document.getElementById("downPaymentType"),
    downPaymentPercent: document.getElementById("downPaymentPercent"),
    downPaymentAmount: document.getElementById("downPaymentAmount"),
    interestRate: document.getElementById("mortgageInterestRate"),
    loanTerm: document.getElementById("mortgageLoanTerm"),
    propertyTaxAnnual: document.getElementById("propertyTaxAnnual"),
    homeInsuranceAnnual: document.getElementById("homeInsuranceAnnual"),
    extraMonthlyPayment: document.getElementById("mortgageExtraMonthlyPayment"),
    lumpSumPayment: document.getElementById("mortgageLumpSumPayment"),
    paymentStartMonth: document.getElementById("mortgagePaymentStartMonth"),
    annualIncome: document.getElementById("annualIncome"),
    computedLoanAmount: document.getElementById("computedLoanAmount"),
    monthlyMortgagePayment: document.getElementById("monthlyMortgagePayment"),
    totalInterestPaid: document.getElementById("totalInterestPaid"),
    totalHomeCost: document.getElementById("totalHomeCost"),
    principalInterestMonthly: document.getElementById("principalInterestMonthly"),
    taxInsuranceMonthly: document.getElementById("taxInsuranceMonthly"),
    payoffDate: document.getElementById("payoffDate"),
    summaryTotalPayments: document.getElementById("mortgageSummaryTotalPayments"),
    summaryTotalInterest: document.getElementById("mortgageSummaryTotalInterest"),
    summaryPayoffDate: document.getElementById("mortgageSummaryPayoffDate"),
    affordabilityRecommended: document.getElementById("recommendedPayment"),
    affordabilityActual: document.getElementById("actualPayment"),
    affordabilityWarning: document.getElementById("affordabilityWarning"),
    compare15Monthly: document.getElementById("compare15Monthly"),
    compare15Interest: document.getElementById("compare15Interest"),
    compare30Monthly: document.getElementById("compare30Monthly"),
    compare30Interest: document.getElementById("compare30Interest"),
    compareDifference: document.getElementById("compareInterestDifference"),
    comparisonBars: document.getElementById("comparisonBars"),
    scheduleBody: document.getElementById("mortgageScheduleBody"),
    principalInterestChart: document.getElementById("mortgagePrincipalInterestChart"),
    balanceChart: document.getElementById("mortgageBalanceChart"),
    downPaymentPercentField: document.getElementById("downPaymentPercent")?.closest(".field") || null,
    downPaymentAmountField: document.getElementById("downPaymentAmount")?.closest(".field") || null,
    toggleAdvanced: document.getElementById("toggleMortgageAdvanced"),
    advancedPanel: document.getElementById("mortgageAdvancedPanel"),
    toggleSchedule: document.getElementById("toggleMortgageSchedule"),
    schedulePanel: document.getElementById("mortgageSchedulePanel")
  };

  let displayedSchedule = [];
  let baselineSchedule = [];
  let acceleratedSchedule = [];
  let principalInterestChartInstance;
  let balanceChartInstance;
  const num = (key, el, fb = 0) =>
    typeof CalnexParse !== "undefined" ? CalnexParse.resolveNumeric(key, el, fb) : Number(el?.value) || fb;
  const setCurrency = (value) =>
    (typeof CurrencyLayer !== "undefined"
      ? CurrencyLayer.formatCurrency(value)
      : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(Number(value) || 0));

  const getPayoffDate = (monthsAhead) => {
    const payoff = new Date();
    payoff.setMonth(payoff.getMonth() + monthsAhead);
    return payoff.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  };

  const buildSeries = (schedule, key, length, padWithZero = false) =>
    Array.from({ length }, (_, i) => {
      const row = schedule[i];
      if (!row) return padWithZero ? 0 : null;
      return Number(row[key].toFixed(2));
    });

  const getChartOptions = (yLabel) => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: { legend: { position: "top" } },
    scales: {
      x: { title: { display: true, text: "Month" } },
      y: { title: { display: true, text: yLabel }, ticks: { callback: (value) => setCurrency(Number(value) || 0) } }
    }
  });

  const renderScheduleTable = () => {
    selectors.scheduleBody.innerHTML = displayedSchedule
      .map((row, index) => {
        const classes = [];
        if (index === displayedSchedule.length - 1) classes.push("payoff-row");
        if (row.hadExtraPayment) classes.push("extra-row");
        return `<tr class="${classes.join(" ")}"><td>${row.month}</td><td>${setCurrency(row.payment)}</td><td>${setCurrency(row.principal)}</td><td>${setCurrency(row.interest)}</td><td>${setCurrency(row.balance)}</td></tr>`;
      })
      .join("");
  };

  const renderCharts = () => {
    if (!window.Chart) return;
    const maxMonths = Math.max(baselineSchedule.length, acceleratedSchedule.length, 1);
    const labels = Array.from({ length: maxMonths }, (_, i) => i + 1);
    if (principalInterestChartInstance) principalInterestChartInstance.destroy();
    if (balanceChartInstance) balanceChartInstance.destroy();
    principalInterestChartInstance = new window.Chart(selectors.principalInterestChart, {
      type: "line",
      data: {
        labels,
        datasets: [
          { label: "Principal (Original)", data: buildSeries(baselineSchedule, "principal", maxMonths), borderColor: "#8da8de", borderDash: [6, 6], tension: 0.24, pointRadius: 0 },
          { label: "Interest (Original)", data: buildSeries(baselineSchedule, "interest", maxMonths), borderColor: "#b0bac8", borderDash: [6, 6], tension: 0.24, pointRadius: 0 },
          { label: "Principal (With Extra)", data: buildSeries(acceleratedSchedule, "principal", maxMonths), borderColor: "#1b63f0", tension: 0.24, pointRadius: 0 },
          { label: "Interest (With Extra)", data: buildSeries(acceleratedSchedule, "interest", maxMonths), borderColor: "#5f6b7a", tension: 0.24, pointRadius: 0 }
        ]
      },
      options: getChartOptions("Amount (USD)")
    });
    balanceChartInstance = new window.Chart(selectors.balanceChart, {
      type: "line",
      data: {
        labels,
        datasets: [
          { label: "Balance (Original)", data: buildSeries(baselineSchedule, "balance", maxMonths, true), borderColor: "#8da8de", borderDash: [6, 6], tension: 0.24, pointRadius: 0 },
          { label: "Balance (With Extra)", data: buildSeries(acceleratedSchedule, "balance", maxMonths, true), borderColor: "#144fc1", tension: 0.24, pointRadius: 0 }
        ]
      },
      options: getChartOptions("Remaining Balance (USD)")
    });
  };

  const resolveLoanTermMonths = () => {
    const raw = num("loan_term", selectors.loanTerm, 360);
    const t = Math.round(Number(raw) || 0);
    if (t <= 0) return 360;
    const commonMortgageYears = new Set([10, 15, 20, 25, 30]);
    if (commonMortgageYears.has(t)) return Math.min(600, Math.max(12, t * 12));
    if (t >= 12 && t <= 600) return t;
    if (t <= 40) return Math.min(600, Math.max(12, t * 12));
    return 360;
  };

  const computeMortgage = () => {
    if (typeof FinancialCore === "undefined" || typeof FinancialCore.computeMortgageSnapshot !== "function") return {};
    const homePrice = Math.max(0, num("loan_amount", selectors.homePrice, 0));
    const downType = selectors.downPaymentType.value === "fixed" ? "fixed" : "percent";
    const downPercent = Math.max(0, num("mortgage_down_payment_percent", selectors.downPaymentPercent, 0));
    const downFixed = Math.max(0, num("down_payment", selectors.downPaymentAmount, 0));
    const annualRate = Math.max(0, num("interest_rate", selectors.interestRate, 0));
    const totalMonths = resolveLoanTermMonths();
    const extraMonthly = Math.max(0, num("extra_payment", selectors.extraMonthlyPayment, 0));
    const lumpSum = Math.max(0, num("mortgage_lump_sum_payment", selectors.lumpSumPayment, 0));
    const paymentStartMonth = Math.max(1, Math.min(totalMonths, num("mortgage_payment_start_month", selectors.paymentStartMonth, 1) || 1));

    const f = FinancialCore.computeMortgageSnapshot({
      homePrice,
      downType,
      downPercent,
      downFixed,
      annualRate,
      totalMonths,
      extraMonthly,
      lumpSum,
      paymentStartMonth,
      propertyTaxAnnual: num("property_tax_annual", selectors.propertyTaxAnnual, 0),
      homeInsuranceAnnual: num("home_insurance_annual", selectors.homeInsuranceAnnual, 0),
      annualIncome: num("income", selectors.annualIncome, 0)
    });

    baselineSchedule = f.baselineSchedule;
    acceleratedSchedule = f.acceleratedSchedule;
    displayedSchedule = acceleratedSchedule;
    const summary = f.acceleratedSummary;
    const payoffDate = getPayoffDate(summary.months);
    const warning = f.mortgage_affordability_warning;
    selectors.affordabilityWarning.classList.toggle("warning", warning.startsWith("Warning:"));

    selectors.computedLoanAmount.textContent = setCurrency(f.loanAmount);
    selectors.monthlyMortgagePayment.textContent = setCurrency(f.monthlyMortgagePayment);
    selectors.totalInterestPaid.textContent = setCurrency(summary.totalInterest);
    selectors.totalHomeCost.textContent = setCurrency(f.totalHomeCost);
    selectors.principalInterestMonthly.textContent = setCurrency(f.monthlyPrincipalInterest);
    selectors.taxInsuranceMonthly.textContent = setCurrency(f.monthlyEscrow);
    selectors.payoffDate.textContent = payoffDate;
    selectors.summaryTotalPayments.textContent = setCurrency(f.mortgage_summary_total_payments);
    selectors.summaryTotalInterest.textContent = setCurrency(summary.totalInterest);
    selectors.summaryPayoffDate.textContent = payoffDate;
    selectors.affordabilityRecommended.textContent = setCurrency(f.recommendedMonthly);
    selectors.affordabilityActual.textContent = setCurrency(f.monthlyMortgagePayment);
    selectors.affordabilityWarning.textContent = warning;
    selectors.compare15Monthly.textContent = setCurrency(f.loan15Monthly);
    selectors.compare15Interest.textContent = setCurrency(f.summary15.totalInterest);
    selectors.compare30Monthly.textContent = setCurrency(f.loan30Monthly);
    selectors.compare30Interest.textContent = setCurrency(f.summary30.totalInterest);
    selectors.compareDifference.textContent = setCurrency(f.mortgage_compare_interest_diff);
    selectors.comparisonBars.innerHTML = `
      <div class="interest-bar-row"><span>15-year interest</span><div class="interest-bar-track"><div class="interest-bar-fill" style="width:${f.width15}%"></div></div></div>
      <div class="interest-bar-row"><span>30-year interest</span><div class="interest-bar-track"><div class="interest-bar-fill danger" style="width:${f.width30}%"></div></div></div>
    `;

    if (typeof SharedState !== "undefined") SharedState.refreshToolLinks();

    return {
      loan_amount: homePrice,
      interest_rate: annualRate,
      loan_term: totalMonths,
      down_payment: f.downPayment,
      income: num("income", selectors.annualIncome, 0),
      extra_payment: extraMonthly,
      mortgage_down_payment_type: selectors.downPaymentType.value,
      mortgage_down_payment_percent: downPercent,
      property_tax_annual: num("property_tax_annual", selectors.propertyTaxAnnual, 0),
      home_insurance_annual: num("home_insurance_annual", selectors.homeInsuranceAnnual, 0),
      mortgage_lump_sum_payment: lumpSum,
      mortgage_payment_start_month: paymentStartMonth,
      mortgage_computed_loan_amount: f.loanAmount,
      mortgage_monthly_payment: f.monthlyMortgagePayment,
      mortgage_total_interest: summary.totalInterest,
      mortgage_total_cost: f.totalHomeCost,
      mortgage_principal_interest_monthly: f.monthlyPrincipalInterest,
      mortgage_tax_insurance_monthly: f.monthlyEscrow,
      mortgage_summary_total_payments: f.mortgage_summary_total_payments,
      mortgage_summary_total_interest: summary.totalInterest,
      mortgage_payoff_date: payoffDate,
      mortgage_summary_payoff_date: payoffDate,
      mortgage_recommended_payment: f.recommendedMonthly,
      mortgage_actual_payment: f.monthlyMortgagePayment,
      mortgage_compare_15_monthly: f.loan15Monthly,
      mortgage_compare_15_interest: f.summary15.totalInterest,
      mortgage_compare_30_monthly: f.loan30Monthly,
      mortgage_compare_30_interest: f.summary30.totalInterest,
      mortgage_compare_interest_diff: f.mortgage_compare_interest_diff,
      mortgage_affordability_warning: warning
    };
  };

  const paintMortgageCharts = () => {
    renderScheduleTable();
    renderCharts();
  };

  const bindUiEvents = () => {
    if (selectors.toggleAdvanced && selectors.advancedPanel) {
      selectors.toggleAdvanced.addEventListener("click", () => {
        const isOpen = selectors.advancedPanel.classList.toggle("is-open");
        selectors.advancedPanel.setAttribute("aria-hidden", String(!isOpen));
        selectors.toggleAdvanced.textContent = isOpen ? "Hide Advanced: Extra Payments" : "Advanced: Extra Payments";
      });
    }
    if (selectors.toggleSchedule && selectors.schedulePanel) {
      selectors.toggleSchedule.addEventListener("click", () => {
        const isOpen = selectors.schedulePanel.classList.toggle("is-open");
        selectors.schedulePanel.setAttribute("aria-hidden", String(!isOpen));
        selectors.toggleSchedule.textContent = isOpen ? "Hide full amortization schedule" : "Show full amortization schedule";
      });
    }
  };

  const applyGeoDefaults = () => {
    if (typeof GeoFinance === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.has("term") || params.has("loan_term")) return;
    selectors.loanTerm.value = "360";
  };

  const syncDownPaymentUi = () => {
    const isPercent = selectors.downPaymentType.value === "percent";
    selectors.downPaymentPercentField.style.display = isPercent ? "" : "none";
    selectors.downPaymentAmountField.style.display = isPercent ? "none" : "";
  };

  const init = () => {
    if (document.body.dataset.page !== "mortgage-calculator") return;
    if (window.AppEngine) AppEngine.registerToolPipeline("mortgage-calculator", computeMortgage);
    if (window.CalnexAppRender?.registerCharts) {
      CalnexAppRender.registerCharts("mortgage-calculator", paintMortgageCharts);
    }
    applyGeoDefaults();
    syncDownPaymentUi();
    bindUiEvents();
    if (selectors.downPaymentType) {
      selectors.downPaymentType.addEventListener("input", () => {
        syncDownPaymentUi();
      });
    }
    if (window.AppEngine) {
      AppEngine.runImmediate();
    } else if (typeof SharedState !== "undefined") {
      SharedState.setState(computeMortgage(), { engineCommit: true });
      window.CalnexAppRender?.appRenderAll?.("init");
    } else {
      computeMortgage();
      window.CalnexAppRender?.appRenderAll?.("init");
    }
  };

  return { init, computeMortgage };
})();

window.addEventListener("DOMContentLoaded", MortgageCalculator.init);
