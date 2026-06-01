/**
 * Idempotent site + calculator script loader (Next layout + static tools).
 * Skips any script already present in the document to avoid double-load conflicts.
 */
(function () {
  const SITE_SCRIPTS = [
    "/assets/js/header-toolbar.js",
    "/assets/js/geo-finance.js",
    "/assets/js/currency.js",
    "/assets/js/geo-currency-sync.js",
    "/assets/js/ui-enhancements.js",
    "/assets/js/app.js",
  ];

  const PDF_SCRIPTS = [
    "/assets/js/vendor/jspdf.umd.min.js",
    "/assets/js/pdf-joinmypdf-promo.config.js",
    "/assets/js/pdf-report-generator.js",
    "/assets/js/pdf-export-helpers.js",
    "/assets/js/pdf-export.js",
    "/assets/js/pdf-export-init.js",
  ];

  const SHARE_SCRIPTS = ["/assets/js/calculator-share.js", "/assets/js/calculator-share-init.js"];

  const asset = (path) => (typeof CalnexPath === "function" ? CalnexPath(path) : path);

  const isLoaded = (path) => {
    const resolved = asset(path);
    const escaped = resolved.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    return Boolean(
      document.querySelector(`script[src="${escaped}"]`) ||
        document.querySelector(`script[data-cn-boot-src="${escaped}"]`)
    );
  };

  const loadScript = (path) =>
    new Promise((resolve, reject) => {
      const resolved = asset(path);
      if (isLoaded(path)) {
        resolve();
        return;
      }
      const script = document.createElement("script");
      script.src = resolved;
      script.defer = true;
      script.dataset.cnBootSrc = resolved;
      script.addEventListener("load", () => resolve(), { once: true });
      script.addEventListener("error", () => reject(new Error(`Failed to load ${path}`)), { once: true });
      document.body.append(script);
    });

  const loadChain = async (paths) => {
    for (const src of paths) {
      await loadScript(src);
    }
  };

  const bindHeaderSelectors = () => {
    window.CurrencyLayer?.bindExistingSelectors?.();
    window.GeoFinance?.bindExistingSelectors?.();
  };

  const initLegacyCalculatorUi = () => {
    if (!document.querySelector("[data-cn-react-calculator='true']")) {
      window.CalnexCalculatorShareInit?.init?.();
    }
    window.CalnexPdfExportInit?.init?.();
  };

  const bootSiteScripts = () => loadChain(SITE_SCRIPTS);

  const bootSharePdfScripts = () => loadChain([...PDF_SCRIPTS, ...SHARE_SCRIPTS]);

  window.CalnexSiteBoot = {
    SITE_SCRIPTS,
    PDF_SCRIPTS,
    SHARE_SCRIPTS,
    isLoaded,
    loadScript,
    bootSiteScripts,
    bootSharePdfScripts,
    bindHeaderSelectors,
    initLegacyCalculatorUi,
    async bootCalculatorLegacy() {
      bindHeaderSelectors();
      try {
        await bootSharePdfScripts();
      } catch (err) {
        console.warn("[CalnexSiteBoot] share/PDF load failed", err);
      }
      initLegacyCalculatorUi();
    },
    async bootAll() {
      bindHeaderSelectors();
      try {
        await bootSiteScripts();
      } catch (err) {
        console.warn("[CalnexSiteBoot] site script load failed", err);
      }
      try {
        await bootSharePdfScripts();
      } catch (err) {
        console.warn("[CalnexSiteBoot] share/PDF load failed", err);
      }
      initLegacyCalculatorUi();
    },
  };
})();
