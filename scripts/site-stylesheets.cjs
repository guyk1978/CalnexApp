/** Stylesheet entry for static HTML (style.css imports the full stack). */
const STYLESHEET_VERSION = "1.3";

const SITE_STYLESHEETS = [`/assets/css/style.css?v=${STYLESHEET_VERSION}`];

/** Explicit stack for Next layout (no @import reliance). */
const SITE_STYLESHEETS_EXPLICIT = [
  "/assets/css/tokens.css",
  "/assets/css/cn-components.css",
  "/assets/css/header-wide.css",
  "/assets/css/site-search.css",
  `/assets/css/style.css?v=${STYLESHEET_VERSION}`,
];

function siteStylesheetLinks(indent = "    ") {
  return SITE_STYLESHEETS.map((href) => `${indent}<link rel="stylesheet" href="${href}" />`).join("\n");
}

module.exports = {
  STYLESHEET_VERSION,
  SITE_STYLESHEETS,
  SITE_STYLESHEETS_EXPLICIT,
  siteStylesheetLinks,
};
