"use client";

import { useCallback, useEffect, useState } from "react";
import {
  formatSiteMoney,
  getCurrencySymbol,
  readStoredCurrency,
  type SiteCurrencyCode,
  SITE_CURRENCY_CHANGE_EVENT,
} from "@/lib/site-currency";

export function useSiteCurrency() {
  const [currency, setCurrency] = useState<SiteCurrencyCode>("USD");

  useEffect(() => {
    if (typeof window === "undefined") return;

    setCurrency(readStoredCurrency());

    const refresh = () => setCurrency(readStoredCurrency());
    document.addEventListener(SITE_CURRENCY_CHANGE_EVENT, refresh);
    document.addEventListener("geo:changed", refresh);
    document.addEventListener("sharedstate:updated", refresh);
    window.addEventListener("appStateChanged", refresh);

    return () => {
      document.removeEventListener(SITE_CURRENCY_CHANGE_EVENT, refresh);
      document.removeEventListener("geo:changed", refresh);
      document.removeEventListener("sharedstate:updated", refresh);
      window.removeEventListener("appStateChanged", refresh);
    };
  }, []);

  const formatMoney = useCallback(
    (amount: number, cents = false) => formatSiteMoney(amount, currency, cents),
    [currency]
  );

  const symbol = getCurrencySymbol(currency);

  return { currency, symbol, formatMoney };
}
