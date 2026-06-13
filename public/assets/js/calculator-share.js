/**
 * Share calculator inputs + results via link, email, social, and Web Share API.
 */
const CalnexCalculatorShare = (() => {
  const providers = new Map();

  const PARAM_ALIASES = {
    loan: "loan_amount",
    amount: "loan_amount",
    rate: "interest_rate",
    term: "loan_term",
    extra: "extra_payment",
    country: "selected_country"
  };

  const registerProvider = (pageKey, provider) => {
    if (!pageKey || !provider) return;
    providers.set(pageKey, provider);
  };

  const getPageKey = () => document.body?.dataset?.page || "";

  const getCalculatorRoot = () =>
    document.querySelector(".cn-tool-shell") ||
    document.querySelector(".calculator-layout") ||
    document.querySelector("main");

  const readControlValue = (el) => {
    if (!el) return "";
    if (el.type === "checkbox") return el.checked ? "1" : "0";
    if (el.type === "radio") return el.checked ? String(el.value) : "";
    if (el.tagName === "SELECT") {
      const opt = el.selectedOptions?.[0];
      return opt ? opt.value : String(el.value ?? "");
    }
    return String(el.value ?? "").trim();
  };

  const serializeFromDom = () => {
    const root = getCalculatorRoot();
    const params = new URLSearchParams();
    if (!root) return params;

    root.querySelectorAll("[data-input-bind]").forEach((el) => {
      if (el.type === "radio" && !el.checked) return;
      const key = el.getAttribute("data-input-bind");
      if (!key) return;
      const value = readControlValue(el);
      if (value === "") return;
      params.set(key, value);
    });

    if (typeof SharedState !== "undefined") {
      const state = SharedState.getState();
      if (state.currency) params.set("currency", String(state.currency));
      if (state.selected_country) params.set("country", String(state.selected_country));
    } else {
      const currency = window.localStorage.getItem("calnex_currency");
      const country = window.localStorage.getItem("calnex_country");
      if (currency) params.set("currency", currency);
      if (country) params.set("country", country);
    }

    return params;
  };

  const serializeLoanLegacy = () => {
    const params = new URLSearchParams();
    const amount = document.getElementById("loanAmount");
    const rate = document.getElementById("interestRate");
    const term = document.getElementById("loanTerm");
    const unit = document.getElementById("termUnit");
    const extra = document.getElementById("extraMonthlyPayment");
    const lump = document.getElementById("lumpSumPayment");
    const start = document.getElementById("paymentStartMonth");
    if (amount?.value) params.set("loan", amount.value);
    if (rate?.value) params.set("rate", rate.value);
    if (term?.value) params.set("term", term.value);
    if (unit?.value) params.set("unit", unit.value);
    if (extra?.value && Number(extra.value) > 0) params.set("extra", extra.value);
    if (lump?.value && Number(lump.value) > 0) params.set("lump", lump.value);
    if (start?.value && Number(start.value) > 1) params.set("start", start.value);
    return params;
  };

  const getQueryString = () => {
    const pageKey = getPageKey();
    const provider = providers.get(pageKey);
    if (provider?.serializeQuery) {
      const q = provider.serializeQuery();
      return typeof q === "string" ? q : q?.toString?.() || "";
    }
    if (pageKey === "loan-calculator") {
      return serializeLoanLegacy().toString();
    }
    return serializeFromDom().toString();
  };

  const getShareUrl = () => {
    const pageKey = getPageKey();
    const provider = providers.get(pageKey);
    if (provider?.getShareUrl) return provider.getShareUrl();

    const query = getQueryString();
    const base = `${window.location.origin}${window.location.pathname}`;
    return query ? `${base}?${query}` : base;
  };

  const resolveBindKey = (paramKey) => PARAM_ALIASES[paramKey] || paramKey;

  const applyQueryToDom = () => {
    const pageKey = getPageKey();
    const provider = providers.get(pageKey);
    if (provider?.applyQuery) {
      provider.applyQuery();
      return true;
    }

    const params = new URLSearchParams(window.location.search);
    if (!params.toString()) return false;

    const root = getCalculatorRoot();
    if (!root) return false;

    let applied = false;
    params.forEach((value, paramKey) => {
      const bindKey = resolveBindKey(paramKey);
      const el = root.querySelector(`[data-input-bind="${CSS.escape(bindKey)}"]`);
      if (!el) return;
      if (el.type === "checkbox") {
        el.checked = value === "1" || value === "true";
      } else if (el.type === "radio") {
        const radio = root.querySelector(
          `[data-input-bind="${CSS.escape(bindKey)}"][value="${CSS.escape(value)}"]`
        );
        if (radio) radio.checked = true;
      } else {
        el.value = value;
      }
      applied = true;
    });

    return applied;
  };

  const getCalculatorTitle = () => {
    const pageKey = getPageKey();
    if (typeof CalnexPdfExportHelpers !== "undefined") {
      return CalnexPdfExportHelpers.resolveCalculatorName(pageKey);
    }
    return document.querySelector("h1")?.textContent?.trim() || "CalnexApp Calculator";
  };

  const pickShareHighlights = (pageKey) => {
    const lines = [];
    const max = 5;

    if (typeof CalnexPdfExportHelpers !== "undefined") {
      const shared = CalnexPdfExportHelpers.collectFromSharedState(pageKey);
      const domResults = CalnexPdfExportHelpers.collectDomResults(getCalculatorRoot());
      const merged = { ...domResults, ...shared.results };
      const seen = new Set();
      Object.entries(merged).forEach(([label, value]) => {
        if (lines.length >= max) return;
        const text = String(value ?? "").trim();
        if (!text || text === "—" || text === "-") return;
        const key = `${label}:${text}`;
        if (seen.has(key)) return;
        seen.add(key);
        lines.push(`${label}: ${text}`);
      });
    }

    if (!lines.length) {
      const root = getCalculatorRoot();
      root?.querySelectorAll("dl.result-grid > div").forEach((row) => {
        if (lines.length >= max) return;
        const dt = row.querySelector("dt");
        const dd = row.querySelector("dd");
        if (dt && dd) {
          const text = dd.textContent.replace(/\s+/g, " ").trim();
          if (text) lines.push(`${dt.textContent.trim()}: ${text}`);
        }
      });
    }

    return lines;
  };

  const buildShareMessage = () => {
    const title = getCalculatorTitle();
    const url = getShareUrl();
    const highlights = pickShareHighlights(getPageKey());
    const parts = [title, ""];
    if (highlights.length) {
      parts.push(...highlights, "");
    }
    parts.push(url);
    return parts.join("\n");
  };

  const copyToClipboard = async (text) => {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.left = "-9999px";
    document.body.appendChild(area);
    area.select();
    document.execCommand("copy");
    area.remove();
  };

  const updateSocialLinks = (scope = document) => {
    const url = getShareUrl();
    const message = buildShareMessage();
    const title = encodeURIComponent(getCalculatorTitle());
    const encodedUrl = encodeURIComponent(url);
    const encodedMessage = encodeURIComponent(message);

    scope.querySelectorAll("[data-cn-share-url]").forEach((input) => {
      input.value = url;
    });
    scope.querySelectorAll("#shareUrlInline, #shareModalInput").forEach((input) => {
      input.value = url;
    });

    const networks = {
      whatsapp: `https://wa.me/?text=${encodedMessage}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      twitter: `https://twitter.com/intent/tweet?text=${title}&url=${encodedUrl}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      email: `mailto:?subject=${title}&body=${encodedMessage}`
    };

    Object.entries(networks).forEach(([network, href]) => {
      scope.querySelectorAll(`[data-share="${network}"], [data-cn-share-network="${network}"]`).forEach(
        (node) => {
          if (node.tagName === "A") node.href = href;
        }
      );
    });
  };

  const nativeShare = async () => {
    const url = getShareUrl();
    const title = getCalculatorTitle();
    const text = pickShareHighlights(getPageKey()).join("\n");
    if (navigator.share) {
      await navigator.share({ title, text: text || title, url });
      return true;
    }
    return false;
  };

  return {
    registerProvider,
    getShareUrl,
    getQueryString,
    buildShareMessage,
    copyToClipboard,
    updateSocialLinks,
    nativeShare,
    applyQueryToDom,
    serializeFromDom,
    getCalculatorTitle
  };
})();

window.CalnexCalculatorShare = CalnexCalculatorShare;
