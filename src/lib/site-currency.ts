export type SiteCurrencyCode = "USD" | "EUR" | "GBP" | "ILS" | "CNY" | "CAD" | "AUD" | "JPY";

const STORAGE_KEY = "calnex_currency";

const SYMBOLS: Record<SiteCurrencyCode, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  ILS: "₪",
  CNY: "¥",
  CAD: "$",
  AUD: "$",
  JPY: "¥",
};

const SUPPORTED = new Set<string>(Object.keys(SYMBOLS));

export function normalizeSiteCurrency(code: string | null | undefined): SiteCurrencyCode {
  const upper = String(code || "USD").toUpperCase();
  return (SUPPORTED.has(upper) ? upper : "USD") as SiteCurrencyCode;
}

export function readStoredCurrency(): SiteCurrencyCode {
  if (typeof window === "undefined") return "USD";
  try {
    return normalizeSiteCurrency(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return "USD";
  }
}

export function getCurrencySymbol(currency: SiteCurrencyCode): string {
  return SYMBOLS[currency] ?? "$";
}

/** Same numeric value everywhere — only the leading symbol changes. */
export function formatSiteMoney(
  amount: number,
  currency: SiteCurrencyCode = "USD",
  cents = false
): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  const symbol = getCurrencySymbol(currency);
  const digits = cents ? 2 : 0;
  const formatted = Math.abs(safe).toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  return safe < 0 ? `-${symbol}${formatted}` : `${symbol}${formatted}`;
}

export const SITE_CURRENCY_CHANGE_EVENT = "currency:changed";
