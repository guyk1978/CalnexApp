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

  const compoundingMap = {
    yearly: 1,
    monthly: 12,
    daily: 365
  };

  const parseValue = (node) => Number(node?.value) || 0;
  const setCurrency = (value) =>
    (typeof CurrencyLayer !== "undefined"
      ? CurrencyLayer.formatCurrency(value)
      : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(
          Number(value) || 0
        ));

  const getInputs = () => {
    const principal = Math.max(0, parseValue(selectors.principal));
    const annualRate = Math.max(0, parseValue(selectors.rate));
    const years = Math.max(1, parseValue(selectors.years));
    const monthlyContribution = Math.max(0, parseValue(selectors.monthlyContribution));
    const compounding = selectors.compounding.value || "monthly";
    const periodsPerYear = compoundingMap[compounding] || 12;
    return { principal, annualRate, years, monthlyContribution, compounding, periodsPerYear };
  };

  const calculateSimple = ({ principal, annualRate, years }) => principal * (1 + (annualRate / 100) * years);

  const calculateCompoundFinal = ({ principal, annualRate, years, periodsPerYear, monthlyContribution }) => {
    const r = annualRate / 100;
    const totalPeriods = Math.round(years * periodsPerYear);
    const periodicRate = periodsPerYear ? r / periodsPerYear : 0;
    const periodsPerMonth = periodsPerYear / 12;
    const periodicContribution = periodsPerMonth > 0 ? monthlyContribution / periodsPerMonth : 0;

    if (periodicRate === 0) {
      return principal + periodicContribution * totalPeriods;
    }

    const growthFactor = (1 + periodicRate) ** totalPeriods;
    const principalFuture = principal * growthFactor;
    const contributionFuture = periodicContribution * ((growthFactor - 1) / periodicRate);
    return principalFuture + contributionFuture;
  };

  const buildYearlyBreakdown = ({ principal, annualRate, years, periodsPerYear, monthlyContribution }) => {
    const rows = [];
    const r = annualRate / 100;
    const periodicRate = periodsPerYear ? r / periodsPerYear : 0;
    const periodsPerMonth = periodsPerYear / 12;
    const periodicContribution = periodsPerMonth > 0 ? monthlyContribution / periodsPerMonth : 0;

    let balance = principal;
    let contributionSum = 0;
    for (let year = 1; year <= years; year += 1) {
      for (let period = 1; period <= periodsPerYear; period += 1) {
        balance += periodicContribution;
        contributionSum += periodicContribution;
        balance += balance * periodicRate;
      }
      const simpleAtYear = principal * (1 + r * year);
      const principalAndContrib = principal + contributionSum;
      const interestEarned = balance - principalAndContrib;
      rows.push({
        year,
        simpleAmount: simpleAtYear,
        compoundAmount: balance,
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
    const principalPlusContribSeries = rows.map((row) => row.contributions + parseValue(selectors.principal));
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

  const syncSharedState = ({ principal, annualRate, years, monthlyContribution, compounding, compoundAmount, totalInterest }) => {
    if (typeof SharedState === "undefined" || isApplyingSharedState) return;
    SharedState.setState({
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
  };

  const updateResultUI = () => {
    const inputs = getInputs();
    const simpleAmount = calculateSimple(inputs);
    const compoundAmount = calculateCompoundFinal(inputs);
    const baseContributed = inputs.principal + inputs.monthlyContribution * 12 * inputs.years;
    const totalInterest = compoundAmount - baseContributed;
    const rows = buildYearlyBreakdown(inputs);

    renderYearlyTable(rows);
    renderCharts(rows);
    syncSharedState({ ...inputs, compoundAmount, totalInterest });
    if (typeof SharedState !== "undefined") SharedState.refreshToolLinks();
  };

  const bindEvents = () => {
    [selectors.principal, selectors.rate, selectors.years, selectors.compounding, selectors.monthlyContribution].forEach(
      (node) => {
        node.addEventListener("input", updateResultUI);
      }
    );
  };

  const init = () => {
    if (document.body.dataset.page !== "interest-calculator") return;
    isApplyingSharedState = true;
    applySharedState();
    isApplyingSharedState = false;
    bindEvents();
    updateResultUI();
    document.addEventListener("sharedstate:updated", () => {
      isApplyingSharedState = true;
      applySharedState();
      updateResultUI();
      isApplyingSharedState = false;
    });
    document.addEventListener("currency:changed", () => {
      updateResultUI();
    });
  };

  return { init };
})();

window.addEventListener("DOMContentLoaded", InterestCalculator.init);
