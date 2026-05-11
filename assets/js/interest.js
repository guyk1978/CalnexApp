const InterestCalculator = (() => {
  const selectors = {
    principal: document.getElementById("interestPrincipal"),
    rate: document.getElementById("interestRate"),
    years: document.getElementById("interestYears"),
    compounding: document.getElementById("interestCompounding"),
    monthlyContribution: document.getElementById("interestMonthlyContribution"),
    finalAmount: document.getElementById("interestFinalAmount"),
    totalInterest: document.getElementById("interestTotalInterest"),
    simpleAmount: document.getElementById("interestSimpleAmount"),
    compoundAmount: document.getElementById("interestCompoundAmount"),
    yearlyBody: document.getElementById("interestYearlyBody"),
    growthChart: document.getElementById("interestGrowthChart"),
    compareChart: document.getElementById("interestCompareChart")
  };

  let growthChartInstance;
  let compareChartInstance;
  let isApplyingSharedState = false;
  let lastInterestRows = [];

  const compoundingMap = {
    yearly: 1,
    monthly: 12,
    daily: 365
  };

  const num = (key, el, fb = 0) =>
    typeof CalnexParse !== "undefined" ? CalnexParse.resolveNumeric(key, el, fb) : Number(el?.value) || fb;
  const setCurrency = (value) =>
    (typeof CurrencyLayer !== "undefined"
      ? CurrencyLayer.formatCurrency(value)
      : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(
          Number(value) || 0
        ));

  const getInputs = () => {
    const principal = Math.max(0, num("interest_principal", selectors.principal, 0));
    const annualRate = Math.max(0, num("interest_rate", selectors.rate, 0));
    const years = Math.max(1, num("interest_years", selectors.years, 1));
    const monthlyContribution = Math.max(0, num("interest_monthly_contribution", selectors.monthlyContribution, 0));
    const compounding = selectors.compounding.value || "monthly";
    const periodsPerYear = compoundingMap[compounding] || 12;
    return { principal, annualRate, years, monthlyContribution, compounding, periodsPerYear };
  };

  const calculateSimple = ({ principal, annualRate, years }) => principal * (1 + (annualRate / 100) * years);

  const periodicContributionFromMonthly = (monthlyContribution, periodsPerYear) => {
    const pp = periodsPerYear || 12;
    return pp ? (monthlyContribution * 12) / pp : 0;
  };

  const calculateCompoundFinal = ({ principal, annualRate, years, periodsPerYear, monthlyContribution }) => {
    const pp = periodsPerYear || 12;
    const totalPeriods = Math.round(years * pp);
    const c = periodicContributionFromMonthly(monthlyContribution, pp);
    return FinancialCore.compoundGrowth(principal, annualRate, totalPeriods, pp) + FinancialCore.annuityContribution(c, annualRate, totalPeriods, pp);
  };

  const buildYearlyBreakdown = ({ principal, annualRate, years, periodsPerYear, monthlyContribution }) => {
    const rows = [];
    const pp = periodsPerYear || 12;
    const c = periodicContributionFromMonthly(monthlyContribution, pp);
    for (let year = 1; year <= years; year += 1) {
      const nPer = year * pp;
      const compoundAmount =
        FinancialCore.compoundGrowth(principal, annualRate, nPer, pp) + FinancialCore.annuityContribution(c, annualRate, nPer, pp);
      const simpleAtYear = principal * (1 + (annualRate / 100) * year);
      const contributionSum = monthlyContribution * 12 * year;
      const interestEarned = compoundAmount - principal - contributionSum;
      rows.push({
        year,
        simpleAmount: simpleAtYear,
        compoundAmount,
        contributions: contributionSum,
        interestEarned
      });
    }
    return rows;
  };

  const renderYearlyTable = (rows) => {
    selectors.yearlyBody.innerHTML = rows
      .map(
        (row) => `
        <tr>
          <td>${row.year}</td>
          <td>${setCurrency(row.simpleAmount)}</td>
          <td>${setCurrency(row.compoundAmount)}</td>
          <td>${setCurrency(row.contributions)}</td>
          <td>${setCurrency(row.interestEarned)}</td>
        </tr>
      `
      )
      .join("");
  };

  const renderCharts = (rows) => {
    if (!window.Chart) return;
    const labels = rows.map((row) => `Year ${row.year}`);
    const compoundSeries = rows.map((row) => row.compoundAmount);
    const principalPlusContribSeries = rows.map((row) => row.contributions + num("interest_principal", selectors.principal, 0));
    const simpleSeries = rows.map((row) => row.simpleAmount);

    if (growthChartInstance) growthChartInstance.destroy();
    growthChartInstance = new window.Chart(selectors.growthChart, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Compound growth",
            data: compoundSeries,
            borderColor: "#1b63f0",
            tension: 0.25
          },
          {
            label: "Principal + contributions",
            data: principalPlusContribSeries,
            borderColor: "#5f6b7a",
            borderDash: [5, 5],
            tension: 0.25
          }
        ]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });

    if (compareChartInstance) compareChartInstance.destroy();
    compareChartInstance = new window.Chart(selectors.compareChart, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Simple interest",
            data: simpleSeries,
            backgroundColor: "#7a5af8"
          },
          {
            label: "Compound interest",
            data: compoundSeries,
            backgroundColor: "#16a34a"
          }
        ]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
  };

  const applySharedState = () => {
    if (typeof SharedState === "undefined") return;
    const state = SharedState.getState();
    if (state.interest_principal !== undefined) selectors.principal.value = String(state.interest_principal);
    else if (state.loan_amount !== undefined) selectors.principal.value = String(state.loan_amount);
    if (state.interest_rate !== undefined) selectors.rate.value = String(state.interest_rate);
    if (state.interest_years !== undefined) selectors.years.value = String(state.interest_years);
    else if (state.loan_term !== undefined) selectors.years.value = String(Math.max(1, Math.round(state.loan_term / 12)));
    if (state.interest_monthly_contribution !== undefined) {
      selectors.monthlyContribution.value = String(state.interest_monthly_contribution);
    } else if (state.extra_payment !== undefined) {
      selectors.monthlyContribution.value = String(state.extra_payment);
    }
    if (state.interest_compounding) selectors.compounding.value = String(state.interest_compounding);
  };

  const buildInterestPatch = ({ principal, annualRate, years, monthlyContribution, compounding }, compoundAmount, totalInterest) => ({
    loan_amount: principal,
    interest_rate: annualRate,
    loan_term: years * 12,
    extra_payment: monthlyContribution,
    interest_principal: principal,
    interest_years: years,
    interest_monthly_contribution: monthlyContribution,
    interest_compounding: compounding,
    interest_simple_total: calculateSimple({ principal, annualRate, years }),
    interest_compound_total: compoundAmount,
    interest_total_interest: totalInterest,
    interest_final_amount: compoundAmount
  });

  const runInterestPipeline = () => {
    if (isApplyingSharedState) return {};
    const inputs = getInputs();
    const compoundAmount = calculateCompoundFinal(inputs);
    const baseContributed = inputs.principal + inputs.monthlyContribution * 12 * inputs.years;
    const totalInterest = compoundAmount - baseContributed;
    const rows = buildYearlyBreakdown(inputs);
    lastInterestRows = rows;
    if (typeof SharedState !== "undefined") SharedState.refreshToolLinks();
    return buildInterestPatch(inputs, compoundAmount, totalInterest);
  };

  const paintInterestCharts = () => {
    renderYearlyTable(lastInterestRows);
    if (lastInterestRows.length) renderCharts(lastInterestRows);
  };

  const init = () => {
    if (document.body.dataset.page !== "interest-calculator") return;
    if (window.AppEngine) AppEngine.registerToolPipeline("interest-calculator", runInterestPipeline);
    if (window.CalnexAppRender?.registerCharts) {
      CalnexAppRender.registerCharts("interest-calculator", paintInterestCharts);
    }
    isApplyingSharedState = true;
    applySharedState();
    isApplyingSharedState = false;
    if (window.AppEngine) {
      AppEngine.runImmediate();
    } else if (typeof SharedState !== "undefined") {
      SharedState.setState(runInterestPipeline(), { engineCommit: true });
      window.CalnexAppRender?.appRenderAll?.("init");
    } else {
      runInterestPipeline();
      window.CalnexAppRender?.appRenderAll?.("init");
    }
    document.addEventListener("sharedstate:updated", (event) => {
      if (event.detail?.__engineSource === "commit") return;
      isApplyingSharedState = true;
      applySharedState();
      isApplyingSharedState = false;
      if (window.AppEngine) AppEngine.runImmediate();
    });
    document.addEventListener("currency:changed", () => {
      if (window.AppEngine) AppEngine.runImmediate();
    });
  };

  return { init };
})();

window.addEventListener("DOMContentLoaded", InterestCalculator.init);
