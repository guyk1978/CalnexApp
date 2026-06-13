/**
 * Take-Home Pay Calculator — static page UI (no React).
 * Requires: take-home-pay-engine.js, currency.js, calculator-share.js (optional).
 */
(function () {
  const PAGE_KEY = "take-home-pay-calculator";
  const RADIUS = 58;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  function formatMoney(amount, cents) {
    if (typeof window.formatCurrency === "function" && window.CurrencyLayer) {
      return window.formatCurrency(amount, window.CurrencyLayer.getSelectedCurrency());
    }
    const safe = Number.isFinite(amount) ? amount : 0;
    const sym = typeof window.getCurrencySymbol === "function" ? window.getCurrencySymbol() : "$";
    const digits = cents ? 2 : 0;
    const formatted = Math.abs(safe).toLocaleString("en-US", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
    return safe < 0 ? `-${sym}${formatted}` : `${sym}${formatted}`;
  }

  function formatPercent(n) {
    const v = Number.isFinite(n) ? n : 0;
    return `${v.toFixed(1)}%`;
  }

  function readInputs() {
    return {
      grossAnnualSalary: Number($("#thp-gross")?.value) || 0,
      payFrequency: $("#thp-freq")?.value === "monthly" ? "monthly" : "biweekly",
      filingStatus: $("#thp-filing")?.value || "single",
      stateLocalTaxPercent: Number($("#thp-state")?.value) || 0,
    };
  }

  function applyInputs(inputs) {
    const gross = $("#thp-gross");
    const freq = $("#thp-freq");
    const filing = $("#thp-filing");
    const state = $("#thp-state");
    if (gross) gross.value = String(inputs.grossAnnualSalary);
    if (freq) freq.value = inputs.payFrequency;
    if (filing) filing.value = inputs.filingStatus;
    if (state) state.value = String(inputs.stateLocalTaxPercent);
    syncFrequencyPills(inputs.payFrequency);
  }

  function syncFrequencyPills(freq) {
    $$("[data-thp-freq-pill]").forEach((btn) => {
      const active = btn.dataset.thpFreq === freq;
      btn.classList.toggle("take-home-pay_pillActive__sDlJK", active);
      btn.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  function buildShareUrl(inputs) {
    const origin = window.location.origin.replace(/\/$/, "");
    const path = window.location.pathname.replace(/\/index\.html$/i, "/");
    const base = `${origin}${path}`.replace(/\/?$/, "/");
    const params = new URLSearchParams();
    params.set("thp_gross", String(inputs.grossAnnualSalary));
    params.set("thp_freq", inputs.payFrequency);
    params.set("thp_filing", inputs.filingStatus);
    params.set("thp_state", String(inputs.stateLocalTaxPercent));
    return `${base}?${params.toString()}`;
  }

  function parseUrlInputs() {
    const params = new URLSearchParams(window.location.search);
    if (!params.toString()) return null;
    const patch = {};
    const gross = params.get("thp_gross");
    if (gross) patch.grossAnnualSalary = Number(gross);
    const freq = params.get("thp_freq");
    if (freq === "monthly" || freq === "biweekly") patch.payFrequency = freq;
    const filing = params.get("thp_filing");
    if (filing) patch.filingStatus = filing;
    const state = params.get("thp_state");
    if (state) patch.stateLocalTaxPercent = Number(state);
    return Object.keys(patch).length ? patch : null;
  }

  function renderRing(svg, taxSegments, netPercent) {
    if (!svg) return;
    let offset = 0;
    const circles = svg.querySelectorAll("[data-thp-ring-seg]");
    taxSegments.forEach((seg, i) => {
      const el = circles[i];
      if (!el) return;
      const dash = (seg.percent / 100) * CIRCUMFERENCE;
      const gap = CIRCUMFERENCE - dash;
      el.setAttribute("stroke", seg.color);
      el.setAttribute("stroke-dasharray", `${dash} ${gap}`);
      el.setAttribute("stroke-dashoffset", String(-offset));
      offset += dash;
    });
    const netEl = $("#thp-ring-net-pct");
    if (netEl) netEl.textContent = String(Math.round(netPercent));
  }

  function renderBars(container, taxSegments) {
    if (!container) return;
    container.innerHTML = taxSegments
      .concat([
        {
          key: "gross",
          label: "Gross",
          percent: 100,
          color: "var(--cn-text-tertiary)",
          opacity: 0.45,
        },
      ])
      .map((seg) => {
        const width = seg.key === "gross" ? 100 : seg.percent;
        const style = seg.opacity
          ? `width:100%;background-color:${seg.color};opacity:${seg.opacity}`
          : `width:${width}%;background-color:${seg.color};color:${seg.color}`;
        return `<div class="take-home-pay_barRow__VOzwq">
          <span class="take-home-pay_barLabel__vH_BE">${seg.label}</span>
          <div class="take-home-pay_barTrack__1Zw4X">
            <div class="take-home-pay_barFill__cGbhM" style="${style}"></div>
          </div>
          <span class="take-home-pay_barPct__o6hvc">${seg.key === "gross" ? "100%" : `${width.toFixed(1)}%`}</span>
        </div>`;
      })
      .join("");
  }

  function buildShareMessage(inputs, result) {
    const payLabel = inputs.payFrequency === "biweekly" ? "Bi-weekly" : "Monthly";
    return [
      "Take-Home Pay Calculator",
      "",
      `Net annual take-home: ${formatMoney(result.takeHome.yearly)}`,
      `Per paycheck: ${formatMoney(result.takeHome.perPayPeriod, true)}`,
      `Effective tax rate: ${formatPercent(result.effectiveTaxRate * 100)}`,
      `Federal tax: ${formatMoney(result.taxes.federal)}`,
      `FICA: ${formatMoney(result.taxes.fica)}`,
      "",
      buildShareUrl(inputs),
    ].join("\n");
  }

  function buildCsv(inputs, result) {
    const rows = [
      ["Field", "Value"],
      ["Gross annual", String(result.grossAnnual)],
      ["Federal tax", String(result.taxes.federal)],
      ["FICA", String(result.taxes.fica)],
      ["State/local", String(result.taxes.stateLocal)],
      ["Net annual", String(result.netAnnual)],
      ["Monthly net", String(result.takeHome.monthly)],
      ["Weekly net", String(result.takeHome.weekly)],
      ["Pay frequency", inputs.payFrequency],
      ["Filing status", inputs.filingStatus],
      ["State/local %", String(inputs.stateLocalTaxPercent)],
    ];
    return rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  }

  function refreshShare(inputs, result) {
    const url = buildShareUrl(inputs);
    const urlInput = $("#cnShareUrl-take-home-pay-calculator");
    if (urlInput) urlInput.value = url;

    if (window.CalnexCalculatorShare) {
      window.CalnexCalculatorShare.setPageKey?.(PAGE_KEY);
      window.CalnexCalculatorShare.setShareUrl?.(url);
      window.CalnexCalculatorShare.setShareMessage?.(buildShareMessage(inputs, result));
      window.CalnexCalculatorShare.updateSocialLinks?.(document);
    }
  }

  function render(inputs) {
    const engine = window.TakeHomePayEngine;
    if (!engine?.computeTakeHomePay) return;

    const result = engine.computeTakeHomePay(inputs);
    const payLabel = inputs.payFrequency === "biweekly" ? "Bi-weekly" : "Monthly";
    const netSegment = result.segments.find((s) => s.key === "net");
    const netPercent = netSegment?.percent ?? 0;
    const taxSegments = result.segments.filter((s) => s.key !== "net");

    const card = $("#thp-result-card");
    if (card) {
      card.classList.remove("thp-result-card--animate");
      void card.offsetWidth;
      card.classList.add("thp-result-card--animate");
    }

    const hero = $("#thp-hero-amount");
    if (hero) hero.textContent = formatMoney(result.takeHome.yearly);

    const summary = $("#thp-summary-line");
    if (summary) {
      summary.textContent = `${formatPercent(result.effectiveTaxRate * 100)} effective tax · ${payLabel} paycheck ${formatMoney(result.takeHome.perPayPeriod, true)}`;
    }

    const metrics = [
      ["Monthly", formatMoney(result.takeHome.monthly)],
      ["Weekly", formatMoney(result.takeHome.weekly)],
      ["Yearly", formatMoney(result.takeHome.yearly)],
    ];
    $$("[data-thp-metric]").forEach((tile, i) => {
      const dd = tile.querySelector("dd");
      if (dd && metrics[i]) dd.textContent = metrics[i][1];
    });

    const details = [
      ["Federal income tax", formatMoney(result.taxes.federal)],
      ["FICA (SS + Medicare)", formatMoney(result.taxes.fica)],
      ["State / local", formatMoney(result.taxes.stateLocal)],
      ["Gross salary", formatMoney(result.grossAnnual)],
    ];
    $$("[data-thp-tax-detail]").forEach((row, i) => {
      const dd = row.querySelector("dd");
      if (dd && details[i]) dd.textContent = details[i][1];
    });

    renderRing($("#thp-breakdown-ring"), taxSegments, netPercent);
    renderBars($("#thp-bar-list"), taxSegments);
    refreshShare(inputs, result);
  }

  function run() {
    const defaults = window.TakeHomePayEngine?.DEFAULT_TAKE_HOME_INPUTS || {
      grossAnnualSalary: 85000,
      payFrequency: "biweekly",
      filingStatus: "single",
      stateLocalTaxPercent: 5,
    };
    const patch = parseUrlInputs();
    const inputs = { ...defaults, ...(patch || {}), ...readInputs() };
    applyInputs(inputs);
    render(inputs);
  }

  function bind() {
    const form = $("#thp-form");
    if (!form) return;

    form.addEventListener("input", run);
    form.addEventListener("change", run);

    $$("[data-thp-freq-pill]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const freq = btn.dataset.thpFreq;
        const hidden = $("#thp-freq");
        if (hidden) hidden.value = freq;
        syncFrequencyPills(freq);
        run();
      });
    });

    $("#thp-download-csv")?.addEventListener("click", () => {
      const inputs = readInputs();
      const result = window.TakeHomePayEngine.computeTakeHomePay(inputs);
      const csv = buildCsv(inputs, result);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "take-home-pay-summary.csv";
      a.click();
      URL.revokeObjectURL(url);
    });

    document.addEventListener("currency:changed", run);
    document.addEventListener("sharedstate:updated", run);
    window.addEventListener("appStateChanged", run);
  }

  function init() {
    if (!window.TakeHomePayEngine?.computeTakeHomePay) {
      console.warn("[TakeHomePay] engine not loaded");
      return;
    }
    bind();
    run();
    if (typeof window.initShareButtons === "function") {
      window.initShareButtons();
    }
    if (typeof window.initPdfExportButtons === "function") {
      window.initPdfExportButtons();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
