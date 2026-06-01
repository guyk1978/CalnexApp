/**
 * Build URLs for files under `public/assets/`.
 *
 * Next.js serves `public/` from the site root, so `public/assets/css/style.css`
 * is available at `/assets/css/style.css` — never `/public/assets/...`.
 */
const ASSET_PREFIX = process.env.NEXT_PUBLIC_ASSET_PREFIX ?? "";

/** Cache-bust version aligned with static HTML (`scripts/site-stylesheets.cjs`). */
export const STYLESHEET_VERSION = "1.3";

export function publicAsset(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${ASSET_PREFIX}${normalized}`;
}

/** Single manifest file (imports tokens, cn-components, layouts, vibrant-ui). */
export const siteStylesheets = [`/assets/css/style.css?v=${STYLESHEET_VERSION}`] as const;

export const siteScripts = {
  themeInit: "/assets/js/theme-init.js",
  headerToolbar: "/assets/js/header-toolbar.js",
  uiEnhancements: "/assets/js/ui-enhancements.js",
  app: "/assets/js/app.js",
} as const;
