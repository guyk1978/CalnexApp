import type { TakeHomePayInputs } from "./types";

/** Canonical origin for SSR / first paint (must match server and client). */
export const TAKE_HOME_PAY_CANONICAL_ORIGIN = "https://calnexapp.com";

export function buildTakeHomePayQuery(inputs: TakeHomePayInputs): string {
  const params = new URLSearchParams();
  params.set("thp_gross", String(inputs.grossAnnualSalary));
  params.set("thp_freq", inputs.payFrequency);
  params.set("thp_filing", inputs.filingStatus);
  params.set("thp_state", String(inputs.stateLocalTaxPercent));
  return params.toString();
}

/** Absolute share URL — pass `origin` from client after mount to avoid hydration drift. */
export function buildTakeHomePayShareUrl(
  inputs: TakeHomePayInputs,
  origin: string = TAKE_HOME_PAY_CANONICAL_ORIGIN
): string {
  const base = `${origin.replace(/\/$/, "")}/tools/take-home-pay/`;
  const query = buildTakeHomePayQuery(inputs);
  return query ? `${base}?${query}` : base;
}
