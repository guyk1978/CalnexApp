import { MAX_PROJECTION_YEARS } from "./defaults";
import type { RentVsBuyInputs, RentVsBuyResult, TimelineRow } from "./types";

const clampNonNeg = (x: number): number => Math.max(0, Number(x) || 0);

/** Standard fixed-rate amortization; returns monthly P&I and balance after each month. */
function buildLoanSchedule(
  principal: number,
  annualRatePct: number,
  termMonths: number
): { monthlyPayment: number; balanceAfterMonth: number[] } {
  const P = clampNonNeg(principal);
  const n = Math.max(0, Math.round(termMonths));
  const monthlyRate = clampNonNeg(annualRatePct) / 100 / 12;

  let monthlyPayment = 0;
  if (P > 0 && n > 0) {
    if (monthlyRate <= 0) {
      monthlyPayment = P / n;
    } else {
      const pow = (1 + monthlyRate) ** n;
      monthlyPayment = (P * monthlyRate * pow) / (pow - 1);
    }
  }

  const balanceAfterMonth: number[] = [];
  let balance = P;

  for (let month = 1; month <= n; month += 1) {
    const interest = balance * monthlyRate;
    const principalPaid = Math.min(balance, monthlyPayment - interest);
    balance = Math.max(0, balance - principalPaid);
    balanceAfterMonth.push(balance);
  }

  return { monthlyPayment, balanceAfterMonth };
}

function loanBalanceAtYear(balanceAfterMonth: number[], year: number, termMonths: number): number {
  const monthsElapsed = year * 12;
  if (monthsElapsed >= termMonths) return 0;
  const monthIndex = monthsElapsed - 1;
  return balanceAfterMonth[monthIndex] ?? 0;
}

/**
 * Projects rent vs. buy net worth year-by-year.
 * Rent path: down payment invested minus cumulative rent.
 * Buy path: home equity (appreciated value minus remaining loan).
 */
export function computeRentVsBuy(inputs: RentVsBuyInputs): RentVsBuyResult {
  const { rent, buy } = inputs;
  const horizonYear = Math.min(
    MAX_PROJECTION_YEARS,
    Math.max(1, Math.round(clampNonNeg(inputs.horizonYears)) || 1)
  );

  const homePrice = clampNonNeg(buy.homePrice);
  const downPaymentPct = clampNonNeg(buy.downPaymentPct);
  const downPayment = (homePrice * downPaymentPct) / 100;
  const loanAmount = Math.max(0, homePrice - downPayment);
  const termMonths = Math.max(0, Math.round(clampNonNeg(buy.loanTermYears) * 12));
  const investRate = clampNonNeg(rent.investmentReturnPct) / 100;
  const rentGrowth = clampNonNeg(rent.annualRentIncreasePct) / 100;
  const appreciation = clampNonNeg(buy.annualAppreciationPct) / 100;

  const { monthlyPayment, balanceAfterMonth } = buildLoanSchedule(
    loanAmount,
    buy.interestRatePct,
    termMonths
  );

  const timeline: TimelineRow[] = [];
  let cumulativeRentPaid = 0;
  let cumulativeBuyCashOut = downPayment;
  let breakEvenYear: number | null = null;

  for (let year = 1; year <= MAX_PROJECTION_YEARS; year += 1) {
    const rentMultiplier = (1 + rentGrowth) ** (year - 1);
    const annualRent =
      clampNonNeg(rent.monthlyRent) * 12 * rentMultiplier +
      clampNonNeg(rent.rentInsurance) * 12 * rentMultiplier;
    cumulativeRentPaid += annualRent;

    const renterInvestmentValue = downPayment * (1 + investRate) ** year;
    const renterNetWorth = renterInvestmentValue - cumulativeRentPaid;

    const homeValue = homePrice * (1 + appreciation) ** year;
    const loanBalance = loanBalanceAtYear(balanceAfterMonth, year, termMonths);
    const homeEquity = homeValue - loanBalance;

    const monthsRemaining = Math.max(0, termMonths - (year - 1) * 12);
    const monthsThisYear = Math.min(12, monthsRemaining);
    const annualMortgage = monthlyPayment * monthsThisYear;
    const annualTax = (homeValue * clampNonNeg(buy.propertyTaxPct)) / 100;
    const annualMaintenance = (homeValue * clampNonNeg(buy.maintenancePct)) / 100;
    const annualBuyCosts = annualMortgage + annualTax + annualMaintenance;
    cumulativeBuyCashOut += annualBuyCosts;

    const buyerNetWorth = homeEquity;

    timeline.push({
      year,
      cumulativeRentPaid,
      renterInvestmentValue,
      renterNetWorth,
      homeValue,
      loanBalance,
      homeEquity,
      cumulativeBuyCashOut,
      buyerNetWorth,
      annualRent,
      annualBuyCosts,
    });

    if (breakEvenYear === null && buyerNetWorth > renterNetWorth) {
      breakEvenYear = year;
    }
  }

  const rowAtHorizon = timeline[horizonYear - 1];
  const rentNetWorthAtHorizon = rowAtHorizon?.renterNetWorth ?? 0;
  const buyNetWorthAtHorizon = rowAtHorizon?.buyerNetWorth ?? 0;

  let winnerAtHorizon: "buy" | "rent" | "tie" = "tie";
  const diff = buyNetWorthAtHorizon - rentNetWorthAtHorizon;
  if (Math.abs(diff) > 1) {
    winnerAtHorizon = diff > 0 ? "buy" : "rent";
  }

  return {
    timeline,
    breakEvenYear,
    winnerAtHorizon,
    horizonYear,
    rentNetWorthAtHorizon,
    buyNetWorthAtHorizon,
    downPayment,
    loanAmount,
    monthlyMortgagePayment: monthlyPayment,
  };
}
