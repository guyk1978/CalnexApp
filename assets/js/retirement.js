const RetirementCalculator = (() => {
  const selectors = {
    currentAge: document.getElementById("retirementCurrentAge"),
    targetAge: document.getElementById("retirementTargetAge"),
    currentSavings: document.getElementById("retirementCurrentSavings"),
    monthlyContribution: document.getElementById("retirementMonthlyContribution"),
    annualReturnRate: document.getElementById("retirementAnnualReturnRate"),
    inflationRate: document.getElementById("retirementInflationRate"),
    desiredIncome: document.getElementById("retirementDesiredIncome"),
    growthChart: document.getElementById("retirementGrowthChart"),
    scenarioLaterBtn: document.getElementById("retirementScenarioLaterBtn"),
    scenarioContributionBtn: document.getElementById("retirementScenarioContributionBtn"),
    scenarioReturnBtn: document.getElementById("retirementScenarioReturnBtn")
  };

  let growthChartInstance;
  let isApplyingShared = false;

  const parseValue = (node) => Number(node?.value) || 0;
  const getState = () => (typeof SharedState !== "undefined" ? SharedState.getState() : {});
  const getGeo = () => (typeof GeoFinance !== "undefined" ? GeoFinance.getCountryData() : null);
  const getScenarioEngine = () => (typeof ScenarioEngine !== "undefined" ? ScenarioEngine : null);

  const getInputs = () => {
    const currentAge = Math.max(0, parseValue(selectors.currentAge));
    const targetAge = Math.max(currentAge + 1, parseValue(selectors.targetAge));
    return {
      currentAge,
      targetAge,
      currentSavings: Math.max(0, parseValue(selectors.currentSavings)),
      monthlyContribution: Math.max(0, parseValue(selectors.monthlyContribution)),
      annualReturnRate: Math.max(0, parseValue(selectors.annualReturnRate)),
      inflationRate: Math.max(0, parseValue(selectors.inflationRate)),
      desiredRetirementIncome: Math.max(0, parseValue(selectors.desiredIncome))
    };
  };

  const buildProjectionSeries = ({ currentAge, targetAge, currentSavings, monthlyContribution, annualReturnRate }) => {
    const monthlyRate = annualReturnRate / 100 / 12;
    const years = Math.max(0, targetAge - currentAge);
    const points = [{ age: currentAge, balance: currentSavings }];
    let balance = currentSavings;
    for (let year = 1; year <= years; year += 1) {
      for (let month = 1; month <= 12; month += 1) {
        balance += monthlyContribution;
        if (monthlyRate > 0) {
          balance += balance * monthlyRate;
        }
      }
      points.push({ age: currentAge + year, balance });
    }
    return points;
  };

  const calculate = (inputs) => {
    const yearsToRetirement = Math.max(0, inputs.targetAge - inputs.currentAge);
    const projection = buildProjectionSeries(inputs);
    const projectedBalance = projection.length ? projection[projection.length - 1].balance : inputs.currentSavings;
    const inflationAdjustedGoal = inputs.desiredRetirementIncome * (1 + inputs.inflationRate / 100) ** yearsToRetirement;
    const monthlyIncomeEstimate = (projectedBalance * 0.04) / 12;
    const targetMonthlyIncome = inflationAdjustedGoal / 12;
    const fundingGap = Math.max(0, targetMonthlyIncome - monthlyIncomeEstimate);
    const readinessPercent = targetMonthlyIncome > 0 ? Math.min(100, (monthlyIncomeEstimate / targetMonthlyIncome) * 100) : 0;
    return {
      yearsToRetirement,
      projectedBalance,
      inflationAdjustedGoal,
      monthlyIncomeEstimate,
      fundingGap,
      readinessPercent,
      projection
    };
  };

  const renderChart = (projection) => {
    if (!window.Chart || !selectors.growthChart) return;
    if (growthChartInstance) growthChartInstance.destroy();
    growthChartInstance = new window.Chart(selectors.growthChart, {
      type: "line",
      data: {
        labels: projection.map((point) => `Age ${point.age}`),
        datasets: [
          {
            label: "Projected Retirement Balance",
            data: projection.map((point) => Number(point.balance.toFixed(2))),
            borderColor: "#1b63f0",
            backgroundColor: "rgba(27, 99, 240, 0.15)",
            tension: 0.2
          }
        ]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
  };

  const buildRetirementPatch = (inputs, outputs) => ({
    retirement_current_age: inputs.currentAge,
    retirement_target_age: inputs.targetAge,
    retirement_current_savings: inputs.currentSavings,
    retirement_monthly_contribution: inputs.monthlyContribution,
    retirement_return_rate: inputs.annualReturnRate,
    retirement_inflation_rate: inputs.inflationRate,
    retirement_desired_income: inputs.desiredRetirementIncome,
    retirement_years_to_retirement: outputs.yearsToRetirement,
    retirement_projected_balance: outputs.projectedBalance,
    retirement_inflation_adjusted_goal: outputs.inflationAdjustedGoal,
    retirement_monthly_income: outputs.monthlyIncomeEstimate,
    retirement_gap: outputs.fundingGap,
    retirement_funding_gap: outputs.fundingGap,
    retirement_readiness: outputs.readinessPercent
  });

  const runRetirementPipeline = () => {
    if (isApplyingShared) return {};
    const inputs = getInputs();
    const outputs = calculate(inputs);
    renderChart(outputs.projection);
    if (typeof SharedState !== "undefined") SharedState.refreshToolLinks();
    return buildRetirementPatch(inputs, outputs);
  };

  const applyGeoDefaults = () => {
    const state = getState();
    if (state.retirement_return_rate !== undefined || state.retirement_inflation_rate !== undefined) return;
    const geo = getGeo();
    if (!geo || typeof SharedState === "undefined") return;
    SharedState.setState(
      {
        retirement_return_rate: Number(geo.average_interest_rate) || 6,
        retirement_inflation_rate: Number(geo.inflation_rate) || 2.5
      },
      { system: true }
    );
  };

  const applySharedState = () => {
    const state = getState();
    if (state.retirement_current_age !== undefined) selectors.currentAge.value = String(state.retirement_current_age);
    if (state.retirement_target_age !== undefined) selectors.targetAge.value = String(state.retirement_target_age);
    if (state.retirement_current_savings !== undefined) selectors.currentSavings.value = String(state.retirement_current_savings);
    if (state.retirement_monthly_contribution !== undefined) {
      selectors.monthlyContribution.value = String(state.retirement_monthly_contribution);
    }
    if (state.retirement_return_rate !== undefined) selectors.annualReturnRate.value = String(state.retirement_return_rate);
    if (state.retirement_inflation_rate !== undefined) selectors.inflationRate.value = String(state.retirement_inflation_rate);
    if (state.retirement_desired_income !== undefined) selectors.desiredIncome.value = String(state.retirement_desired_income);
  };

  const applyScenarioOverride = (name, patch) => {
    const engine = getScenarioEngine();
    if (!engine) return;
    const scenario = engine.createScenario(name, patch);
    engine.applyScenario(scenario.id);
  };

  const bindScenarios = () => {
    if (selectors.scenarioLaterBtn) {
      selectors.scenarioLaterBtn.addEventListener("click", () => {
        const state = getState();
        applyScenarioOverride("Retire 3 years later", {
          retirement_target_age: Math.max(
            (state.retirement_current_age || parseValue(selectors.currentAge)) + 1,
            (state.retirement_target_age || parseValue(selectors.targetAge)) + 3
          )
        });
      });
    }
    if (selectors.scenarioContributionBtn) {
      selectors.scenarioContributionBtn.addEventListener("click", () => {
        const state = getState();
        applyScenarioOverride("Increase retirement contribution", {
          retirement_monthly_contribution: Math.max(
            0,
            (state.retirement_monthly_contribution || parseValue(selectors.monthlyContribution)) + 250
          )
        });
      });
    }
    if (selectors.scenarioReturnBtn) {
      selectors.scenarioReturnBtn.addEventListener("click", () => {
        const state = getState();
        applyScenarioOverride("Higher return assumption", {
          retirement_return_rate: Math.max(0, (state.retirement_return_rate || parseValue(selectors.annualReturnRate)) + 1)
        });
      });
    }
  };

  const bindEvents = () => {
    [
      selectors.currentAge,
      selectors.targetAge,
      selectors.currentSavings,
      selectors.monthlyContribution,
      selectors.annualReturnRate,
      selectors.inflationRate,
      selectors.desiredIncome
    ].forEach((node) => {
      if (!node) return;
      node.addEventListener("input", () => {
        if (window.AppEngine) AppEngine.notifyToolInput();
      });
    });
    bindScenarios();
  };

  const init = () => {
    if (document.body.dataset.page !== "retirement-calculator") return;
    if (window.AppEngine) AppEngine.registerToolPipeline("retirement-calculator", runRetirementPipeline);
    applyGeoDefaults();
    isApplyingShared = true;
    applySharedState();
    isApplyingShared = false;
    bindEvents();
    if (window.AppEngine) {
      AppEngine.runImmediate();
    } else if (typeof SharedState !== "undefined") {
      SharedState.setState(runRetirementPipeline(), { engineCommit: true });
    } else {
      runRetirementPipeline();
    }
    document.addEventListener("sharedstate:updated", (event) => {
      if (event.detail?.__engineSource === "commit") return;
      isApplyingShared = true;
      applySharedState();
      isApplyingShared = false;
      if (window.AppEngine) AppEngine.runImmediate();
    });
    document.addEventListener("currency:changed", () => {
      if (window.AppEngine) AppEngine.runImmediate();
    });
    document.addEventListener("geo:changed", () => {
      applyGeoDefaults();
      if (window.AppEngine) AppEngine.runImmediate();
    });
  };

  return { init };
})();

window.addEventListener("DOMContentLoaded", RetirementCalculator.init);
