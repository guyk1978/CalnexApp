import type { TakeHomePayInputs } from "./types";

export function buildTakeHomePayQuery(inputs: TakeHomePayInputs): string {
  const params = new URLSearchParams();
  params.set("thp_gross", String(inputs.grossAnnualSalary));
  params.set("thp_freq", inputs.payFrequency);
  params.set("thp_filing", inputs.filingStatus);
  params.set("thp_state", String(inputs.stateLocalTaxPercent));
  return params.toString();
}

export function buildTakeHomePayShareUrl(inputs: TakeHomePayInputs, origin?: string): string {
  const base = `${origin ?? (typeof window !== "undefined" ? window.location.origin : "https://calnexapp.com")}/tools/take-home-pay/`;
  const query = buildTakeHomePayQuery(inputs);
  return query ? `${base}?${query}` : base;
}
