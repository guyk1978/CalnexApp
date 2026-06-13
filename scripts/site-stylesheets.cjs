/** Stylesheet entry for static HTML (style.css imports the full stack). */
const STYLESHEET_VERSION = "1.7";

const SITE_STYLESHEETS = [`/assets/css/style.css?v=${STYLESHEET_VERSION}`];

/** Explicit stack for Next layout (no @import reliance). */
const SITE_STYLESHEETS_EXPLICIT = [
  `/assets/css/tokens.css?v=${STYLESHEET_VERSION}`,
  `/assets/css/cn-components.css?v=${STYLESHEET_VERSION}`,
  `/assets/css/header-wide.css?v=${STYLESHEET_VERSION}`,
  `/assets/css/site-search.css?v=${STYLESHEET_VERSION}`,
  `/assets/css/style.css?v=${STYLESHEET_VERSION}`,
];

const LOCAL_IMPORT_RE = /@import\s+url\(\s*(['"]?)(\.\/[^'")]+)\1\s*\)/g;

/** Cache-bust every local @import in style.css (CDN caches child files without ?v=). */
function versionStyleCssImports(css, version = STYLESHEET_VERSION) {
  return css.replace(LOCAL_IMPORT_RE, (match, quote, relPath) => {
    const base = relPath.replace(/\?v=[^'")]+$/i, "");
    return `@import url(${quote}${base}?v=${version}${quote})`;
  });
}

function siteStylesheetLinks(indent = "    ") {
  return SITE_STYLESHEETS.map((href) => `${indent}<link rel="stylesheet" href="${href}" />`).join("\n");
}

module.exports = {
  STYLESHEET_VERSION,
  SITE_STYLESHEETS,
  SITE_STYLESHEETS_EXPLICIT,
  siteStylesheetLinks,
  versionStyleCssImports,
};
