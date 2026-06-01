import { formatMoney, formatPercent } from "./format";
import type { TakeHomePayInputs, TakeHomePayResult } from "./types";
import { buildTakeHomePayShareUrl } from "./share-url";

export function buildTakeHomePayShareMessage(
  inputs: TakeHomePayInputs,
  result: TakeHomePayResult,
  formatMoneyFn: (n: number, cents?: boolean) => string = formatMoney
): string {
  const url = buildTakeHomePayShareUrl(inputs);
  const lines = [
    "Take-Home Pay Calculator",
    "",
    `Net annual take-home: ${formatMoneyFn(result.takeHome.yearly)}`,
    `Per paycheck: ${formatMoneyFn(result.takeHome.perPayPeriod, true)}`,
    `Effective tax rate: ${formatPercent(result.effectiveTaxRate * 100)}`,
    `Federal tax: ${formatMoneyFn(result.taxes.federal)}`,
    `FICA: ${formatMoneyFn(result.taxes.fica)}`,
    "",
    url,
  ];
  return lines.join("\n");
}
