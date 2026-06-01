/**
 * Shared script order for calculator share/PDF on static HTML pages.
 * Used by sync-pdf-export.mjs and generate-take-home-pay-page.mjs.
 */
const PDF_SCRIPT_PATHS = [
  "/assets/js/vendor/jspdf.umd.min.js",
  "/assets/js/pdf-joinmypdf-promo.config.js",
  "/assets/js/pdf-report-generator.js",
  "/assets/js/pdf-export-helpers.js",
  "/assets/js/pdf-export.js",
  "/assets/js/pdf-export-init.js",
];

const SHARE_SCRIPT_PATHS = [
  "/assets/js/calculator-share.js",
  "/assets/js/calculator-share-init.js",
];

function buildDeferScriptTags(paths, indent = "    ") {
  return paths.map((src) => `${indent}<script src="${src}" defer></script>`).join("\n");
}

module.exports = {
  PDF_SCRIPT_PATHS,
  SHARE_SCRIPT_PATHS,
  buildDeferScriptTags,
  buildPdfShareScriptBlock(indent = "    ") {
    return buildDeferScriptTags([...PDF_SCRIPT_PATHS, ...SHARE_SCRIPT_PATHS], indent);
  },
};
