import type { TakeHomePayInputs } from "./types";

export const DEFAULT_TAKE_HOME_INPUTS: TakeHomePayInputs = {
  grossAnnualSalary: 85_000,
  payFrequency: "biweekly",
  filingStatus: "single",
  stateLocalTaxPercent: 5,
};
