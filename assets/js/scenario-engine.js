const ScenarioEngine = (() => {
  const STORAGE_KEY = "calnex_scenarios";
  let baselineState = {};
  let scenarios = [];

  const clone = (value) => JSON.parse(JSON.stringify(value));
  const uid = () => `sc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const nowIso = () => new Date().toISOString();
  const getShared = () => (typeof SharedState !== "undefined" ? SharedState.getState() : {});
  const setShared = (next) => {
    if (typeof SharedState !== "undefined") SharedState.setState(next);
  };

  const load = () => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      scenarios = Array.isArray(parsed)
        ? parsed.map((item) => ({
            id: item.id,
            name: item.name || "Scenario",
            createdAt: item.createdAt || nowIso(),
            state: item.state || item.overrides || {}
          }))
        : [];
    } catch (_error) {
      scenarios = [];
    }
  };

  const save = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(scenarios));
    } catch (_error) {
      // ignore storage failures in static mode
    }
  };

  const captureBaseline = () => {
    const state = getShared();
    baselineState = {
      loan_amount: state.loan_amount || 0,
      interest_rate: state.interest_rate || 0,
      loan_term: state.loan_term || 0,
      extra_payment: state.extra_payment || 0,
      down_payment: state.down_payment || 0,
      income: state.income || 0,
      selected_country: state.selected_country || "US",
      geo_defaults: state.geo_defaults || (typeof GeoFinance !== "undefined" ? GeoFinance.getCountryData() : {})
    };
    return clone(baselineState);
  };

  const applyOverrides = (base, overrides = {}) => {
    const next = { ...base };
    Object.entries(overrides).forEach(([key, value]) => {
      if (value === null || value === undefined) return;
      if (typeof value === "number") {
        next[key] = value;
        return;
      }
      if (typeof value === "string" && value.trim() !== "") {
        const parsed = Number(value);
        next[key] = Number.isFinite(parsed) ? parsed : value;
        return;
      }
      if (typeof value === "object") {
        next[key] = { ...value };
      }
    });
    return next;
  };

  const getMonthlyPayment = (principal, annualRate, totalMonths) => {
    if (!principal || !totalMonths) return 0;
    const monthlyRate = annualRate / 100 / 12;
    if (monthlyRate === 0) return principal / totalMonths;
    const factor = (1 + monthlyRate) ** totalMonths;
    return (principal * monthlyRate * factor) / (factor - 1);
  };

  const summarize = (state) => {
    const principal = Number(state.loan_amount) || 0;
    const annualRate = Number(state.interest_rate) || 0;
    const months = Math.max(1, Number(state.loan_term) || 1);
    const extra = Math.max(0, Number(state.extra_payment) || 0);
    const monthlyIncome = (Number(state.income) || 0) / 12;
    const monthlyPayment = getMonthlyPayment(principal, annualRate, months);
    const monthlyRate = annualRate / 100 / 12;
    let balance = principal;
    let month = 0;
    let totalInterest = 0;
    const maxIterations = Math.max(1200, months + 240);
    while (balance > 0 && month < maxIterations) {
      const interest = monthlyRate === 0 ? 0 : balance * monthlyRate;
      const basePrincipal = Math.max(0, monthlyPayment - interest);
      const principalPaid = Math.min(balance, basePrincipal + extra);
      balance = Math.max(0, balance - principalPaid);
      totalInterest += interest;
      month += 1;
    }
    const affordabilityRatio = monthlyIncome > 0 ? (monthlyPayment + extra) / monthlyIncome : 0;
    let affordabilityScore = "safe";
    if (affordabilityRatio > 0.45) affordabilityScore = "overleveraged";
    else if (affordabilityRatio > 0.3) affordabilityScore = "caution";
    return {
      monthlyPayment: monthlyPayment + extra,
      totalInterest,
      payoffMonths: month,
      affordabilityRatio,
      affordabilityScore
    };
  };

  const getCurrentOverrides = () => {
    const base = baselineState && Object.keys(baselineState).length ? baselineState : captureBaseline();
    const current = getShared();
    const keys = ["extra_payment", "interest_rate", "loan_term", "income", "selected_country"];
    const overrides = {};
    keys.forEach((key) => {
      if (typeof base[key] === "string" || typeof current[key] === "string") {
        if (String(base[key] || "") !== String(current[key] || "")) {
          overrides[key] = String(current[key] || "");
        }
      } else {
        const baseValue = Number(base[key] || 0);
        const currentValue = Number(current[key] || 0);
        if (Math.abs(currentValue - baseValue) > 0.0001) {
          overrides[key] = currentValue;
        }
      }
    });
    return overrides;
  };

  const createScenario = (name, overrides = {}, id) => {
    const base = baselineState && Object.keys(baselineState).length ? baselineState : captureBaseline();
    const scenarioId = id || uid();
    const existing = scenarios.find((item) => item.id === scenarioId);
    if (existing) {
      existing.name = name || existing.name;
      existing.state = { ...overrides };
      save();
      document.dispatchEvent(new CustomEvent("scenarioengine:updated"));
      return { ...existing, appliedState: applyOverrides(base, existing.state) };
    }
    const scenario = {
      id: scenarioId,
      name: name || `Scenario ${scenarios.length + 1}`,
      createdAt: nowIso(),
      state: { ...overrides }
    };
    scenarios.push(scenario);
    save();
    document.dispatchEvent(new CustomEvent("scenarioengine:updated"));
    return { ...scenario, appliedState: applyOverrides(base, overrides) };
  };

  const getScenario = (id) => scenarios.find((item) => item.id === id) || null;

  const applyScenario = (id) => {
    const scenario = getScenario(id);
    if (!scenario) return null;
    const base = baselineState && Object.keys(baselineState).length ? baselineState : captureBaseline();
    const next = applyOverrides(base, scenario.state);
    const summary = summarize(next);
    next.scenario = scenario.id;
    next.loan_monthly_payment = summary.monthlyPayment;
    next.loan_total_interest = summary.totalInterest;
    next.loan_total_repayment = summary.monthlyPayment * summary.payoffMonths;
    setShared(next);
    document.dispatchEvent(new CustomEvent("scenarioengine:applied", { detail: { id: scenario.id, name: scenario.name } }));
    window.dispatchEvent(new CustomEvent("appStateChanged", { detail: { source: "scenario", scenario: scenario.id } }));
    return { id: scenario.id, name: scenario.name, state: next };
  };

  const resetToBaseline = () => {
    const base = clone(baselineState && Object.keys(baselineState).length ? baselineState : captureBaseline());
    base.scenario = null;
    setShared(base);
    document.dispatchEvent(new CustomEvent("scenarioengine:applied", { detail: { id: null, name: "Baseline" } }));
    window.dispatchEvent(new CustomEvent("appStateChanged", { detail: { source: "scenario", scenario: null } }));
    return base;
  };

  const resetScenario = () => resetToBaseline();

  const compareScenarios = (a, b) => {
    const first = typeof a === "string" ? getScenario(a) : a;
    const second = typeof b === "string" ? getScenario(b) : b;
    if (!first || !second) return null;
    const base = baselineState && Object.keys(baselineState).length ? baselineState : captureBaseline();
    const firstSummary = summarize(applyOverrides(base, first.state || {}));
    const secondSummary = summarize(applyOverrides(base, second.state || {}));
    return {
      first: { id: first.id, name: first.name, ...firstSummary },
      second: { id: second.id, name: second.name, ...secondSummary },
      delta: {
        monthlyPayment: secondSummary.monthlyPayment - firstSummary.monthlyPayment,
        totalInterest: secondSummary.totalInterest - firstSummary.totalInterest,
        payoffMonths: secondSummary.payoffMonths - firstSummary.payoffMonths,
        affordabilityRatio: secondSummary.affordabilityRatio - firstSummary.affordabilityRatio
      }
    };
  };

  const getScenarios = () => scenarios.map((scenario) => ({ ...scenario }));

  const renameScenario = (id, name) => {
    const scenario = getScenario(id);
    if (!scenario || !name) return null;
    scenario.name = name;
    save();
    document.dispatchEvent(new CustomEvent("scenarioengine:updated"));
    return { ...scenario };
  };

  const deleteScenario = (id) => {
    const index = scenarios.findIndex((item) => item.id === id);
    if (index === -1) return false;
    scenarios.splice(index, 1);
    save();
    const shared = getShared();
    if (String(shared.scenario || "") === String(id)) {
      resetToBaseline();
    }
    document.dispatchEvent(new CustomEvent("scenarioengine:updated"));
    return true;
  };

  const getPresetScenarios = () => {
    const base = baselineState && Object.keys(baselineState).length ? baselineState : captureBaseline();
    return [
      {
        key: "extra_10_percent",
        label: "Pay extra 10%",
        overrides: { extra_payment: Math.max(0, (base.loan_amount || 0) * 0.1 / 12) }
      },
      {
        key: "reduce_term",
        label: "Reduce loan term",
        overrides: { loan_term: Math.max(12, Math.round((base.loan_term || 60) * 0.8)) }
      },
      {
        key: "refinance_lower_rate",
        label: "Refinance lower rate",
        overrides: { interest_rate: Math.max(0, (base.interest_rate || 6) - 1) }
      }
    ];
  };

  const saveCurrentScenario = (name, id) => {
    const overrides = getCurrentOverrides();
    return createScenario(name, overrides, id);
  };

  const init = () => {
    load();
    captureBaseline();
    document.addEventListener("sharedstate:updated", (event) => {
      const next = event.detail || {};
      if (!next.scenario) {
        baselineState = {
          loan_amount: next.loan_amount || 0,
          interest_rate: next.interest_rate || 0,
          loan_term: next.loan_term || 0,
          extra_payment: next.extra_payment || 0,
          down_payment: next.down_payment || 0,
          income: next.income || 0
        };
      }
    });
    const state = getShared();
    if (state.scenario) {
      const token = String(state.scenario);
      if (getScenario(token)) {
        applyScenario(token);
      } else {
        const match = token.match(/^extra_payment_(\d+)$/);
        if (match) {
          const extra = Number(match[1]) || 0;
          const custom = createScenario(`Extra Payment ${extra}`, { extra_payment: extra }, token);
          applyScenario(custom.id);
        }
      }
    }
  };

  return {
    init,
    captureBaseline,
    createScenario,
    saveCurrentScenario,
    applyScenario,
    resetToBaseline,
    resetScenario,
    compareScenarios,
    getScenarios,
    getPresetScenarios,
    renameScenario,
    deleteScenario,
    getCurrentOverrides
  };
})();

window.addEventListener("DOMContentLoaded", ScenarioEngine.init);
