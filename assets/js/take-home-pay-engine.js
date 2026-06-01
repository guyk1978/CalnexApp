"use strict";
var TakeHomePayEngine = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/lib/take-home-pay/index.ts
  var index_exports = {};
  __export(index_exports, {
    DEFAULT_TAKE_HOME_INPUTS: () => DEFAULT_TAKE_HOME_INPUTS,
    computeTakeHomePay: () => computeTakeHomePay
  });

  // src/lib/take-home-pay/tax-tables.ts
  var BRACKETS_SINGLE = [
    { upTo: 11925, rate: 0.1 },
    { upTo: 48475, rate: 0.12 },
    { upTo: 103350, rate: 0.22 },
    { upTo: 197300, rate: 0.24 },
    { upTo: 250525, rate: 0.32 },
    { upTo: 626350, rate: 0.35 },
    { upTo: null, rate: 0.37 }
  ];
  var BRACKETS_MFJ = [
    { upTo: 23850, rate: 0.1 },
    { upTo: 96950, rate: 0.12 },
    { upTo: 206700, rate: 0.22 },
    { upTo: 394600, rate: 0.24 },
    { upTo: 501050, rate: 0.32 },
    { upTo: 751600, rate: 0.35 },
    { upTo: null, rate: 0.37 }
  ];
  var BRACKETS_HOH = [
    { upTo: 17e3, rate: 0.1 },
    { upTo: 64850, rate: 0.12 },
    { upTo: 103350, rate: 0.22 },
    { upTo: 197300, rate: 0.24 },
    { upTo: 250500, rate: 0.32 },
    { upTo: 626350, rate: 0.35 },
    { upTo: null, rate: 0.37 }
  ];
  var STANDARD_DEDUCTION_2025 = {
    single: 15e3,
    married_joint: 3e4,
    married_separate: 15e3,
    head_of_household: 22500
  };
  var SOCIAL_SECURITY_WAGE_BASE_2025 = 176100;
  var SOCIAL_SECURITY_RATE = 0.062;
  var MEDICARE_RATE = 0.0145;
  var ADDITIONAL_MEDICARE_RATE = 9e-3;
  function getFederalBrackets(status) {
    switch (status) {
      case "married_joint":
        return BRACKETS_MFJ;
      case "head_of_household":
        return BRACKETS_HOH;
      case "single":
      case "married_separate":
      default:
        return BRACKETS_SINGLE;
    }
  }
  function getAdditionalMedicareThreshold(status) {
    return status === "married_joint" ? 25e4 : 2e5;
  }

  // src/lib/take-home-pay/calculations.ts
  function clampNonNegative(n) {
    return Number.isFinite(n) ? Math.max(0, n) : 0;
  }
  function computeProgressiveTax(taxableIncome, filingStatus) {
    const income = clampNonNegative(taxableIncome);
    if (income <= 0) return 0;
    const brackets = getFederalBrackets(filingStatus);
    let tax = 0;
    let previousCap = 0;
    for (const bracket of brackets) {
      const cap = bracket.upTo ?? Infinity;
      if (income <= previousCap) break;
      const taxableInBracket = Math.min(income, cap) - previousCap;
      if (taxableInBracket > 0) {
        tax += taxableInBracket * bracket.rate;
      }
      previousCap = cap;
      if (income <= cap) break;
    }
    return tax;
  }
  function computeFica(grossAnnual, filingStatus) {
    const gross = clampNonNegative(grossAnnual);
    const socialSecurity = Math.min(gross, SOCIAL_SECURITY_WAGE_BASE_2025) * SOCIAL_SECURITY_RATE;
    const medicare = gross * MEDICARE_RATE;
    const threshold = getAdditionalMedicareThreshold(filingStatus);
    const additionalMedicare = gross > threshold ? (gross - threshold) * ADDITIONAL_MEDICARE_RATE : 0;
    return {
      socialSecurity,
      medicare,
      additionalMedicare,
      fica: socialSecurity + medicare + additionalMedicare
    };
  }
  function computeTakeHomePay(inputs) {
    const grossAnnual = clampNonNegative(inputs.grossAnnualSalary);
    const stateRate = clampNonNegative(inputs.stateLocalTaxPercent) / 100;
    const standardDeduction = STANDARD_DEDUCTION_2025[inputs.filingStatus];
    const taxableIncomeFederal = Math.max(0, grossAnnual - standardDeduction);
    const federal = computeProgressiveTax(taxableIncomeFederal, inputs.filingStatus);
    const ficaParts = computeFica(grossAnnual, inputs.filingStatus);
    const stateLocal = grossAnnual * stateRate;
    const taxes = {
      federal,
      ...ficaParts,
      stateLocal,
      total: federal + ficaParts.fica + stateLocal
    };
    const netAnnual = Math.max(0, grossAnnual - taxes.total);
    const periodsPerYear = inputs.payFrequency === "biweekly" ? 26 : 12;
    const takeHome = {
      yearly: netAnnual,
      monthly: netAnnual / 12,
      weekly: netAnnual / 52,
      perPayPeriod: netAnnual / periodsPerYear
    };
    const effectiveTaxRate = grossAnnual > 0 ? taxes.total / grossAnnual : 0;
    const segments = [
      {
        key: "net",
        label: "Take-home",
        amount: netAnnual,
        percent: grossAnnual > 0 ? netAnnual / grossAnnual * 100 : 0,
        color: "var(--cn-success)"
      },
      {
        key: "federal",
        label: "Federal",
        amount: federal,
        percent: grossAnnual > 0 ? federal / grossAnnual * 100 : 0,
        color: "var(--cn-chart-1)"
      },
      {
        key: "fica",
        label: "FICA",
        amount: ficaParts.fica,
        percent: grossAnnual > 0 ? ficaParts.fica / grossAnnual * 100 : 0,
        color: "var(--cn-chart-2)"
      },
      {
        key: "state",
        label: "State / local",
        amount: stateLocal,
        percent: grossAnnual > 0 ? stateLocal / grossAnnual * 100 : 0,
        color: "var(--cn-warning)"
      }
    ];
    return {
      grossAnnual,
      taxableIncomeFederal,
      standardDeduction,
      taxes,
      netAnnual,
      effectiveTaxRate,
      takeHome,
      segments
    };
  }

  // src/lib/take-home-pay/defaults.ts
  var DEFAULT_TAKE_HOME_INPUTS = {
    grossAnnualSalary: 85e3,
    payFrequency: "biweekly",
    filingStatus: "single",
    stateLocalTaxPercent: 5
  };
  return __toCommonJS(index_exports);
})();
