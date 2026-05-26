/** Monthly rent and renter-side assumptions */
export type RentInputs = {
  monthlyRent: number;
  /** Renter's insurance (monthly) */
  rentInsurance: number;
  annualRentIncreasePct: number;
  investmentReturnPct: number;
};

/** Purchase and owner-side assumptions */
export type BuyInputs = {
  homePrice: number;
  downPaymentPct: number;
  interestRatePct: number;
  loanTermYears: number;
  /** Annual property tax as % of home value */
  propertyTaxPct: number;
  /** Annual maintenance as % of home value */
  maintenancePct: number;
  annualAppreciationPct: number;
};

export type RentVsBuyInputs = {
  rent: RentInputs;
  buy: BuyInputs;
  /** Analysis horizon (years), typically 10–30 */
  horizonYears: number;
};

/** One row in the year-by-year projection (max 30 years computed) */
export type TimelineRow = {
  year: number;
  cumulativeRentPaid: number;
  renterInvestmentValue: number;
  renterNetWorth: number;
  homeValue: number;
  loanBalance: number;
  homeEquity: number;
  cumulativeBuyCashOut: number;
  buyerNetWorth: number;
  annualRent: number;
  annualBuyCosts: number;
};

export type RentVsBuyResult = {
  timeline: TimelineRow[];
  breakEvenYear: number | null;
  /** "buy" | "rent" | "tie" at horizon */
  winnerAtHorizon: "buy" | "rent" | "tie";
  horizonYear: number;
  rentNetWorthAtHorizon: number;
  buyNetWorthAtHorizon: number;
  downPayment: number;
  loanAmount: number;
  monthlyMortgagePayment: number;
};
