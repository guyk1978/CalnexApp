export const SITE_COUNTRIES = ["US", "EU", "UK", "IL", "CN", "CA", "AU", "JP"] as const;
export type SiteCountryCode = (typeof SITE_COUNTRIES)[number];

export const SITE_CURRENCIES = ["USD", "EUR", "GBP", "ILS", "CNY", "CAD", "AUD", "JPY"] as const;
export type SiteCurrencyCode = (typeof SITE_CURRENCIES)[number];

export const COUNTRY_TO_CURRENCY: Record<SiteCountryCode, SiteCurrencyCode> = {
  US: "USD",
  EU: "EUR",
  UK: "GBP",
  IL: "ILS",
  CN: "CNY",
  CA: "CAD",
  AU: "AUD",
  JP: "JPY",
};

export const CURRENCY_TO_COUNTRY: Record<SiteCurrencyCode, SiteCountryCode> = {
  USD: "US",
  EUR: "EU",
  GBP: "UK",
  ILS: "IL",
  CNY: "CN",
  CAD: "CA",
  AUD: "AU",
  JPY: "JP",
};

const COUNTRY_STORAGE = "calnex_country";
const CURRENCY_STORAGE = "calnex_currency";

export function normalizeCountry(code: string | null | undefined): SiteCountryCode {
  const upper = String(code || "US").toUpperCase();
  return (SITE_COUNTRIES.includes(upper as SiteCountryCode) ? upper : "US") as SiteCountryCode;
}

export function readStoredCountry(): SiteCountryCode {
  if (typeof window === "undefined") return "US";
  try {
    return normalizeCountry(window.localStorage.getItem(COUNTRY_STORAGE));
  } catch {
    return "US";
  }
}

export function writeStoredCountry(code: SiteCountryCode): void {
  try {
    window.localStorage.setItem(COUNTRY_STORAGE, code);
  } catch {
    /* ignore */
  }
}

export function writeStoredCurrency(code: SiteCurrencyCode): void {
  try {
    window.localStorage.setItem(CURRENCY_STORAGE, code);
  } catch {
    /* ignore */
  }
}
