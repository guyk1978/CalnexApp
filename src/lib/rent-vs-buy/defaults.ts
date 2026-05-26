import type { BuyInputs, RentInputs, RentVsBuyInputs } from "./types";

export const DEFAULT_RENT_INPUTS: RentInputs = {
  monthlyRent: 1200,
  rentInsurance: 15,
  annualRentIncreasePct: 3,
  investmentReturnPct: 7,
};

export const DEFAULT_BUY_INPUTS: BuyInputs = {
  homePrice: 350_000,
  downPaymentPct: 20,
  interestRatePct: 6.5,
  loanTermYears: 30,
  propertyTaxPct: 1.2,
  maintenancePct: 1,
  annualAppreciationPct: 3,
};

export const DEFAULT_HORIZON_YEARS = 15;

export const MAX_PROJECTION_YEARS = 30;

export const DEFAULT_RENT_VS_BUY_INPUTS: RentVsBuyInputs = {
  rent: DEFAULT_RENT_INPUTS,
  buy: DEFAULT_BUY_INPUTS,
  horizonYears: DEFAULT_HORIZON_YEARS,
};
