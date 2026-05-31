import { objectToExportRecords } from "@/lib/pdf-export-helpers";
import type { BuyInputs, RentInputs, RentVsBuyResult } from "./types";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function formatMoney(n: number): string {
  return currency.format(Number.isFinite(n) ? n : 0);
}

export function buildRentVsBuyPdfPayload(
  rent: RentInputs,
  buy: BuyInputs,
  horizonYears: number,
  result: RentVsBuyResult
): { inputs: Record<string, string>; results: Record<string, string> } {
  const inputs = objectToExportRecords({
    monthlyRent: rent.monthlyRent,
    rentInsurance: rent.rentInsurance,
    annualRentIncreasePct: rent.annualRentIncreasePct,
    homePrice: buy.homePrice,
    downPaymentPct: buy.downPaymentPct,
    interestRatePct: buy.interestRatePct,
    loanTermYears: buy.loanTermYears,
    propertyTaxPct: buy.propertyTaxPct,
    maintenancePct: buy.maintenancePct,
    annualAppreciationPct: buy.annualAppreciationPct,
    horizonYears,
    investmentReturnPct: rent.investmentReturnPct,
  });

  const horizonRow = result.timeline.find((row) => row.year === result.horizonYear);

  const results = objectToExportRecords({
    breakEvenYear: result.breakEvenYear ?? "Not within horizon",
    rentNetWorthAtHorizon: formatMoney(result.rentNetWorthAtHorizon),
    buyNetWorthAtHorizon: formatMoney(result.buyNetWorthAtHorizon),
    winnerAtHorizon: result.winnerAtHorizon,
    horizonYear: result.horizonYear,
    ...(horizonRow
      ? {
          yearComparisonRent: formatMoney(horizonRow.renterNetWorth),
          yearComparisonBuy: formatMoney(horizonRow.buyerNetWorth),
          yearComparisonHomeEquity: formatMoney(horizonRow.homeEquity),
        }
      : {}),
  });

  return { inputs, results };
}
