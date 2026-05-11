const FinancialDashboard = (() => {
  const selectors = {
    loanTotalLoans: document.getElementById("dashLoanCount"),
    loanMonthly: document.getElementById("dashLoanMonthly"),
    loanInterest: document.getElementById("dashLoanInterest"),
    mortgageMonthly: document.getElementById("dashMortgageMonthly"),
    mortgageCost: document.getElementById("dashMortgageCost"),
    mortgageAffordability: document.getElementById("dashMortgageAffordability"),
    carMonthly: document.getElementById("dashCarMonthly"),
    carCost: document.getElementById("dashCarCost"),
    growthProjection: document.getElementById("dashGrowthProjection"),
    growthSummary: document.getElementById("dashGrowthSummary"),
    countryCode: document.getElementById("dashCountryCode"),
    countryLabel: document.getElementById("dashCountryLabel"),
    geoSummary: document.getElementById("dashGeoSummary"),
    geoComparison: document.getElementById("dashGeoComparison"),
    affordabilityScore: document.getElementById("dashAffordabilityScore"),
    affordabilityBadge: document.getElementById("dashAffordabilityBadge"),
    debtIncomeChart: document.getElementById("dashDebtIncomeChart"),
    obligationsChart: document.getElementById("dashObligationsChart"),
    interestBurdenChart: document.getElementById("dashInterestBurdenChart"),
    scenarioModeToggle: document.getElementById("scenarioModeToggle"),
    createScenarioBtn: document.getElementById("createScenarioBtn"),
    resetScenarioBtn: document.getElementById("resetScenarioBtn"),
    presetExtra10Btn: document.getElementById("presetExtra10Btn"),
    presetReduceTermBtn: document.getElementById("presetReduceTermBtn"),
    presetRefinanceBtn: document.getElementById("presetRefinanceBtn"),
    scenarioCompareA: document.getElementById("scenarioCompareA"),
    scenarioCompareB: document.getElementById("scenarioCompareB"),
    scenarioActiveLabel: document.getElementById("scenarioActiveLabel"),
    scenarioShareLink: document.getElementById("scenarioShareLink"),
    scenarioDeltaMonthly: document.getElementById("scenarioDeltaMonthly"),
    scenarioDeltaInterest: document.getElementById("scenarioDeltaInterest"),
    scenarioDeltaPayoff: document.getElementById("scenarioDeltaPayoff"),
    scenarioDeltaAffordability: document.getElementById("scenarioDeltaAffordability"),
    scenarioComparisonChart: document.getElementById("scenarioComparisonChart"),
    scenarioTimelineChart: document.getElementById("scenarioTimelineChart")
  };

  let debtIncomeChart;
  let obligationsChart;
  let interestBurdenChart;
  let scenarioComparisonChart;
  let scenarioTimelineChart;

  const setCurrency = (value) =>
    (typeof CurrencyLayer !== "undefined"
      ? CurrencyLayer.formatCurrency(value)
      : new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
          maximumFractionDigits: 2
        }).format(Number(value) || 0));

  const setPercent = (value) => `${Math.round((Number(value) || 0) * 100)}%`;

  const getShared = () => (typeof SharedState !== "undefined" ? SharedState.getState() : {});
  const getScenarioEngine = () => (typeof ScenarioEngine !== "undefined" ? ScenarioEngine : null);
  const getGeo = () => (typeof GeoFinance !== "undefined" ? GeoFinance : null);
  let syncingDerived = false;
  const setDerivedState = (patch) => {
    window.AppDerivedState = Object.assign({}, window.AppDerivedState || {}, patch);
    if (syncingDerived) return;
    if (typeof UiRenderer !== "undefined" && typeof UiRenderer.renderOutputs === "function") {
      syncingDerived = true;
      UiRenderer.renderOutputs();
      syncingDerived = false;
    }
  };

  const getTotalMonthlyObligations = (state) =>
    (state.loan_monthly_payment || 0) + (state.mortgage_monthly_payment || 0) + (state.car_monthly_payment || 0);

  const renderCards = (state) => {
    const loanMonthly = state.loan_monthly_payment || 0;
    const mortgageMonthly = state.mortgage_monthly_payment || 0;
    const carMonthly = state.car_monthly_payment || 0;
    const totalInterest = (state.loan_total_interest || 0) + (state.mortgage_total_interest || 0) + (state.car_total_interest || 0);
    const monthlyIncome = (state.income || 0) / 12;
    const obligations = getTotalMonthlyObligations(state);
    const obligationRatio = monthlyIncome > 0 ? obligations / monthlyIncome : 0;

    const derivedPatch = {
      dashboard_loan_count: [loanMonthly, mortgageMonthly, carMonthly].filter((value) => value > 0).length,
      dashboard_mortgage_affordability:
        monthlyIncome > 0 ? `${setPercent(mortgageMonthly / monthlyIncome)} of monthly income` : "Set income in tools"
    };

    const hasInterestProjection = (state.interest_compound_total || 0) > 0;
    if (hasInterestProjection) {
      const years = state.interest_years || Math.max(1, Math.round((state.loan_term || 120) / 12));
      derivedPatch.dashboard_growth_projection = state.interest_compound_total || 0;
      derivedPatch.dashboard_growth_summary = `${years}-year projection from Interest Calculator (${String(
        state.interest_compounding || "monthly"
      )} compounding).`;
    } else {
      const yearlyContribution = (state.income || 0) * 0.1;
      const yearlyRate = Math.max(0.01, (state.interest_rate || 5) / 100);
      const projection = yearlyContribution * (((1 + yearlyRate) ** 10 - 1) / yearlyRate);
      derivedPatch.dashboard_growth_projection = projection;
      derivedPatch.dashboard_growth_summary = `10-year projection using ${setPercent(
        yearlyRate
      )} annual compound rate on 10% income contribution.`;
    }

    let scoreLabel = "Safe";
    let scoreClass = "status-green";
    if (obligationRatio > 0.45) {
      scoreLabel = "Overleveraged";
      scoreClass = "status-red";
    } else if (obligationRatio > 0.3) {
      scoreLabel = "Caution";
      scoreClass = "status-yellow";
    }
    derivedPatch.dashboard_affordability_score = monthlyIncome > 0 ? setPercent(obligationRatio) : "N/A";
    derivedPatch.dashboard_affordability_badge = scoreLabel;
    selectors.affordabilityBadge.classList.remove("status-green", "status-yellow", "status-red");
    selectors.affordabilityBadge.classList.add(scoreClass);

    const geo = getGeo();
    if (geo && selectors.countryCode) {
      const code = state.selected_country || geo.getSelectedCountry();
      const local = geo.getCountryData(code);
      const globalAvg = geo.getGlobalAverage();
      derivedPatch.dashboard_country_code = code;
      derivedPatch.dashboard_country_label = local.label || code;
      derivedPatch.dashboard_geo_summary = `Avg rate ${setPercent(local.average_interest_rate / 100)}, inflation ${setPercent(
        local.inflation_rate / 100
      )}, avg income ${setCurrency(local.average_income)}, norm term ${local.loan_norm_years} years.`;
      const rateDiff = local.average_interest_rate - globalAvg.average_interest_rate;
      const incomeDiff = local.average_income - globalAvg.average_income;
      derivedPatch.dashboard_geo_comparison = `Vs global average: rate ${rateDiff >= 0 ? "+" : ""}${rateDiff.toFixed(
        2
      )} pts, income ${incomeDiff >= 0 ? "+" : "-"}${setCurrency(Math.abs(incomeDiff))}.`;
    }
    setDerivedState(derivedPatch);

    return { monthlyIncome, obligations, totalInterest, loanMonthly, mortgageMonthly, carMonthly };
  };

  const renderCharts = (summary) => {
    if (!window.Chart) return;
    if (debtIncomeChart) debtIncomeChart.destroy();
    if (obligationsChart) obligationsChart.destroy();
    if (interestBurdenChart) interestBurdenChart.destroy();

    debtIncomeChart = new window.Chart(selectors.debtIncomeChart, {
      type: "bar",
      data: {
        labels: ["Monthly Income", "Monthly Obligations"],
        datasets: [
          {
            label: "Amount",
            data: [summary.monthlyIncome, summary.obligations],
            backgroundColor: ["#1b63f0", "#5f6b7a"]
          }
        ]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });

    obligationsChart = new window.Chart(selectors.obligationsChart, {
      type: "doughnut",
      data: {
        labels: ["Loan", "Mortgage", "Car"],
        datasets: [
          {
            data: [summary.loanMonthly, summary.mortgageMonthly, summary.carMonthly],
            backgroundColor: ["#1b63f0", "#7a5af8", "#16a34a"]
          }
        ]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });

    interestBurdenChart = new window.Chart(selectors.interestBurdenChart, {
      type: "line",
      data: {
        labels: ["Loan", "Mortgage", "Car", "Total"],
        datasets: [
          {
            label: "Interest Burden",
            data: [summary.loanMonthly * 12, summary.mortgageMonthly * 12, summary.carMonthly * 12, summary.totalInterest],
            borderColor: "#b7791f",
            tension: 0.25
          }
        ]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
  };

  const formatDelta = (value, suffix = "") => {
    const sign = value > 0 ? "+" : "";
    return `${sign}${value.toFixed(2)}${suffix}`;
  };

  const upsertOption = (select, value, label) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    select.append(option);
  };

  const refreshScenarioSelectors = () => {
    const engine = getScenarioEngine();
    if (!engine || !selectors.scenarioCompareA || !selectors.scenarioCompareB) return;
    const scenarios = engine.getScenarios();
    selectors.scenarioCompareA.innerHTML = "";
    selectors.scenarioCompareB.innerHTML = "";
    scenarios.forEach((scenario) => {
      upsertOption(selectors.scenarioCompareA, scenario.id, scenario.name);
      upsertOption(selectors.scenarioCompareB, scenario.id, scenario.name);
    });
    if (scenarios.length > 1) {
      selectors.scenarioCompareA.value = scenarios[0].id;
      selectors.scenarioCompareB.value = scenarios[1].id;
    } else if (scenarios.length === 1) {
      selectors.scenarioCompareA.value = scenarios[0].id;
      selectors.scenarioCompareB.value = scenarios[0].id;
    }
  };

  const renderScenarioCharts = (comparison) => {
    if (!window.Chart || !comparison) return;
    if (scenarioComparisonChart) scenarioComparisonChart.destroy();
    if (scenarioTimelineChart) scenarioTimelineChart.destroy();
    scenarioComparisonChart = new window.Chart(selectors.scenarioComparisonChart, {
      type: "bar",
      data: {
        labels: ["Monthly Payment", "Total Interest", "Payoff Months"],
        datasets: [
          {
            label: comparison.first.name,
            data: [comparison.first.monthlyPayment, comparison.first.totalInterest, comparison.first.payoffMonths],
            backgroundColor: "#1b63f0"
          },
          {
            label: comparison.second.name,
            data: [comparison.second.monthlyPayment, comparison.second.totalInterest, comparison.second.payoffMonths],
            backgroundColor: "#7a5af8"
          }
        ]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });

    const maxMonths = Math.max(comparison.first.payoffMonths, comparison.second.payoffMonths, 1);
    const firstLine = [];
    const secondLine = [];
    for (let index = 1; index <= maxMonths; index += 1) {
      const firstRatio = Math.max(0, 1 - index / comparison.first.payoffMonths);
      const secondRatio = Math.max(0, 1 - index / comparison.second.payoffMonths);
      firstLine.push(firstRatio * comparison.first.monthlyPayment * comparison.first.payoffMonths);
      secondLine.push(secondRatio * comparison.second.monthlyPayment * comparison.second.payoffMonths);
    }
    scenarioTimelineChart = new window.Chart(selectors.scenarioTimelineChart, {
      type: "line",
      data: {
        labels: Array.from({ length: maxMonths }, (_, idx) => `M${idx + 1}`),
        datasets: [
          {
            label: `${comparison.first.name} timeline`,
            data: firstLine,
            borderColor: "#1b63f0",
            tension: 0.2
          },
          {
            label: `${comparison.second.name} timeline`,
            data: secondLine,
            borderColor: "#16a34a",
            tension: 0.2
          }
        ]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
  };

  const renderComparison = () => {
    const engine = getScenarioEngine();
    if (!engine) return;
    const scenarioA = selectors.scenarioCompareA.value;
    const scenarioB = selectors.scenarioCompareB.value;
    const comparison = engine.compareScenarios(scenarioA, scenarioB);
    if (!comparison) return;
    setDerivedState({
      scenario_delta_monthly: `${comparison.delta.monthlyPayment >= 0 ? "+" : "-"}${setCurrency(
        Math.abs(comparison.delta.monthlyPayment)
      )}`,
      scenario_delta_interest: `${comparison.delta.totalInterest >= 0 ? "+" : "-"}${setCurrency(
        Math.abs(comparison.delta.totalInterest)
      )}`,
      scenario_delta_payoff: formatDelta(comparison.delta.payoffMonths, " mo"),
      scenario_delta_affordability: formatDelta(comparison.delta.affordabilityRatio * 100, "%")
    });
    renderScenarioCharts(comparison);
  };

  const applyPreset = (presetKey) => {
    const engine = getScenarioEngine();
    if (!engine) return;
    const preset = engine.getPresetScenarios().find((item) => item.key === presetKey);
    if (!preset) return;
    const scenario = engine.createScenario(preset.label, preset.overrides, preset.key);
    engine.applyScenario(scenario.id);
    refreshScenarioSelectors();
    renderComparison();
  };

  const bindScenarioUi = () => {
    const engine = getScenarioEngine();
    if (!engine) return;
    refreshScenarioSelectors();
    selectors.scenarioModeToggle.addEventListener("change", () => {
      if (!selectors.scenarioModeToggle.checked) {
        engine.resetToBaseline();
      } else {
        engine.captureBaseline();
      }
    });

    selectors.createScenarioBtn.addEventListener("click", () => {
      const name = window.prompt("Scenario name", `Scenario ${new Date().toLocaleTimeString()}`);
      if (!name) return;
      const extraPayment = Number(window.prompt("Extra payment (monthly)", "0")) || 0;
      const rateDelta = Number(window.prompt("Interest rate adjustment (e.g. -1 for refinance)", "0")) || 0;
      const termDelta = Number(window.prompt("Loan term adjustment in months (negative reduces term)", "0")) || 0;
      const incomeDelta = Number(window.prompt("Income adjustment (optional)", "0")) || 0;
      const state = getShared();
      const scenarioId = name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
      const scenario = engine.createScenario(name, {
        extra_payment: Math.max(0, (state.extra_payment || 0) + extraPayment),
        interest_rate: Math.max(0, (state.interest_rate || 0) + rateDelta),
        loan_term: Math.max(1, (state.loan_term || 1) + termDelta),
        income: Math.max(0, (state.income || 0) + incomeDelta)
      }, scenarioId || undefined);
      engine.applyScenario(scenario.id);
      refreshScenarioSelectors();
      renderComparison();
    });

    selectors.resetScenarioBtn.addEventListener("click", () => {
      engine.resetToBaseline();
      selectors.scenarioModeToggle.checked = false;
    });

    selectors.presetExtra10Btn.addEventListener("click", () => applyPreset("extra_10_percent"));
    selectors.presetReduceTermBtn.addEventListener("click", () => applyPreset("reduce_term"));
    selectors.presetRefinanceBtn.addEventListener("click", () => applyPreset("refinance_lower_rate"));
    selectors.scenarioCompareA.addEventListener("change", renderComparison);
    selectors.scenarioCompareB.addEventListener("change", renderComparison);
  };

  const renderAll = () => {
    const state = getShared();
    const summary = renderCards(state);
    renderCharts(summary);
    renderComparison();
  };

  const init = () => {
    if (document.body.dataset.page !== "dashboard") return;
    bindScenarioUi();
    renderAll();
    const activeScenario = getShared().scenario;
    if (activeScenario) {
      selectors.scenarioModeToggle.checked = true;
    }
    if (typeof SharedState !== "undefined") SharedState.refreshToolLinks();
  };

  const renderFromState = () => {
    if (document.body.dataset.page !== "dashboard") return;
    renderAll();
  };

  return { init, renderFromState };
})();

window.addEventListener("DOMContentLoaded", FinancialDashboard.init);
