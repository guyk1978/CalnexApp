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

  /** Single retirement FV primitive — same path as `referenceFinancialResult.projectedBalance`. */
  const referenceBalanceAtMonths = (inputs, months) => {
    if (typeof FinancialCore === "undefined" || typeof FinancialCore.calculateReferenceRetirement !== "function") {
      return null;
    }
    const m = Math.max(0, Math.round(Number(months) || 0));
    return FinancialCore.calculateReferenceRetirement({
      initial: inputs.currentSavings,
      monthly: inputs.monthlyContribution,
      annualReturn: inputs.annualReturnRate,
      months: m
    });
  };

  /**
   * Chart series: only `calculateReferenceRetirement` by month (no parallel compounding loops).
   * Terminal row uses `terminalProjectedBalance` (must equal UI `referenceFinancialResult.projectedBalance`).
   */
  const buildReferenceRetirementChartSeries = (inputs, nMonths, terminalProjectedBalance) => {
    const { currentAge, currentSavings } = inputs;
    const points = [{ age: currentAge, balance: currentSavings }];
    if (nMonths <= 0) return points;

    const refAt = (m) => referenceBalanceAtMonths(inputs, m);
    if (refAt(12) === null) {
      points.push({ age: currentAge + nMonths / 12, balance: terminalProjectedBalance });
      return points;
    }

    for (let m = 12; m <= nMonths; m += 12) {
      points.push({ age: currentAge + m / 12, balance: refAt(m) });
    }
    if (nMonths % 12 !== 0) {
      points.push({
        age: currentAge + nMonths / 12,
        balance: terminalProjectedBalance
      });
    }

    const last = points[points.length - 1];
    if (last && Number.isFinite(terminalProjectedBalance)) {
      const tol = Math.max(1e-9 * Math.max(1, Math.abs(terminalProjectedBalance)), 0.01);
      if (Math.abs(last.balance - terminalProjectedBalance) > tol) {
        last.balance = terminalProjectedBalance;
      }
    }
    return points;
  };

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

  const retirementHorizonMonths = ({ currentAge, targetAge }) =>
    Math.max(0, Math.round((Math.max(0, targetAge - currentAge) || 0) * 12));

  const diagnoseRetirementMismatch = (engineNominal, referenceFV, inputs, nMonths) => {
    const { currentSavings: P, monthlyContribution: C, annualReturnRate: rPct } = inputs;
    if (referenceFV <= 0) return "reference_zero";
    const ratio = engineNominal / referenceFV;
    if (ratio <= 1.0000001 && ratio >= 0.9999999) return "aligned";
    const half = Math.max(1, Math.floor(nMonths / 2));
    const refHalf = FinancialCore.calculateReferenceRetirement({
      initial: P,
      monthly: C,
      annualReturn: rPct,
      months: half
    });
    const engHalf =
      FinancialCore.compoundGrowth(P, rPct, half, 12) + FinancialCore.annuityContribution(C, rPct, half, 12);
    if (Math.abs(engHalf - refHalf) < 1e-6 && ratio > 1.05) return "possible_horizon_or_month_rounding";
    if (ratio > 1.3) return "possible_duplicate_compounding_or_rate_scaling";
    if (ratio < 0.7) return "possible_contribution_undercount_or_rate_too_low";
    return "engine_reference_mismatch";
  };

  const calculate = (inputs) => {
    const yearsToRetirement = Math.max(0, inputs.targetAge - inputs.currentAge);
    const nMonths = retirementHorizonMonths(inputs);

    if (typeof FinancialCore === "undefined") {
      const projectedBalance = inputs.currentSavings;
      const projection = buildReferenceRetirementChartSeries(inputs, nMonths, projectedBalance);
      const referenceFinancialResult = { projectedBalance };
      window.referenceFinancialResult = referenceFinancialResult;
      return { referenceFinancialResult, projection };
    }

    const referenceFV = FinancialCore.calculateReferenceRetirement({
      initial: inputs.currentSavings,
      monthly: inputs.monthlyContribution,
      annualReturn: inputs.annualReturnRate,
      months: nMonths
    });
    const projection = buildReferenceRetirementChartSeries(inputs, nMonths, referenceFV);

    const engineSim = FinancialCore.simulateFinancialPlan({
      initial: inputs.currentSavings,
      monthly: inputs.monthlyContribution,
      annualReturn: inputs.annualReturnRate,
      years: yearsToRetirement,
      months: nMonths,
      inflation: inputs.inflationRate
    });
    const engineNominal = engineSim.nominalFinalBalance;
    const denom = Math.max(referenceFV, 1);
    const deviation = Math.abs(engineNominal - referenceFV) / denom;
    if (deviation > 0.3) {
      console.error("[RETIREMENT] INVALID — engine vs reference baseline", {
        INVALID: true,
        engineNominal,
        referenceFV,
        deviationPct: Math.round(deviation * 1000) / 10,
        nMonths,
        yearsToRetirement,
        diagnosis: diagnoseRetirementMismatch(engineNominal, referenceFV, inputs, nMonths)
      });
    } else if (deviation > 1e-9) {
      console.warn("[RETIREMENT] engine/reference drift (UI uses reference only)", {
        engineNominal,
        referenceFV,
        deviationPct: Math.round(deviation * 1e6) / 1e4
      });
    }
    const referenceFinancialResult = { projectedBalance: referenceFV };
    window.referenceFinancialResult = referenceFinancialResult;
    return {
      referenceFinancialResult,
      projection
    };
  };

  const alignChartSeriesToUiProjectedBalance = (series, uiProjectedBalance) => {
    if (!series.length || uiProjectedBalance == null || !Number.isFinite(uiProjectedBalance)) return series;
    const last = series[series.length - 1];
    const tol = Math.max(1e-9 * Math.max(1, Math.abs(uiProjectedBalance)), 0.01);
    if (Math.abs(last.balance - uiProjectedBalance) <= tol) return series;
    console.error("[CHART_MISMATCH_DETECTED]", {
      chartTerminal: last.balance,
      uiProjectedBalance
    });
    const denom = Math.abs(last.balance) > tol ? last.balance : 1;
    const scale = uiProjectedBalance / denom;
    return series.map((p, i) => (i === 0 ? p : { ...p, balance: p.balance * scale }));
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
    referenceFinancialResult: outputs.referenceFinancialResult,
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
    const state = getState();
    const uiBal = state.referenceFinancialResult?.projectedBalance;
    let series = lastRetirementProjection.map((p) => ({ ...p }));
    series = alignChartSeriesToUiProjectedBalance(series, uiBal);
    console.log("[CHART TRACE] source = referenceFinancialResult", {
      points: series.length,
      chartTerminal: series[series.length - 1]?.balance,
      uiProjectedBalance: uiBal
    });
    renderChart(series);
  };

  const runRetirementPipeline = () => {
    if (isApplyingShared) return {};
    const inputs = getInputs();
    const outputs = calculate(inputs);
    lastRetirementProjection = outputs.projection || [];
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
