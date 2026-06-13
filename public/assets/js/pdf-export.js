/**
 * Calculator PDF export for static pages (client-side generation).
 */
const CalnexPdfExport = (() => {
  const providers = new Map();

  const registerProvider = (pageKey, fn) => {
    if (!pageKey || typeof fn !== "function") return;
    providers.set(pageKey, fn);
  };

  const exportToPdf = async (data) => {
    if (typeof CalnexPdfReportGenerator !== "undefined") {
      await CalnexPdfReportGenerator.download(data);
      return;
    }

    throw new Error("PDF export is not available on this page");
  };

  const getPayload = (pageKey, calculatorName) => {
    const provider = providers.get(pageKey);
    if (provider) {
      const payload = provider();
      if (payload && payload.calculatorName && payload.inputs && payload.results) {
        return payload;
      }
    }
    if (typeof CalnexPdfExportHelpers === "undefined") {
      return {
        calculatorName: calculatorName || "CalnexApp Calculator",
        inputs: {},
        results: {}
      };
    }
    return CalnexPdfExportHelpers.buildAutoPayload(
      pageKey,
      CalnexPdfExportHelpers.resolveCalculatorName(pageKey, calculatorName)
    );
  };

  const runExport = async (options = {}) => {
    const pageKey = options.pageKey || document.body?.dataset?.page || "";
    const payload = getPayload(pageKey, options.calculatorName);
    await exportToPdf(payload);
  };

  return { registerProvider, exportToPdf, getPayload, runExport, _providers: providers };
})();

window.CalnexPdfExport = CalnexPdfExport;
