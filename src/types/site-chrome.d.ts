export {};

declare global {
  interface Window {
    CalnexHeaderToolbar?: {
      ensure?: () => { nav?: Element; actions?: Element; pills?: Element } | null;
      consolidate?: () => void;
    };
    GeoFinance?: { init?: () => void };
    CurrencyLayer?: { init?: () => void };
    CalnexSiteSearch?: { init?: () => Promise<void> | void };
  }
}
