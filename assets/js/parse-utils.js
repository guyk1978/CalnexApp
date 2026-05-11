/**
 * Safe numeric parsing and sanitized binding reads for CalnexApp.
 * Prevents NaN propagation and normalizes pasted/formatted values.
 */
const CalnexParse = (() => {
  const CURRENCY_CHARS = /[$€£₪]/g;

  const parseNumber = (value) => {
    if (value === null || value === undefined) return null;
    if (typeof value === "number") return Number.isFinite(value) ? value : null;
    let s = String(value).trim();
    if (s === "") return null;
    s = s.replace(/\s/g, "");
    s = s.replace(/,/g, "");
    s = s.replace(CURRENCY_CHARS, "");
    if (s === "" || s === "-" || s === "+" || s === ".") return null;
    if (/^[-+]?\d+\.$/.test(s)) {
      const n = Number(s.slice(0, -1));
      return Number.isFinite(n) ? n : null;
    }
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  };

  const collectDataInputBindings = () => {
    const out = {};
    document.querySelectorAll("[data-input-bind]").forEach((node) => {
      const key = node.getAttribute("data-input-bind");
      if (!key) return;
      if (node.tagName === "SELECT") {
        const v = node.value;
        out[key] = v === "" ? null : v;
        return;
      }
      if (node.dataset.inputType === "text") {
        const t = String(node.value ?? "").trim();
        out[key] = t === "" ? null : t;
        return;
      }
      out[key] = parseNumber(node.value);
    });
    return out;
  };

  const resolveNumeric = (key, node, fallback = 0) => {
    const bag = window.__calnexSanitizedInputs;
    if (bag && Object.prototype.hasOwnProperty.call(bag, key)) {
      const v = bag[key];
      if (v === null || v === undefined) return fallback;
      if (typeof v === "number") return Number.isFinite(v) ? v : fallback;
      const n = parseNumber(v);
      return n !== null ? n : fallback;
    }
    return parseNumber(node?.value) ?? fallback;
  };

  const resolveString = (key, node, fallback = "") => {
    const bag = window.__calnexSanitizedInputs;
    if (bag && Object.prototype.hasOwnProperty.call(bag, key) && bag[key] != null && String(bag[key]) !== "") {
      return String(bag[key]);
    }
    if (node && node.value != null) return String(node.value);
    return fallback;
  };

  return {
    parseNumber,
    collectDataInputBindings,
    resolveNumeric,
    resolveString
  };
})();

window.CalnexParse = CalnexParse;
