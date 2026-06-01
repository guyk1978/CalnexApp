import { objectToExportRecords } from "@/lib/pdf-export-helpers";
import { formatMoney, formatPercent } from "./format";
import { FILING_STATUS_LABELS, PAY_FREQUENCY_LABELS } from "./labels";
import type { TakeHomePayInputs, TakeHomePayResult } from "./types";

export function buildTakeHomePayPdfPayload(
  inputs: TakeHomePayInputs,
  result: TakeHomePayResult,
  formatMoneyFn: (n: number, cents?: boolean) => string = formatMoney
): { inputs: Record<string, string>; results: Record<string, string> } {
  const inputsRecord = objectToExportRecords({
    grossAnnualSalary: formatMoneyFn(inputs.grossAnnualSalary),
    payFrequency: PAY_FREQUENCY_LABELS[inputs.payFrequency],
    filingStatus: FILING_STATUS_LABELS[inputs.filingStatus],
    stateLocalTaxPercent: `${inputs.stateLocalTaxPercent}%`,
  });

  const resultsRecord = objectToExportRecords({
    netAnnualTakeHome: formatMoneyFn(result.takeHome.yearly),
    monthlyTakeHome: formatMoneyFn(result.takeHome.monthly),
    weeklyTakeHome: formatMoneyFn(result.takeHome.weekly),
    perPaycheck: formatMoneyFn(result.takeHome.perPayPeriod, true),
    federalIncomeTax: formatMoneyFn(result.taxes.federal),
    fica: formatMoneyFn(result.taxes.fica),
    stateLocalTax: formatMoneyFn(result.taxes.stateLocal),
    totalTaxes: formatMoneyFn(result.taxes.total),
    effectiveTaxRate: formatPercent(result.effectiveTaxRate * 100),
    grossSalary: formatMoneyFn(result.grossAnnual),
  });

  return { inputs: inputsRecord, results: resultsRecord };
}
