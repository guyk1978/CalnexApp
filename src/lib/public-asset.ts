/**
 * Build URLs for files under `public/assets/`.
 *
 * Dev (next dev): absolute paths from site root (/assets/...).
 * Production static export: post-build `relativize-export` rewrites HTML; runtime uses CalnexPath().
 */
const ASSET_PREFIX = process.env.NEXT_PUBLIC_ASSET_PREFIX ?? "";

/** Cache-bust version aligned with static HTML (`scripts/site-stylesheets.cjs`). */
export const STYLESHEET_VERSION = "2.1";
export const SITE_SCRIPT_VERSION = "2.3";

export function publicAsset(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${ASSET_PREFIX}${normalized}`;
}

export function versionedScript(path: string): string {
  const base = publicAsset(path);
  return base.includes("?v=") ? base : `${base}?v=${SITE_SCRIPT_VERSION}`;
}

/** Single manifest file (imports tokens, cn-components, layouts, vibrant-ui). */
export const siteStylesheets = [`/assets/css/style.css?v=${STYLESHEET_VERSION}`] as const;

export const siteScripts = {
  themeInit: "/assets/js/theme-init.js",
  headerToolbar: "/assets/js/header-toolbar.js",
  siteSearch: "/assets/js/site-search.js",
  geoFinance: "/assets/js/geo-finance.js",
  currency: "/assets/js/currency.js",
  geoCurrencySync: "/assets/js/geo-currency-sync.js",
  uiEnhancements: "/assets/js/ui-enhancements.js",
  app: "/assets/js/app.js",
} as const;
