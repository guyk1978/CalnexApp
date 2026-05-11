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
  let lastRetirementProjection = [];

  const num = (key, el, fb = 0) =>
    typeof CalnexParse !== "undefined" ? CalnexParse.resolveNumeric(key, el, fb) : Number(el?.value) || fb;
  const getState = () => (typeof SharedState !== "undefined" ? SharedState.getState() : {});
  const getGeo = () => (typeof GeoFinance !== "undefined" ? GeoFinance.getCountryData() : null);
  const getScenarioEngine = () => (typeof ScenarioEngine !== "undefined" ? ScenarioEngine : null);

  const getInputs = () => {
    const currentAge = Math.max(0, num("retirement_current_age", selectors.currentAge, 0));
    const targetAge = Math.max(currentAge + 1, num("retirement_target_age", selectors.targetAge, currentAge + 1));
    return {
      currentAge,
      targetAge,
      currentSavings: Math.max(0, num("retirement_current_savings", selectors.currentSavings, 0)),
      monthlyContribution: Math.max(0, num("retirement_monthly_contribution", selectors.monthlyContribution, 0)),
      annualReturnRate: Math.max(0, num("retirement_return_rate", selectors.annualReturnRate, 0)),
      inflationRate: Math.max(0, num("retirement_inflation_rate", selectors.inflationRate, 0)),
      desiredRetirementIncome: Math.max(0, num("retirement_desired_income", selectors.desiredIncome, 0))
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

  const buildRetirementPatch = (inputs, toolkit) => ({
    retirement_current_age: inputs.currentAge,
    retirement_target_age: inputs.targetAge,
    retirement_current_savings: inputs.currentSavings,
    retirement_monthly_contribution: inputs.monthlyContribution,
    retirement_return_rate: inputs.annualReturnRate,
    retirement_inflation_rate: inputs.inflationRate,
    retirement_desired_income: inputs.desiredRetirementIncome,
    referenceFinancialResult: {
      projectedBalance: 0,
      yearsToRetirement: 0,
      inflationAdjustedGoal: 0,
      estimatedMonthlyIncome: 0,
      fundingGap: 0,
      readinessScore: 0,
      readiness: 0,
      ...(toolkit.referenceFinancialResult && typeof toolkit.referenceFinancialResult === "object"
        ? toolkit.referenceFinancialResult
        : {})
    },
    retirement_years_to_retirement: null,
    retirement_projected_balance: null,
    retirement_inflation_adjusted_goal: null,
    retirement_monthly_income: null,
    retirement_gap: null,
    retirement_funding_gap: null,
    retirement_readiness: null
  });

  const paintRetirementCharts = () => {
    if (!lastRetirementProjection.length) return;
    renderChart(lastRetirementProjection.map((p) => ({ ...p })));
  };

  const runRetirementPipeline = () => {
    if (isApplyingShared) return {};
    if (typeof FinancialCore === "undefined" || typeof FinancialCore.computeRetirementToolkit !== "function") return {};
    const inputs = getInputs();
    const toolkit = FinancialCore.computeRetirementToolkit(inputs);
    lastRetirementProjection = toolkit.projection || [];
    window.referenceFinancialResult = toolkit.referenceFinancialResult;
    if (typeof SharedState !== "undefined") SharedState.refreshToolLinks();
    return buildRetirementPatch(toolkit.inputs, toolkit);
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
            (state.retirement_current_age || num("retirement_current_age", selectors.currentAge, 0)) + 1,
            (state.retirement_target_age || num("retirement_target_age", selectors.targetAge, 65)) + 3
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
            (state.retirement_monthly_contribution || num("retirement_monthly_contribution", selectors.monthlyContribution, 0)) + 250
          )
        });
      });
    }
    if (selectors.scenarioReturnBtn) {
      selectors.scenarioReturnBtn.addEventListener("click", () => {
        const state = getState();
        applyScenarioOverride("Higher return assumption", {
          retirement_return_rate: Math.max(
            0,
            (state.retirement_return_rate || num("retirement_return_rate", selectors.annualReturnRate, 0)) + 1
          )
        });
      });
    }
  };

  const bindEvents = () => {
    bindScenarios();
  };

  const init = () => {
    if (document.body.dataset.page !== "retirement-calculator") return;
    if (window.AppEngine) AppEngine.registerToolPipeline("retirement-calculator", runRetirementPipeline);
    if (window.CalnexAppRender?.registerCharts) {
      CalnexAppRender.registerCharts("retirement-calculator", paintRetirementCharts);
    }
    applyGeoDefaults();
    isApplyingShared = true;
    applySharedState();
    isApplyingShared = false;
    bindEvents();
    if (window.AppEngine) {
      AppEngine.runImmediate();
    } else if (typeof SharedState !== "undefined") {
      SharedState.setState(runRetirementPipeline(), { engineCommit: true });
      window.CalnexAppRender?.appRenderAll?.("init");
    } else {
      runRetirementPipeline();
      window.CalnexAppRender?.appRenderAll?.("init");
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
