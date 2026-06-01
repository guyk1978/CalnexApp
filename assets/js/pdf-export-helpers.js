/**
 * Dynamic input/result collectors for PDF export (vanilla calculators).
 */
const CalnexPdfExportHelpers = (() => {
  const SKIP_INPUT_TYPES = new Set(["button", "submit", "reset", "hidden", "file", "image"]);

  const humanizeKey = (key) => {
    const cleaned = String(key || "")
      .replace(/^(loan|mortgage|car|interest|retirement|rvb|dp|lc)_/i, "")
      .replace(/_/g, " ")
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .trim();
    if (!cleaned) return key;
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  };

  const stringifyValue = (value) => {
    if (value === null || value === undefined) return "";
    if (typeof value === "boolean") return value ? "Yes" : "No";
    if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";
    if (typeof value === "object") return JSON.stringify(value);
    return String(value).trim();
  };

  const inferFormatType = (key, explicit) => {
    if (explicit) return explicit;
    if (!key) return "";
    const k = String(key).toLowerCase();
    if (/_status$|_warning$|_feedback$|_toast|_date$|_label$|_badge$|_text$|insight_|_title$|_detail$/.test(k)) {
      return "text";
    }
    if (k.includes("readiness")) return "percent";
    if (/_months_saved$|_loan_count$|confidence_score$|years_to_retirement$|_year$/.test(k)) {
      return "number";
    }
    if (
      /(?:^|_)(?:monthly_payment|total_interest|total_cost|total_repayment|computed_loan|principal_interest|tax_insurance|recommended_payment|actual_payment|interest_saved|total_paid|final_amount|simple_total|compound_total|safe_min|safe_max|current_payment|funding_gap|projected_balance|inflation_adjusted|estimated_monthly|growth_projection|summary_total|net_worth)/.test(
        k
      ) ||
      /(?:payment|interest|cost|amount|repayment|saved|balance|gap|income|projection|diff|principal|paid|financed|compare_|savings)/.test(
        k
      )
    ) {
      return "currency";
    }
    return "";
  };

  const formatFinancial = (value, formatType) => {
    if (value === null || value === undefined || value === "") return "";
    if (formatType === "text") return String(value);

    const asNumber = Number(value);
    const safeNumber = Number.isFinite(asNumber) ? asNumber : 0;

    if (formatType === "currency") {
      if (typeof CurrencyLayer !== "undefined" && typeof CurrencyLayer.formatCurrency === "function") {
        return CurrencyLayer.formatCurrency(safeNumber);
      }
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 2
      }).format(safeNumber);
    }

    if (formatType === "percent") {
      const display = Math.abs(safeNumber) <= 1 ? safeNumber * 100 : safeNumber;
      return `${Number(display.toFixed(2))}%`;
    }

    if (formatType === "number") return Number(safeNumber.toFixed(2)).toLocaleString("en-US");
    if (Number.isFinite(asNumber)) return String(safeNumber);
    return String(value);
  };

  const getFieldLabel = (el) => {
    if (!el) return "";
    const id = el.id || el.getAttribute("name");
    if (id) {
      const label = document.querySelector(`label[for="${CSS.escape(id)}"]`);
      if (label) return label.textContent.replace(/\s+/g, " ").trim();
    }
    const field = el.closest(".field");
    if (field) {
      const fieldLabel = field.querySelector("label");
      if (fieldLabel) return fieldLabel.textContent.replace(/\s+/g, " ").trim();
    }
    const legend = el.closest("fieldset")?.querySelector("legend");
    if (legend) return legend.textContent.replace(/\s+/g, " ").trim();
    if (el.getAttribute("aria-label")) return el.getAttribute("aria-label");
    if (id) return humanizeKey(id);
    return "Input";
  };

  const readControlValue = (el) => {
    if (!el) return "";
    if (el.type === "checkbox") return el.checked ? "Yes" : "No";
    if (el.type === "radio") return el.checked ? String(el.value) : "";
    if (el.tagName === "SELECT") {
      const opt = el.selectedOptions?.[0];
      return opt ? opt.textContent.trim() : String(el.value);
    }
    return String(el.value ?? "").trim();
  };

  const uniqueLabel = (base, used) => {
    let label = base || "Value";
    let i = 2;
    while (used.has(label)) {
      label = `${base} (${i})`;
      i += 1;
    }
    used.add(label);
    return label;
  };

  const collectInputs = (root) => {
    const scope = root && root.querySelector ? root : document;
    const used = new Set();
    const out = {};

    const forms = scope.querySelectorAll(
      "form, .calculator-layout, .cn-tool-shell, .cn-debt-payoff-layout__inputs, .cn-loan-compare-layout__inputs, main"
    );
    const seen = new Set();

    forms.forEach((container) => {
      if (seen.has(container)) return;
      seen.add(container);

      container.querySelectorAll("input, select, textarea").forEach((el) => {
        if (SKIP_INPUT_TYPES.has(el.type)) return;
        if (el.type === "radio" && !el.checked) return;
        if (el.closest("[data-cn-pdf-export-ignore]")) return;

        const value = readControlValue(el);
        if (el.type === "radio" && !value) return;

        const label = uniqueLabel(getFieldLabel(el), used);
        out[label] = value;
      });
    });

    return out;
  };

  const collectDomResults = (root) => {
    const scope = root && root.querySelector ? root : document;
    const used = new Set();
    const out = {};

    const add = (label, value) => {
      const text = stringifyValue(value);
      if (!text) return;
      const key = uniqueLabel(label, used);
      out[key] = text;
    };

    scope.querySelectorAll("dl.result-grid > div").forEach((row) => {
      const dt = row.querySelector("dt");
      const dd = row.querySelector("dd");
      if (dt && dd) add(dt.textContent.trim(), dd.textContent.trim());
    });

    scope.querySelectorAll("[data-bind]").forEach((node) => {
      const bindKey = node.getAttribute("data-bind") || "";
      if (!bindKey || /toast|feedback|badge|confidence|validation|currency|scenario/i.test(bindKey)) {
        return;
      }
      const format = node.getAttribute("data-format") || inferFormatType(bindKey);
      const text = node.textContent.replace(/\s+/g, " ").trim();
      if (!text || text === "—" || text === "-") return;
      add(humanizeKey(bindKey), text);
    });

    scope.querySelectorAll(".cn-debt-metric-card dt, .cn-loan-compare-metrics [data-offer]").forEach(() => {});

    scope.querySelectorAll(".cn-debt-metric-card").forEach((card) => {
      const dt = card.querySelector("dt");
      const dd = card.querySelector("dd");
      if (dt && dd) add(dt.textContent.trim(), dd.textContent.trim());
    });

    scope.querySelectorAll(".cn-loan-compare-verdict h3, .cn-loan-compare-verdict p, .cn-verdict-savings").forEach((node) => {
      const text = node.textContent.replace(/\s+/g, " ").trim();
      if (text) add(node.id ? humanizeKey(node.id) : "Comparison", text);
    });

    scope.querySelectorAll(".cn-loan-compare-metrics .cn-offer-metric-card").forEach((card, index) => {
      const title = card.querySelector("h3, h4, .cn-offer-metric-card__title");
      const prefix = title ? title.textContent.trim() : `Offer ${index + 1}`;
      card.querySelectorAll("dt").forEach((dt) => {
        const dd = dt.nextElementSibling;
        if (dd) add(`${prefix}: ${dt.textContent.trim()}`, dd.textContent.trim());
      });
    });

    scope.querySelectorAll(".output-card strong[id], .cn-debt-free-card__date, #lcVerdictTitle").forEach((node) => {
      if (node.closest("[data-cn-pdf-export-ignore]")) return;
      const text = node.textContent.replace(/\s+/g, " ").trim();
      if (!text) return;
      const labelNode = node.closest("p, div, article")?.querySelector(".muted, .eyebrow, dt, label");
      const label = labelNode
        ? labelNode.textContent.replace(/\s+/g, " ").trim()
        : node.id
          ? humanizeKey(node.id)
          : "Result";
      add(label, text);
    });

    return out;
  };

  const PAGE_PREFIXES = {
    "loan-calculator": "loan_",
    "mortgage-calculator": "mortgage_",
    "car-loan-calculator": "car_",
    "interest-calculator": "interest_",
    "retirement-calculator": "retirement_",
    "rent-vs-buy-calculator": "rvb_"
  };

  const isOutputKey = (key) => {
    const k = String(key).toLowerCase();
    if (/toast|feedback|badge|confidence|validation|currency|scenario|country|selected_/.test(k)) {
      return false;
    }
    return inferFormatType(k) !== "" || /total|payment|interest|cost|saved|balance|gap|income|projection|net_worth|banner|verdict|readiness|compare_/.test(k);
  };

  const collectFromSharedState = (pageKey) => {
    if (typeof SharedState === "undefined") return { inputs: {}, results: {} };
    const state = SharedState.getState();
    const prefix = PAGE_PREFIXES[pageKey];
    if (!prefix) return { inputs: {}, results: {} };

    const inputs = {};
    const results = {};
    const usedIn = new Set();
    const usedOut = new Set();

    Object.entries(state).forEach(([key, value]) => {
      if (!key.startsWith(prefix)) return;
      const label = uniqueLabel(humanizeKey(key), isOutputKey(key) ? usedOut : usedIn);
      const formatted = formatFinancial(value, inferFormatType(key));
      if (!formatted && formatted !== "0") return;
      if (isOutputKey(key)) {
        results[label] = formatted;
      } else {
        inputs[label] = formatted;
      }
    });

    return { inputs, results };
  };

  const getCalculatorRoots = () => {
    return (
      document.querySelector(".cn-tool-shell") ||
      document.querySelector(".calculator-layout") ||
      document.querySelector("main")
    );
  };

  const buildAutoPayload = (pageKey, calculatorName) => {
    const root = getCalculatorRoots();
    const domInputs = collectInputs(root);
    const domResults = collectDomResults(root || document);
    const shared = collectFromSharedState(pageKey);

    const inputs = Object.assign({}, domInputs, shared.inputs);
    const results = Object.assign({}, domResults, shared.results);

    return {
      calculatorName,
      inputs,
      results
    };
  };

  const CALCULATOR_NAMES = {
    "loan-calculator": "Loan Calculator",
    "mortgage-calculator": "Mortgage Calculator",
    "car-loan-calculator": "Car Loan Calculator",
    "interest-calculator": "Interest Calculator",
    "retirement-calculator": "Retirement Calculator",
    "rent-vs-buy-calculator": "Rent vs. Buy Calculator",
    "debt-payoff": "Debt Snowball & Avalanche Calculator",
    "loan-comparison": "Loan Offer Comparison Tool",
    "take-home-pay-calculator": "Take-Home Pay Calculator"
  };

  const resolveCalculatorName = (pageKey, override) =>
    override || CALCULATOR_NAMES[pageKey] || document.querySelector("h1")?.textContent?.trim() || "CalnexApp Calculator";

  return {
    humanizeKey,
    stringifyValue,
    collectInputs,
    collectDomResults,
    collectFromSharedState,
    buildAutoPayload,
    resolveCalculatorName,
    CALCULATOR_NAMES
  };
})();

window.CalnexPdfExportHelpers = CalnexPdfExportHelpers;
