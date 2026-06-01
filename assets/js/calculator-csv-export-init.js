/**
 * Bind [data-cn-download-csv] on calculator pages.
 */
const CalnexCalculatorCsvExportInit = (() => {
  const bindButtons = () => {
    if (!window.CalnexCsvExport) return false;
    const pageKey = document.body?.dataset?.page || "";
    document.querySelectorAll("[data-cn-download-csv]").forEach((btn) => {
      if (btn.dataset.cnCsvBound === "1") return;
      btn.dataset.cnCsvBound = "1";
      btn.addEventListener("click", () => {
        const ok = CalnexCsvExport.exportForPage(pageKey, btn);
        if (!ok && window.CalnexCalculatorShareInit?.showToast) {
          CalnexCalculatorShareInit.showToast("Nothing to export yet — run the calculation first.", true);
        }
      });
    });
    return true;
  };

  const init = () => {
    if (!bindButtons()) {
      window.setTimeout(init, 50);
    }
  };

  return { init };
})();

window.CalnexCalculatorCsvExportInit = CalnexCalculatorCsvExportInit;
window.initCsvExportButtons = () => CalnexCalculatorCsvExportInit.init();

document.addEventListener("DOMContentLoaded", () => CalnexCalculatorCsvExportInit.init());
