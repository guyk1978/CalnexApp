/**
 * JoinMyPDF report generation for static calculator pages.
 */
const CalnexPdfExport = (() => {
  const providers = new Map();

  const registerProvider = (pageKey, fn) => {
    if (!pageKey || typeof fn !== "function") return;
    providers.set(pageKey, fn);
  };

  const exportToPdf = async (data) => {
    const response = await fetch("https://api.joinmypdf.com/generate-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error("PDF generation failed");
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "report.pdf";
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
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
