import loanPagesJson from "../../seo/data/loan-pages.json";

export type LoanScenario = {
  loan_amount: number;
  interest_rate: number;
  loan_term: number;
};

export const LOAN_SCENARIOS = loanPagesJson as LoanScenario[];

export function loanScenarioSlug(entry: LoanScenario): string {
  const rateSlug = String(entry.interest_rate).replace(".", "-");
  return `${entry.loan_amount}-loan-at-${rateSlug}-percent-for-${entry.loan_term}-years`;
}

export function loanScenarioPath(entry: LoanScenario): string {
  return `/tools/loan-calculator/${loanScenarioSlug(entry)}/`;
}

export function formatScenarioLabel(entry: LoanScenario): string {
  const amount =
    entry.loan_amount >= 1000
      ? `$${Math.round(entry.loan_amount / 1000)}k`
      : `$${entry.loan_amount}`;
  const rate = String(entry.interest_rate).replace(/\.0$/, "");
  return `${amount} · ${rate}% · ${entry.loan_term} yr`;
}
