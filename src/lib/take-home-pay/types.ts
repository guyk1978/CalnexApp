export type PayFrequency = "monthly" | "biweekly";

export type TaxFilingStatus =
  | "single"
  | "married_joint"
  | "married_separate"
  | "head_of_household";

export type TakeHomePayInputs = {
  grossAnnualSalary: number;
  payFrequency: PayFrequency;
  filingStatus: TaxFilingStatus;
  /** Estimated combined state + local effective rate (0–20 typical). */
  stateLocalTaxPercent: number;
};

export type TaxBreakdown = {
  federal: number;
  fica: number;
  socialSecurity: number;
  medicare: number;
  additionalMedicare: number;
  stateLocal: number;
  total: number;
};

export type TakeHomePayResult = {
  grossAnnual: number;
  taxableIncomeFederal: number;
  standardDeduction: number;
  taxes: TaxBreakdown;
  netAnnual: number;
  effectiveTaxRate: number;
  takeHome: {
    yearly: number;
    monthly: number;
    weekly: number;
    perPayPeriod: number;
  };
  segments: {
    key: "net" | "federal" | "fica" | "state";
    label: string;
    amount: number;
    percent: number;
    color: string;
  }[];
};
