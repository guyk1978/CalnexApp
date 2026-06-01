import type { TaxFilingStatus } from "./types";

/** 2025 federal ordinary income brackets (taxable income after standard deduction). */
export type TaxBracket = { upTo: number | null; rate: number };

const BRACKETS_SINGLE: TaxBracket[] = [
  { upTo: 11_925, rate: 0.1 },
  { upTo: 48_475, rate: 0.12 },
  { upTo: 103_350, rate: 0.22 },
  { upTo: 197_300, rate: 0.24 },
  { upTo: 250_525, rate: 0.32 },
  { upTo: 626_350, rate: 0.35 },
  { upTo: null, rate: 0.37 },
];

const BRACKETS_MFJ: TaxBracket[] = [
  { upTo: 23_850, rate: 0.1 },
  { upTo: 96_950, rate: 0.12 },
  { upTo: 206_700, rate: 0.22 },
  { upTo: 394_600, rate: 0.24 },
  { upTo: 501_050, rate: 0.32 },
  { upTo: 751_600, rate: 0.35 },
  { upTo: null, rate: 0.37 },
];

const BRACKETS_HOH: TaxBracket[] = [
  { upTo: 17_000, rate: 0.1 },
  { upTo: 64_850, rate: 0.12 },
  { upTo: 103_350, rate: 0.22 },
  { upTo: 197_300, rate: 0.24 },
  { upTo: 250_500, rate: 0.32 },
  { upTo: 626_350, rate: 0.35 },
  { upTo: null, rate: 0.37 },
];

export const STANDARD_DEDUCTION_2025: Record<TaxFilingStatus, number> = {
  single: 15_000,
  married_joint: 30_000,
  married_separate: 15_000,
  head_of_household: 22_500,
};

export const SOCIAL_SECURITY_WAGE_BASE_2025 = 176_100;
export const SOCIAL_SECURITY_RATE = 0.062;
export const MEDICARE_RATE = 0.0145;
export const ADDITIONAL_MEDICARE_RATE = 0.009;

export function getFederalBrackets(status: TaxFilingStatus): TaxBracket[] {
  switch (status) {
    case "married_joint":
      return BRACKETS_MFJ;
    case "head_of_household":
      return BRACKETS_HOH;
    case "single":
    case "married_separate":
    default:
      return BRACKETS_SINGLE;
  }
}

export function getAdditionalMedicareThreshold(status: TaxFilingStatus): number {
  return status === "married_joint" ? 250_000 : 200_000;
}
