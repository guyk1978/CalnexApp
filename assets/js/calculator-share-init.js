/**
 * Wire share UI on all calculator pages ([data-cn-share], legacy .share-tools).
 */
const CalnexCalculatorShareInit = (() => {
  let toastTimer;

  const getToastEl = () =>
    document.getElementById("shareToast") ||
    document.getElementById("cnShareToast") ||
    document.getElementById("cnPdfToast") ||
    document.querySelector(".share-toast");

  const showToast = (message, isError = false) => {
    const toast = getToastEl();
    if (!toast) return;
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

  const refresh = () => {
    if (!window.CalnexCalculatorShare) return;
    CalnexCalculatorShare.updateSocialLinks(document);
  };

  const handleCopy = async () => {
    try {
      await CalnexCalculatorShare.copyToClipboard(CalnexCalculatorShare.getShareUrl());
      if (typeof SharedState !== "undefined" && document.body?.dataset?.page === "loan-calculator") {
        SharedState.setState({ loan_copy_feedback: "Link copied to clipboard." }, { system: true });
      }
      showToast("Link copied");
    } catch (_err) {
      showToast("Copy failed — select the link and copy manually.", true);
    }
  };

  const handleCopyMessage = async () => {
    try {
      await CalnexCalculatorShare.copyToClipboard(CalnexCalculatorShare.buildShareMessage());
      showToast("Summary copied");
    } catch (_err) {
      showToast("Copy failed", true);
    }
  };

  const handleNativeShare = async () => {
    try {
      const usedNative = await CalnexCalculatorShare.nativeShare();
      if (usedNative) {
        showToast("Shared");
        return;
      }
      await handleCopy();
    } catch (err) {
      if (err?.name === "AbortError") return;
      await handleCopy();
    }
  };

  const handleEmail = () => {
    const title = encodeURIComponent(CalnexCalculatorShare.getCalculatorTitle());
    const body = encodeURIComponent(CalnexCalculatorShare.buildShareMessage());
    window.location.href = `mailto:?subject=${title}&body=${body}`;
  };

  const bindAction = (el) => {
    if (!el || el.dataset.cnShareBound === "1") return;
    el.dataset.cnShareBound = "1";

    const action = el.dataset.cnShareAction || el.dataset.share;
    if (!action) return;

    if (action === "copy") {
      el.addEventListener("click", () => void handleCopy());
      return;
    }
    if (action === "copy-message") {
      el.addEventListener("click", () => void handleCopyMessage());
      return;
    }
    if (action === "native" || action === "share") {
      el.addEventListener("click", () => void handleNativeShare());
      return;
    }
    if (action === "email") {
      el.addEventListener("click", (event) => {
        event.preventDefault();
        handleEmail();
      });
    }
  };

  const closeAllShareMenus = () => {
    document.querySelectorAll("[data-cn-share-menu].is-open").forEach((menu) => {
      menu.classList.remove("is-open");
      const panel = menu.querySelector("[data-cn-share-panel]");
      const trigger = menu.querySelector("[data-cn-share-toggle]");
      if (panel) panel.hidden = true;
      if (trigger) trigger.setAttribute("aria-expanded", "false");
    });
  };

  const bindShareMenus = () => {
    if (document.querySelector("[data-cn-react-calculator]")) return;
    document.querySelectorAll("[data-cn-share-menu]").forEach((menu) => {
      if (menu.dataset.cnShareMenuBound === "1") return;
      menu.dataset.cnShareMenuBound = "1";

      const trigger = menu.querySelector("[data-cn-share-toggle]");
      const panel = menu.querySelector("[data-cn-share-panel]");
      if (!trigger || !panel) return;

      trigger.addEventListener("click", (event) => {
        event.stopPropagation();
        const willOpen = panel.hidden;
        closeAllShareMenus();
        if (willOpen) {
          refresh();
          panel.hidden = false;
          menu.classList.add("is-open");
          trigger.setAttribute("aria-expanded", "true");
          const input = panel.querySelector("[data-cn-share-url]");
          if (input) {
            window.setTimeout(() => {
              input.focus();
              input.select();
            }, 50);
          }
        }
      });

      panel.addEventListener("click", (event) => event.stopPropagation());
    });

    if (document.documentElement.dataset.cnShareOutsideBound !== "1") {
      document.documentElement.dataset.cnShareOutsideBound = "1";
      document.addEventListener("click", closeAllShareMenus);
      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") closeAllShareMenus();
      });
    }
  };

  const init = () => {
    if (!window.CalnexCalculatorShare) return;

    if (document.body?.dataset?.page !== "loan-calculator") {
      const applied = CalnexCalculatorShare.applyQueryToDom();
      if (applied && window.AppEngine) {
        AppEngine.runImmediate();
      }
    }

    if (!document.querySelector("[data-cn-react-calculator]")) {
      document.querySelectorAll("[data-cn-share-action], .share-btn[data-share]").forEach(bindAction);
      bindShareMenus();
    }
    refresh();

    document.addEventListener("sharedstate:updated", (event) => {
      if (event.detail?.__engineSource === "commit") {
        refresh();
      }
    });
    document.addEventListener("appStateChanged", () => refresh());
    window.addEventListener("popstate", refresh);
  };

  return { init, refresh, showToast };
})();

window.CalnexCalculatorShareInit = CalnexCalculatorShareInit;
window.initShareButtons = () => CalnexCalculatorShareInit.init();

document.addEventListener("DOMContentLoaded", () => {
  CalnexCalculatorShareInit.init();
});
