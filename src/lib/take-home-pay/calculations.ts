import type { TakeHomePayInputs, TakeHomePayResult, TaxBreakdown } from "./types";
import {
  getAdditionalMedicareThreshold,
  getFederalBrackets,
  MEDICARE_RATE,
  SOCIAL_SECURITY_RATE,
  SOCIAL_SECURITY_WAGE_BASE_2025,
  STANDARD_DEDUCTION_2025,
  ADDITIONAL_MEDICARE_RATE,
} from "./tax-tables";

function clampNonNegative(n: number): number {
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

export function computeProgressiveTax(taxableIncome: number, filingStatus: TakeHomePayInputs["filingStatus"]): number {
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

export function computeFica(
  grossAnnual: number,
  filingStatus: TakeHomePayInputs["filingStatus"]
): Pick<TaxBreakdown, "fica" | "socialSecurity" | "medicare" | "additionalMedicare"> {
  const gross = clampNonNegative(grossAnnual);
  const socialSecurity = Math.min(gross, SOCIAL_SECURITY_WAGE_BASE_2025) * SOCIAL_SECURITY_RATE;
  const medicare = gross * MEDICARE_RATE;
  const threshold = getAdditionalMedicareThreshold(filingStatus);
  const additionalMedicare =
    gross > threshold ? (gross - threshold) * ADDITIONAL_MEDICARE_RATE : 0;

  return {
    socialSecurity,
    medicare,
    additionalMedicare,
    fica: socialSecurity + medicare + additionalMedicare,
  };
}

export function computeTakeHomePay(inputs: TakeHomePayInputs): TakeHomePayResult {
  const grossAnnual = clampNonNegative(inputs.grossAnnualSalary);
  const stateRate = clampNonNegative(inputs.stateLocalTaxPercent) / 100;

  const standardDeduction = STANDARD_DEDUCTION_2025[inputs.filingStatus];
  const taxableIncomeFederal = Math.max(0, grossAnnual - standardDeduction);
  const federal = computeProgressiveTax(taxableIncomeFederal, inputs.filingStatus);
  const ficaParts = computeFica(grossAnnual, inputs.filingStatus);
  const stateLocal = grossAnnual * stateRate;

  const taxes: TaxBreakdown = {
    federal,
    ...ficaParts,
    stateLocal,
    total: federal + ficaParts.fica + stateLocal,
  };

  const netAnnual = Math.max(0, grossAnnual - taxes.total);
  const periodsPerYear = inputs.payFrequency === "biweekly" ? 26 : 12;

  const takeHome = {
    yearly: netAnnual,
    monthly: netAnnual / 12,
    weekly: netAnnual / 52,
    perPayPeriod: netAnnual / periodsPerYear,
  };

  const effectiveTaxRate = grossAnnual > 0 ? taxes.total / grossAnnual : 0;

  const segments: TakeHomePayResult["segments"] = [
    {
      key: "net",
      label: "Take-home",
      amount: netAnnual,
      percent: grossAnnual > 0 ? (netAnnual / grossAnnual) * 100 : 0,
      color: "var(--cn-success)",
    },
    {
      key: "federal",
      label: "Federal",
      amount: federal,
      percent: grossAnnual > 0 ? (federal / grossAnnual) * 100 : 0,
      color: "var(--cn-chart-1)",
    },
    {
      key: "fica",
      label: "FICA",
      amount: ficaParts.fica,
      percent: grossAnnual > 0 ? (ficaParts.fica / grossAnnual) * 100 : 0,
      color: "var(--cn-chart-2)",
    },
    {
      key: "state",
      label: "State / local",
      amount: stateLocal,
      percent: grossAnnual > 0 ? (stateLocal / grossAnnual) * 100 : 0,
      color: "var(--cn-warning)",
    },
  ];

  return {
    grossAnnual,
    taxableIncomeFederal,
    standardDeduction,
    taxes,
    netAnnual,
    effectiveTaxRate,
    takeHome,
    segments,
  };
}
