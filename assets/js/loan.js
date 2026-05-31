const LoanCalculator = (() => {
  const selectors = {
    loanAmount: document.getElementById("loanAmount"),
    loanAmountSlider: document.getElementById("loanAmountSlider"),
    interestRate: document.getElementById("interestRate"),
    interestRateSlider: document.getElementById("interestRateSlider"),
    loanTerm: document.getElementById("loanTerm"),
    loanTermSlider: document.getElementById("loanTermSlider"),
    termUnit: document.getElementById("termUnit"),
    extraMonthlyPayment: document.getElementById("extraMonthlyPayment"),
    lumpSumPayment: document.getElementById("lumpSumPayment"),
    paymentStartMonth: document.getElementById("paymentStartMonth"),
    toggleAdvanced: document.getElementById("toggleAdvanced"),
    advancedPanel: document.getElementById("advancedPanel"),
    shareResultsBtn: document.getElementById("shareResultsBtn"),
    openShareModalBtn: document.getElementById("openShareModalBtn"),
    shareModal: document.getElementById("shareModal"),
    shareModalInput: document.getElementById("shareModalInput"),
    shareUrlInline: document.getElementById("shareUrlInline"),
    copyShareModalBtn: document.getElementById("copyShareModalBtn"),
    closeShareModalBtn: document.getElementById("closeShareModalBtn"),
    shareToast: document.getElementById("shareToast"),
    monthlyPayment: document.getElementById("monthlyPayment"),
    totalInterest: document.getElementById("totalInterest"),
    totalRepayment: document.getElementById("totalRepayment"),
    summaryTotalPayments: document.getElementById("summaryTotalPayments"),
    summaryTotalInterest: document.getElementById("summaryTotalInterest"),
    summaryPayoffDate: document.getElementById("summaryPayoffDate"),
    beforePayoffDate: document.getElementById("beforePayoffDate"),
    beforeTotalPaid: document.getElementById("beforeTotalPaid"),
    beforeTotalInterest: document.getElementById("beforeTotalInterest"),
    afterPayoffDate: document.getElementById("afterPayoffDate"),
    afterTotalPaid: document.getElementById("afterTotalPaid"),
    interestSaved: document.getElementById("interestSaved"),
    monthsSaved: document.getElementById("monthsSaved"),
    bannerMonthsSaved: document.getElementById("bannerMonthsSaved"),
    bannerInterestSaved: document.getElementById("bannerInterestSaved"),
    scheduleBody: document.getElementById("scheduleBody"),
    schedulePanel: document.getElementById("schedulePanel"),
    principalInterestChart: document.getElementById("principalInterestChart"),
    balanceChart: document.getElementById("balanceChart"),
    toggleSchedule: document.getElementById("toggleSchedule"),
    downloadCsv: document.getElementById("downloadCsv"),
    printSchedule: document.getElementById("printSchedule"),
    downloadPdfReport: document.getElementById("downloadPdfReport"),
    printReport: document.getElementById("printReport"),
    copyFeedback: document.getElementById("copyFeedback"),
    shareButtons: document.querySelectorAll("[data-share]")
  };

  let displayedSchedule = [];
  let baselineSchedule = [];
  let acceleratedSchedule = [];
  let principalInterestChartInstance;
  let balanceChartInstance;
  let toastTimer;

  const setCurrency = (value) =>
    (typeof CurrencyLayer !== "undefined"
      ? CurrencyLayer.formatCurrency(value)
      : new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
          maximumFractionDigits: 2
        }).format(Number(value) || 0));

  const num = (key, el, fb = 0) =>
    typeof CalnexParse !== "undefined" ? CalnexParse.resolveNumeric(key, el, fb) : Number(el?.value) || fb;
  const numEl = (el, fb = 0) =>
    typeof CalnexParse !== "undefined" ? CalnexParse.parseNumber(el?.value) ?? fb : Number(el?.value) || fb;

  const getTermInMonths = () => {
    const term = num("loan_term", selectors.loanTerm, 0);
    return selectors.termUnit.value === "years" ? term * 12 : term;
  };

  const getExtraConfig = () => {
    const term = getTermInMonths();
    const startRaw = numEl(selectors.paymentStartMonth, 1);
    const startMonth = Math.max(1, Math.min(term || 1, startRaw || 1));
    if (document.activeElement !== selectors.paymentStartMonth) {
      selectors.paymentStartMonth.value = String(startMonth);
    }
    return {
      extraMonthly: Math.max(0, num("extra_payment", selectors.extraMonthlyPayment, 0)),
      lumpSum: Math.max(0, numEl(selectors.lumpSumPayment, 0)),
      startMonth
    };
  };

  const getPayoffDate = (monthsAhead) => {
    const payoff = new Date();
    payoff.setMonth(payoff.getMonth() + monthsAhead);
    return payoff.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric"
    });
  };

  const renderScheduleTable = (schedule) => {
    selectors.scheduleBody.innerHTML = schedule
      .map((row, index) => {
        const rowClasses = [];
        if (index === schedule.length - 1) rowClasses.push("payoff-row");
        if (row.hadExtraPayment) rowClasses.push("extra-row");
        return `
          <tr class="${rowClasses.join(" ")}">
            <td>${row.month}</td>
            <td>${setCurrency(row.payment)}</td>
            <td>${setCurrency(row.principal)}</td>
            <td>${setCurrency(row.interest)}</td>
            <td>${setCurrency(row.balance)}</td>
          </tr>
        `;
      })
      .join("");
  };

  const cssVar = (name, fallback) => {
    try {
      const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
      return v || fallback;
    } catch (_e) {
      return fallback;
    }
  };

  const chartMotionOn = () =>
    typeof window === "undefined" || !window.matchMedia
      ? true
      : !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const getChartPalette = () => ({
    axis: cssVar("--cn-chart-axis", "rgba(0,0,0,0.12)"),
    tick: cssVar("--cn-chart-tick", "#6a778a"),
    legend: cssVar("--cn-chart-legend", "#9aa7b8"),
    grid: cssVar("--cn-chart-grid", "rgba(0,0,0,0.06)"),
    tooltipBg: cssVar("--cn-chart-tooltip-bg", "#141a24"),
    tooltipFg: cssVar("--cn-chart-tooltip-fg", "#e7eef8"),
    tooltipBorder: cssVar("--cn-chart-tooltip-border", "rgba(255,255,255,0.1)"),
    s1: cssVar("--cn-series-baseline-a", "#8da8de"),
    s2: cssVar("--cn-series-baseline-b", "#8899aa"),
    s3: cssVar("--cn-series-accel-a", "#5b8cff"),
    s4: cssVar("--cn-series-accel-b", "#9aa7b8"),
    b1: cssVar("--cn-series-balance-base", "#8da8de"),
    b2: cssVar("--cn-series-balance-accel", "#5b8cff"),
    b3: cssVar("--cn-series-balance-delta", "#3ee08f")
  });

  const chartFontFamily = () => {
    const raw = cssVar("--cn-font-sans", "Inter, system-ui, sans-serif");
    return raw.split(",")[0].replace(/['"]/g, "").trim() || "Inter";
  };

  const chartEnh = () => window.CalnexChartEnhancements;
  const withAreaFill = (dataset, primary = false) =>
    chartEnh()?.enhanceLineDataset(dataset, { fillPrimary: primary }) ?? dataset;

  const getChartOptions = (yLabel) => {
    const p = getChartPalette();
    const font = chartFontFamily();
    const motion = chartMotionOn();
    const tooltip =
      chartEnh()?.modernTooltip(p) ?? {
        enabled: true,
        backgroundColor: p.tooltipBg,
        titleColor: p.tooltipFg,
        bodyColor: p.tooltipFg,
        borderColor: p.tooltipBorder,
        borderWidth: 1,
        cornerRadius: 12,
        padding: 12
      };
    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: {
          position: "top",
          align: "end",
          labels: {
            color: p.legend,
            boxWidth: 10,
            boxHeight: 10,
            padding: 14,
            usePointStyle: true,
            pointStyle: "line",
            font: { size: 11, family: font }
          }
        },
        tooltip: {
          ...tooltip,
          titleFont: { size: 12, weight: 600, family: font },
          bodyFont: { size: 12, family: font }
        }
      },
      animation: motion ? { duration: 340 } : false,
      scales: {
        x: {
          offset: true,
          grid: {
            color: p.grid,
            drawTicks: false,
            tickLength: 0
          },
          ticks: {
            color: p.tick,
            maxRotation: 0,
            autoSkip: true,
            maxTicksLimit: 9,
            font: { size: 11, family: font }
          },
          border: { display: false },
          title: {
            display: true,
            text: "Month",
            color: p.legend,
            font: { size: 11, weight: 600, family: font },
            padding: { top: 8, bottom: 0 }
          }
        },
        y: {
          grid: {
            color: p.grid
          },
          ticks: {
            color: p.tick,
            maxTicksLimit: 7,
            padding: 8,
            font: { size: 11, family: font },
            callback: (value) => setCurrency(Number(value) || 0)
          },
          border: { display: false },
          title: {
            display: true,
            text: yLabel,
            color: p.legend,
            font: { size: 11, weight: 600, family: font },
            padding: { bottom: 8, top: 0 }
          }
        }
      }
    };
  };

  const buildSeries = (schedule, key, length, padWithZero = false) =>
    Array.from({ length }, (_, i) => {
      const row = schedule[i];
      if (!row) return padWithZero ? 0 : null;
      return Number(row[key].toFixed(2));
    });

  const renderCharts = () => {
    if (!window.Chart) return;
    const maxMonths = Math.max(baselineSchedule.length, acceleratedSchedule.length, 1);
    const labels = Array.from({ length: maxMonths }, (_, i) => i + 1);

    if (principalInterestChartInstance) principalInterestChartInstance.destroy();
    if (balanceChartInstance) balanceChartInstance.destroy();

    const p = getChartPalette();

    principalInterestChartInstance = new window.Chart(selectors.principalInterestChart, {
      type: "line",
      data: {
        labels,
        datasets: [
          withAreaFill({
            label: "Principal (Original)",
            data: buildSeries(baselineSchedule, "principal", maxMonths),
            borderColor: p.s1,
            borderDash: [5, 5],
            borderWidth: 1.5,
            tension: 0.35,
            pointRadius: 0,
            pointHoverRadius: 4,
            pointHoverBorderWidth: 2
          }),
          withAreaFill({
            label: "Interest (Original)",
            data: buildSeries(baselineSchedule, "interest", maxMonths),
            borderColor: p.s2,
            borderDash: [5, 5],
            borderWidth: 1.5,
            tension: 0.35,
            pointRadius: 0,
            pointHoverRadius: 4,
            pointHoverBorderWidth: 2
          }),
          withAreaFill(
            {
              label: "Principal (With Extra)",
              data: buildSeries(acceleratedSchedule, "principal", maxMonths),
              borderColor: p.s3,
              borderWidth: 2,
              tension: 0.35,
              pointRadius: 0,
              pointHoverRadius: 4,
              pointHoverBorderWidth: 2
            },
            true
          ),
          withAreaFill(
            {
              label: "Interest (With Extra)",
              data: buildSeries(acceleratedSchedule, "interest", maxMonths),
              borderColor: p.s4,
              borderWidth: 2,
              tension: 0.35,
              pointRadius: 0,
              pointHoverRadius: 4,
              pointHoverBorderWidth: 2
            },
            true
          )
        ]
      },
      options: getChartOptions("Amount (USD)")
    });

    const originalBalance = buildSeries(baselineSchedule, "balance", maxMonths, true);
    const acceleratedBalance = buildSeries(acceleratedSchedule, "balance", maxMonths, true);
    const reductionDiff = originalBalance.map((value, i) =>
      Number((Math.max(0, value - acceleratedBalance[i])).toFixed(2))
    );

    balanceChartInstance = new window.Chart(selectors.balanceChart, {
      type: "line",
      data: {
        labels,
        datasets: [
          withAreaFill({
            label: "Remaining Balance (Original)",
            data: originalBalance,
            borderColor: p.b1,
            borderDash: [5, 5],
            borderWidth: 1.5,
            tension: 0.35,
            pointRadius: 0,
            pointHoverRadius: 4,
            pointHoverBorderWidth: 2
          }),
          withAreaFill(
            {
              label: "Remaining Balance (With Extra)",
              data: acceleratedBalance,
              borderColor: p.b2,
              borderWidth: 2,
              tension: 0.35,
              pointRadius: 0,
              pointHoverRadius: 4,
              pointHoverBorderWidth: 2
            },
            true
          ),
          withAreaFill(
            {
              label: "Balance Reduction Difference",
              data: reductionDiff,
              borderColor: p.b3,
              borderWidth: 1.75,
              tension: 0.32,
              pointRadius: 0,
              pointHoverRadius: 4,
              pointHoverBorderWidth: 2
            },
            true
          )
        ]
      },
      options: getChartOptions("Remaining Balance (USD)")
    });
  };

  const toCsv = (schedule) => {
    const header = ["Month", "Payment", "Principal", "Interest", "Remaining Balance", "Extra Payment"];
    const lines = schedule.map((row) => [
      row.month,
      row.payment.toFixed(2),
      row.principal.toFixed(2),
      row.interest.toFixed(2),
      row.balance.toFixed(2),
      row.hadExtraPayment ? "Yes" : "No"
    ]);
    return [header, ...lines].map((line) => line.join(",")).join("\n");
  };

  const downloadScheduleCsv = () => {
    if (!displayedSchedule.length) return;
    const blob = new Blob([toCsv(displayedSchedule)], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "calnexapp-loan-amortization.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const printSchedule = () => {
    if (!displayedSchedule.length) return;
    const rows = displayedSchedule
      .map(
        (row) => `<tr>
          <td>${row.month}</td>
          <td>${setCurrency(row.payment)}</td>
          <td>${setCurrency(row.principal)}</td>
          <td>${setCurrency(row.interest)}</td>
          <td>${setCurrency(row.balance)}</td>
        </tr>`
      )
      .join("");
    const win = window.open("", "_blank", "width=1024,height=768");
    if (!win) return;
    win.document.write(`
      <html><head><title>Loan Amortization Schedule</title>
      <style>body{font-family:Arial,sans-serif;padding:20px}table{width:100%;border-collapse:collapse}
      th,td{border:1px solid #dce4f0;padding:8px;text-align:right}th:first-child,td:first-child{text-align:left}
      thead th{background:#f2f6fd}</style></head><body>
      <h1>CalnexApp Loan Amortization Schedule</h1>
      <table><thead><tr><th>Month</th><th>Payment</th><th>Principal</th><th>Interest</th><th>Remaining Balance</th></tr></thead>
      <tbody>${rows}</tbody></table></body></html>
    `);
    win.document.close();
    win.focus();
    win.print();
  };

  const printReport = () => {
    window.print();
  };

  const togglePanel = (panel, button, closedText, openText) => {
    const isOpen = panel.classList.toggle("is-open");
    panel.setAttribute("aria-hidden", String(!isOpen));
    button.setAttribute("aria-expanded", String(isOpen));
    button.textContent = isOpen ? openText : closedText;
  };

  const showToast = (message = "Link copied") => {
    if (!selectors.shareToast) return;
    if (typeof SharedState !== "undefined") {
      SharedState.setState({ loan_share_toast_message: message }, { system: true });
    }
    selectors.shareToast.classList.add("is-visible");
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      selectors.shareToast.classList.remove("is-visible");
    }, 1800);
  };

  const serializeInputsToQuery = () => {
    const params = new URLSearchParams();
    params.set("loan", num("loan_amount", selectors.loanAmount, 0).toFixed(0));
    params.set("rate", num("interest_rate", selectors.interestRate, 0).toFixed(2));
    params.set("term", numEl(selectors.loanTerm, 0).toFixed(0));
    params.set("unit", selectors.termUnit.value);
    params.set("extra", num("extra_payment", selectors.extraMonthlyPayment, 0).toFixed(0));
    params.set("lump", numEl(selectors.lumpSumPayment, 0).toFixed(0));
    params.set("start", numEl(selectors.paymentStartMonth, 1).toFixed(0));
    return params.toString();
  };

  const getShareUrl = () =>
    typeof SharedState !== "undefined"
      ? SharedState.getCurrentUrl()
      : `${window.location.origin}${window.location.pathname}?${serializeInputsToQuery()}`;

  const copyTextToClipboard = async (text) => {
    await navigator.clipboard.writeText(text);
  };

  const openShareModal = () => {
    const shareUrl = getShareUrl();
    syncShareUrlFields(shareUrl);
    selectors.shareModal.classList.add("is-open");
    selectors.shareModal.setAttribute("aria-hidden", "false");
  };

  const closeShareModal = () => {
    selectors.shareModal.classList.remove("is-open");
    selectors.shareModal.setAttribute("aria-hidden", "true");
  };

  const buildCalculationQuery = () => {
    return serializeInputsToQuery();
  };

  const updateSeoMeta = () => {
    if (typeof SeoModule !== "undefined") {
      SeoModule.setLoanMeta({
        amountText: setCurrency(num("loan_amount", selectors.loanAmount, 0)),
        term: numEl(selectors.loanTerm, 0),
        unit: selectors.termUnit.value,
        rate: num("interest_rate", selectors.interestRate, 0)
      });
    }
  };

  /** Portable results (#shareUrlInline) + share modal — keep URLs in sync. */
  const syncShareUrlFields = (url) => {
    if (selectors.shareModalInput) selectors.shareModalInput.value = url;
    if (selectors.shareUrlInline) selectors.shareUrlInline.value = url;
  };

  const updateShareLinks = () => {
    const url = getShareUrl();
    syncShareUrlFields(url);
    const text = encodeURIComponent(document.title);
    const encodedUrl = encodeURIComponent(url);
    document.querySelector('[data-share="whatsapp"]').href = `https://wa.me/?text=${text}%20${encodedUrl}`;
    document.querySelector('[data-share="facebook"]').href =
      `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
    document.querySelector('[data-share="twitter"]').href = `https://twitter.com/intent/tweet?text=${text}&url=${encodedUrl}`;
  };

  const runLoanPipeline = () => {
    if (typeof FinancialCore === "undefined" || typeof FinancialCore.computeLoanSnapshot !== "function") return {};
    const principal = num("loan_amount", selectors.loanAmount, 0);
    const annualRate = num("interest_rate", selectors.interestRate, 0);
    const totalMonths = getTermInMonths();
    const extraConfig = getExtraConfig();

    const sn = FinancialCore.computeLoanSnapshot({
      principal,
      annualRate,
      termMonths: totalMonths,
      extraMonthly: extraConfig.extraMonthly,
      lumpSum: extraConfig.lumpSum,
      extraStartMonth: extraConfig.startMonth,
      loanTermDisplay: num("loan_term", selectors.loanTerm, 0)
    });
    baselineSchedule = sn.baselineSchedule;
    acceleratedSchedule = sn.acceleratedSchedule;
    displayedSchedule = acceleratedSchedule;
    const monthlyPayment = sn.monthlyPayment;
    const baseSummary = sn.baseSummary;
    const acceleratedSummary = sn.acceleratedSummary;

    const snapshot = {
      loan_amount: principal,
      interest_rate: annualRate,
      loan_term: sn.loanTermDisplay,
      extra_payment: extraConfig.extraMonthly,
      loan_monthly_payment: monthlyPayment,
      loan_total_interest: acceleratedSummary.totalInterest,
      loan_total_repayment: acceleratedSummary.totalPaid,
      loan_summary_total_payments: acceleratedSummary.totalPaid,
      loan_summary_total_interest: acceleratedSummary.totalInterest,
      loan_base_total_paid: baseSummary.totalPaid,
      loan_base_total_interest: baseSummary.totalInterest,
      loan_after_total_paid: acceleratedSummary.totalPaid,
      loan_interest_saved: sn.loan_interest_saved,
      loan_months_saved: sn.loan_months_saved,
      loan_summary_payoff_date: acceleratedSummary.months ? getPayoffDate(acceleratedSummary.months) : "-",
      loan_before_payoff_date: getPayoffDate(baseSummary.months),
      loan_after_payoff_date: getPayoffDate(acceleratedSummary.months)
    };

    updateSeoMeta();
    updateShareLinks();
    if (typeof SharedState !== "undefined") SharedState.refreshToolLinks();
    return snapshot;
  };

  const paintLoanCharts = () => {
    renderScheduleTable(displayedSchedule);
    renderCharts();
  };

  const syncRangeAndInput = (inputNode, sliderNode, options = {}) => {
    const clamp = (value) => {
      if (typeof options.max !== "number" || typeof options.min !== "number") return value;
      return Math.min(options.max, Math.max(options.min, value));
    };
    inputNode.addEventListener("input", () => {
      const raw =
        typeof CalnexParse !== "undefined" ? CalnexParse.parseNumber(inputNode.value) ?? 0 : Number(inputNode.value) || 0;
      sliderNode.value = String(clamp(raw));
      if (!inputNode.hasAttribute("data-input-bind") && window.AppEngine) AppEngine.notifyToolInput();
    });
    sliderNode.addEventListener("input", () => {
      inputNode.value = sliderNode.value;
      if (window.AppEngine) AppEngine.notifyToolInput();
    });
  };

  const updateTermSliderRange = () => {
    const inYears = selectors.termUnit.value === "years";
    selectors.loanTermSlider.max = inYears ? "30" : "360";
    selectors.loanTermSlider.min = "1";
    selectors.loanTermSlider.step = "1";
    if (numEl(selectors.loanTerm, 0) > Number(selectors.loanTermSlider.max)) {
      selectors.loanTerm.value = selectors.loanTermSlider.max;
    }
    selectors.loanTermSlider.value = selectors.loanTerm.value;
  };

  const applyQueryState = () => {
    const shared = typeof SharedState !== "undefined" ? SharedState.getState() : {};
    const params = new URLSearchParams(window.location.search);
    const amount = shared.loan_amount || params.get("loan") || params.get("amount");
    const rate = shared.interest_rate || params.get("rate");
    const term = shared.loan_term || params.get("term");
    const unit = params.get("unit");
    const extra = shared.extra_payment || params.get("extra");
    const lump = params.get("lump");
    const start = params.get("start");
    if (amount) {
      selectors.loanAmount.value = amount;
      selectors.loanAmountSlider.value = amount;
    }
    if (rate) {
      selectors.interestRate.value = rate;
      selectors.interestRateSlider.value = rate;
    }
    if (term) {
      selectors.loanTerm.value = term;
      selectors.loanTermSlider.value = term;
    }
    if (unit === "years" || unit === "months") {
      selectors.termUnit.value = unit;
      updateTermSliderRange();
    }
    if (extra) {
      selectors.extraMonthlyPayment.value = extra;
    }
    if (lump) {
      selectors.lumpSumPayment.value = lump;
    }
    if (start) {
      selectors.paymentStartMonth.value = start;
    }
  };

  const applyGeoDefaults = (force = false) => {
    if (typeof GeoFinance === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const hasExplicitRate = params.has("rate") || params.has("interest_rate");
    if (!force && hasExplicitRate) return;
    const geo = GeoFinance.getCountryData();
    selectors.interestRate.value = String(geo.average_interest_rate);
    selectors.interestRateSlider.value = String(geo.average_interest_rate);
    console.log("[CalnexApp] Applied loan geo defaults", geo);
  };

  const bindEvents = () => {
    syncRangeAndInput(selectors.loanAmount, selectors.loanAmountSlider, { min: 1000, max: 500000 });
    syncRangeAndInput(selectors.interestRate, selectors.interestRateSlider, { min: 0, max: 25 });
    syncRangeAndInput(selectors.loanTerm, selectors.loanTermSlider, { min: 1, max: 360 });
    selectors.termUnit.addEventListener("input", () => {
      updateTermSliderRange();
      if (window.AppEngine) AppEngine.notifyToolInput();
    });
    [selectors.extraMonthlyPayment, selectors.lumpSumPayment, selectors.paymentStartMonth].forEach((node) => {
      node.addEventListener("input", () => {
        if (window.AppEngine) AppEngine.notifyToolInput();
      });
    });
    selectors.toggleAdvanced.addEventListener("click", () => {
      togglePanel(selectors.advancedPanel, selectors.toggleAdvanced, "Advanced: extra payments", "Hide advanced");
    });
    selectors.toggleSchedule.addEventListener("click", () => {
      togglePanel(selectors.schedulePanel, selectors.toggleSchedule, "Show full schedule", "Hide full schedule");
    });
    selectors.downloadCsv.addEventListener("click", downloadScheduleCsv);
    selectors.printSchedule.addEventListener("click", printSchedule);
    /* PDF export: handled by pdf-export-init.js (JoinMyPDF API) */
    selectors.printReport.addEventListener("click", printReport);

    selectors.shareButtons.forEach((node) => {
      if (node.dataset.share !== "copy") return;
      node.addEventListener("click", async () => {
        try {
          await copyTextToClipboard(getShareUrl());
          if (typeof SharedState !== "undefined") {
            SharedState.setState({ loan_copy_feedback: "Link copied to clipboard." }, { system: true });
          }
          showToast("Link copied");
        } catch (_error) {
          if (typeof SharedState !== "undefined") {
            SharedState.setState({ loan_copy_feedback: "Copy failed. Please copy from the address bar." }, { system: true });
          }
        }
      });
    });

    selectors.shareResultsBtn.addEventListener("click", async () => {
      try {
        await copyTextToClipboard(getShareUrl());
        if (typeof SharedState !== "undefined") {
          SharedState.setState({ loan_copy_feedback: "Link copied to clipboard." }, { system: true });
        }
        showToast("Link copied");
      } catch (_error) {
        if (typeof SharedState !== "undefined") {
          SharedState.setState({ loan_copy_feedback: "Copy failed. Please copy from the address bar." }, { system: true });
        }
      }
    });

    selectors.openShareModalBtn.addEventListener("click", openShareModal);
    selectors.copyShareModalBtn.addEventListener("click", async () => {
      try {
        await copyTextToClipboard(selectors.shareModalInput.value || getShareUrl());
        showToast("Link copied");
      } catch (_error) {
        showToast("Copy failed");
      }
    });
    selectors.closeShareModalBtn.addEventListener("click", closeShareModal);
    selectors.shareModal.addEventListener("click", (event) => {
      if (event.target === selectors.shareModal) {
        closeShareModal();
      }
    });
  };

  const init = () => {
    if (!document.body.dataset.page || document.body.dataset.page !== "loan-calculator") return;
    if (window.AppEngine) {
      AppEngine.registerToolPipeline("loan-calculator", runLoanPipeline);
    }
    if (window.CalnexAppRender?.registerCharts) {
      CalnexAppRender.registerCharts("loan-calculator", paintLoanCharts);
    }
    applyQueryState();
    applyGeoDefaults(false);
    if (typeof SharedState !== "undefined") SharedState.refreshToolLinks();
    bindEvents();
    syncShareUrlFields(getShareUrl());
    if (window.AppEngine) {
      AppEngine.runImmediate();
    } else if (typeof SharedState !== "undefined") {
      SharedState.setState(runLoanPipeline(), { engineCommit: true });
      window.CalnexAppRender?.appRenderAll?.("init");
    } else {
      runLoanPipeline();
      window.CalnexAppRender?.appRenderAll?.("init");
    }
    document.addEventListener("sharedstate:updated", (event) => {
      if (event.detail?.__engineSource === "commit") return;
      applyQueryState();
      if (window.AppEngine) AppEngine.runImmediate();
    });
    document.addEventListener("geo:changed", () => {
      applyGeoDefaults(true);
      if (window.AppEngine) AppEngine.runImmediate();
    });
    document.addEventListener("currency:changed", () => {
      if (window.AppEngine) AppEngine.runImmediate();
    });
    document.addEventListener("cn-themechange", () => {
      if (!window.Chart) return;
      try {
        renderCharts();
      } catch (_e) {
        /* ignore */
      }
    });
  };

  return { init };
})();

window.addEventListener("DOMContentLoaded", LoanCalculator.init);
