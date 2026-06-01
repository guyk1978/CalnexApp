import type { PayFrequency, TaxFilingStatus } from "./types";

export const FILING_STATUS_LABELS: Record<TaxFilingStatus, string> = {
  single: "Single",
  married_joint: "Married filing jointly",
  married_separate: "Married filing separately",
  head_of_household: "Head of household",
};

export const PAY_FREQUENCY_LABELS: Record<PayFrequency, string> = {
  monthly: "Monthly (12/yr)",
  biweekly: "Bi-weekly (26/yr)",
};
