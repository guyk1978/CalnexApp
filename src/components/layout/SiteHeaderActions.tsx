"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import {
  COUNTRY_TO_CURRENCY,
  CURRENCY_TO_COUNTRY,
  normalizeCountry,
  readStoredCountry,
  SITE_COUNTRIES,
  SITE_CURRENCIES,
  writeStoredCountry,
  writeStoredCurrency,
  type SiteCountryCode,
  type SiteCurrencyCode,
} from "@/lib/geo-currency-map";
import { normalizeSiteCurrency, readStoredCurrency } from "@/lib/site-currency";

type LegacyGeo = { setCountry?: (code: string) => string };
type LegacyCurrency = { setCurrency?: (code: string) => string };
type LegacySearch = { init?: () => void | Promise<void> };

const legacyGeo = () => (window as Window & { GeoFinance?: LegacyGeo }).GeoFinance;
const legacyCurrency = () => (window as Window & { CurrencyLayer?: LegacyCurrency }).CurrencyLayer;
const legacySearch = () => (window as Window & { CalnexSiteSearch?: LegacySearch }).CalnexSiteSearch;

function GlobeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

function CurrencyIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 0 1 0 4H8" />
      <path d="M12 18V6" />
    </svg>
  );
}

async function loadSiteSearchOnce(): Promise<void> {
  if (document.getElementById("cn-site-search-trigger")) return;

  if (!legacySearch()?.init) {
    await new Promise<void>((resolve, reject) => {
      if (document.querySelector('script[src="/assets/js/site-search.js"]')) {
        const wait = window.setInterval(() => {
          if (legacySearch()?.init) {
            window.clearInterval(wait);
            resolve();
          }
        }, 50);
        window.setTimeout(() => window.clearInterval(wait), 5000);
        return;
      }
    const calnexPath = (window as Window & { CalnexPath?: (p: string) => string }).CalnexPath;
    const script = document.createElement("script");
    script.src = calnexPath ? calnexPath("/assets/js/site-search.js") : "/assets/js/site-search.js";
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("site-search failed"));
      document.head.append(script);
    });
  }

  if (document.getElementById("cn-site-search-trigger")) return;
  await legacySearch()?.init?.();
}

export function SiteHeaderActions() {
  const [country, setCountry] = useState<SiteCountryCode>("US");
  const [currency, setCurrency] = useState<SiteCurrencyCode>("USD");
  const searchBooted = useRef(false);

  const applyPair = useCallback((nextCountry: SiteCountryCode, nextCurrency: SiteCurrencyCode) => {
    setCountry(nextCountry);
    setCurrency(nextCurrency);
    writeStoredCountry(nextCountry);
    writeStoredCurrency(nextCurrency);
  }, []);

  useEffect(() => {
    const storedCountry = readStoredCountry();
    const storedCurrency = readStoredCurrency();
    const linkedCurrency = COUNTRY_TO_CURRENCY[storedCountry];
    if (storedCurrency !== linkedCurrency) {
      applyPair(storedCountry, linkedCurrency);
      legacyGeo()?.setCountry?.(storedCountry);
    } else {
      applyPair(storedCountry, storedCurrency);
    }
  }, [applyPair]);

  useEffect(() => {
    const onGeo = () => {
      const nextCountry = readStoredCountry();
      const nextCurrency = COUNTRY_TO_CURRENCY[nextCountry];
      applyPair(nextCountry, nextCurrency);
    };
    const onCurrency = () => {
      const nextCurrency = readStoredCurrency();
      const nextCountry = CURRENCY_TO_COUNTRY[nextCurrency];
      applyPair(nextCountry, nextCurrency);
    };
    document.addEventListener("geo:changed", onGeo);
    document.addEventListener("currency:changed", onCurrency);
    return () => {
      document.removeEventListener("geo:changed", onGeo);
      document.removeEventListener("currency:changed", onCurrency);
    };
  }, [applyPair]);

  useEffect(() => {
    if (searchBooted.current) return;
    searchBooted.current = true;
    loadSiteSearchOnce().catch(() => {
      searchBooted.current = false;
    });
  }, []);

  const onCountryChange = useCallback(
    (next: SiteCountryCode) => {
      const linked = COUNTRY_TO_CURRENCY[next];
      applyPair(next, linked);
      legacyGeo()?.setCountry?.(next);
    },
    [applyPair]
  );

  const onCurrencyChange = useCallback(
    (next: SiteCurrencyCode) => {
      const normalized = normalizeSiteCurrency(next) as SiteCurrencyCode;
      const linked = CURRENCY_TO_COUNTRY[normalized];
      applyPair(linked, normalized);
      legacyCurrency()?.setCurrency?.(normalized);
    },
    [applyPair]
  );

  return (
    <div className="cn-header-actions" data-cn-react-header="true">
      <div className="cn-header-pills">
        <div className="country-selector-wrap cn-header-pill cn-header-pill--country">
          <label className="sr-only" htmlFor="headerCountrySelect">
            Country
          </label>
          <span className="cn-header-pill__icon" aria-hidden>
            <GlobeIcon />
          </span>
          <select
            id="headerCountrySelect"
            className="country-selector cn-header-pill__select"
            aria-label="Country"
            value={country}
            onChange={(e) => onCountryChange(normalizeCountry(e.target.value))}
          >
            {SITE_COUNTRIES.map((code) => (
              <option key={code} value={code} className="cn-header-pill__option">
                {code}
              </option>
            ))}
          </select>
        </div>
        <div className="currency-selector-wrap cn-header-pill cn-header-pill--currency">
          <label className="sr-only" htmlFor="headerCurrencySelect">
            Currency
          </label>
          <span className="cn-header-pill__icon" aria-hidden>
            <CurrencyIcon />
          </span>
          <select
            id="headerCurrencySelect"
            className="currency-selector cn-header-pill__select"
            aria-label="Currency"
            value={currency}
            onChange={(e) => onCurrencyChange(normalizeSiteCurrency(e.target.value) as SiteCurrencyCode)}
          >
            {SITE_CURRENCIES.map((code) => (
              <option key={code} value={code} className="cn-header-pill__option">
                {code}
              </option>
            ))}
          </select>
        </div>
      </div>
      <ThemeToggle />
    </div>
  );
}
