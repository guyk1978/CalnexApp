/**
 * Wire [data-cn-pdf-export] buttons and legacy PDF download controls.
 */
const CalnexPdfExportInit = (() => {
  let toastTimer;

  const getToastEl = () =>
    document.getElementById("shareToast") ||
    document.querySelector(".share-toast") ||
    document.getElementById("cnPdfToast");

  const showToast = (message, isError = false) => {
    const toast = getToastEl();
    if (!toast) {
      if (isError) console.warn(message);
      return;
    }
    toast.textContent = message;
    toast.classList.toggle("share-toast--error", isError);
    toast.classList.add("is-visible");
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove("is-visible");
      toast.classList.remove("share-toast--error");
    }, 2200);

    if (typeof SharedState !== "undefined" && document.body?.dataset?.page === "loan-calculator") {
      SharedState.setState({ loan_share_toast_message: message }, { system: true });
    }
  };

  const setButtonLoading = (btn, loading) => {
    if (!btn) return;
    btn.disabled = loading;
    btn.setAttribute("aria-busy", loading ? "true" : "false");
    const label = btn.querySelector(".cn-pdf-export-btn__label");
    if (label) {
      label.textContent = loading ? "Generating…" : "Export PDF";
    } else if (!loading) {
      btn.textContent = "Export PDF";
    }
  };

  const handleExportClick = async (btn) => {
    if (!window.CalnexPdfExport) return;
    const pageKey = btn.dataset.pageKey || document.body?.dataset?.page || "";
    const calculatorName = btn.dataset.calculatorName || undefined;
    setButtonLoading(btn, true);
    try {
      await CalnexPdfExport.runExport({ pageKey, calculatorName });
      showToast("PDF downloaded");
    } catch (_err) {
      showToast("PDF generation failed. Please try again.", true);
    } finally {
      setButtonLoading(btn, false);
    }
  };

  const bindButton = (btn) => {
    if (!btn || btn.dataset.cnPdfExportBound === "1") return;
    if (document.querySelector("[data-cn-react-calculator='true']")) return;
    btn.dataset.cnPdfExportBound = "1";
    btn.addEventListener("click", () => {
      void handleExportClick(btn);
    });
  };

  const bindLegacyControls = () => {
    const legacyIds = ["downloadPdfReport"];
    legacyIds.forEach((id) => {
      const el = document.getElementById(id);
      if (!el || el.dataset.cnPdfExportBound === "1") return;
      el.dataset.cnPdfExportBound = "1";
      el.addEventListener("click", (event) => {
        event.preventDefault();
        void handleExportClick(el);
      });
    });
  };

  const init = () => {
    document.querySelectorAll("[data-cn-pdf-export]").forEach(bindButton);
    bindLegacyControls();
  };

  return { init, showToast };
})();

window.CalnexPdfExportInit = CalnexPdfExportInit;

document.addEventListener("DOMContentLoaded", () => {
  CalnexPdfExportInit.init();
});
