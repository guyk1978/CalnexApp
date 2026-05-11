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
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2
    }).format(value || 0);

  const parseValue = (node) => Number(node?.value) || 0;

  const getTermInMonths = () => {
    const term = parseValue(selectors.loanTerm);
    return selectors.termUnit.value === "years" ? term * 12 : term;
  };

  const getMonthlyPayment = (principal, annualRate, totalMonths) => {
    if (!principal || !totalMonths) return 0;
    const monthlyRate = annualRate / 100 / 12;
    if (monthlyRate === 0) return principal / totalMonths;
    const factor = (1 + monthlyRate) ** totalMonths;
    return (principal * monthlyRate * factor) / (factor - 1);
  };

  const getExtraConfig = () => {
    const term = getTermInMonths();
    const startMonth = Math.max(1, Math.min(term || 1, parseValue(selectors.paymentStartMonth) || 1));
    selectors.paymentStartMonth.value = String(startMonth);
    return {
      extraMonthly: Math.max(0, parseValue(selectors.extraMonthlyPayment)),
      lumpSum: Math.max(0, parseValue(selectors.lumpSumPayment)),
      startMonth
    };
  };

  const buildSchedule = ({ principal, annualRate, totalMonths, monthlyPayment, includeExtra, extraConfig }) => {
    const monthlyRate = annualRate / 100 / 12;
    const schedule = [];
    let balance = principal;
    let month = 1;
    const maxIterations = Math.max(1200, totalMonths + 240);

    while (balance > 0 && month <= maxIterations) {
      const interest = monthlyRate === 0 ? 0 : balance * monthlyRate;
      const basePrincipalPaid = Math.max(0, monthlyPayment - interest);

      let extraMonthlyApplied = 0;
      let lumpApplied = 0;
      if (includeExtra && month >= extraConfig.startMonth) {
        extraMonthlyApplied = extraConfig.extraMonthly;
        if (month === extraConfig.startMonth) {
          lumpApplied = extraConfig.lumpSum;
        }
      }

      const plannedPrincipalPaid = basePrincipalPaid + extraMonthlyApplied + lumpApplied;
      const principalPaid = Math.min(balance, plannedPrincipalPaid);
      const payment = principalPaid + interest;
      balance = Math.max(0, balance - principalPaid);

      schedule.push({
        month,
        payment,
        principal: principalPaid,
        interest,
        balance,
        hadExtraPayment: extraMonthlyApplied + lumpApplied > 0
      });

      month += 1;
    }

    return schedule;
  };

  const summarizeSchedule = (schedule) => {
    const totalPaid = schedule.reduce((sum, row) => sum + row.payment, 0);
    const totalInterest = schedule.reduce((sum, row) => sum + row.interest, 0);
    return {
      totalPaid,
      totalInterest,
      months: schedule.length
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

  const renderScheduleSummary = (summary) => {
    selectors.summaryTotalPayments.textContent = setCurrency(summary.totalPaid);
    selectors.summaryTotalInterest.textContent = setCurrency(summary.totalInterest);
    selectors.summaryPayoffDate.textContent = summary.months ? getPayoffDate(summary.months) : "-";
  };

  const renderComparison = (base, accelerated) => {
    const monthsSaved = Math.max(0, base.months - accelerated.months);
    const interestSaved = Math.max(0, base.totalInterest - accelerated.totalInterest);
    selectors.beforePayoffDate.textContent = getPayoffDate(base.months);
    selectors.beforeTotalPaid.textContent = setCurrency(base.totalPaid);
    selectors.beforeTotalInterest.textContent = setCurrency(base.totalInterest);
    selectors.afterPayoffDate.textContent = getPayoffDate(accelerated.months);
    selectors.afterTotalPaid.textContent = setCurrency(accelerated.totalPaid);
    selectors.interestSaved.textContent = setCurrency(interestSaved);
    selectors.monthsSaved.textContent = String(monthsSaved);
    selectors.bannerMonthsSaved.textContent = `${monthsSaved} months`;
    selectors.bannerInterestSaved.textContent = setCurrency(interestSaved);
  };

  const getChartOptions = (yLabel) => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: "index",
      intersect: false
    },
    plugins: {
      legend: {
        position: "top"
      },
      tooltip: {
        enabled: true
      }
    },
    animation: {
      duration: 420
    },
    scales: {
      x: {
        title: {
          display: true,
          text: "Month"
        }
      },
      y: {
        title: {
          display: true,
          text: yLabel
        },
        ticks: {
          callback: (value) => `$${Number(value).toLocaleString("en-US")}`
        }
      }
    }
  });

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

    principalInterestChartInstance = new window.Chart(selectors.principalInterestChart, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Principal (Original)",
            data: buildSeries(baselineSchedule, "principal", maxMonths),
            borderColor: "#8da8de",
            borderDash: [6, 6],
            tension: 0.24,
            pointRadius: 0
          },
          {
            label: "Interest (Original)",
            data: buildSeries(baselineSchedule, "interest", maxMonths),
            borderColor: "#b0bac8",
            borderDash: [6, 6],
            tension: 0.24,
            pointRadius: 0
          },
          {
            label: "Principal (With Extra)",
            data: buildSeries(acceleratedSchedule, "principal", maxMonths),
            borderColor: "#1b63f0",
            backgroundColor: "rgba(27, 99, 240, 0.1)",
            tension: 0.24,
            pointRadius: 0
          },
          {
            label: "Interest (With Extra)",
            data: buildSeries(acceleratedSchedule, "interest", maxMonths),
            borderColor: "#5f6b7a",
            backgroundColor: "rgba(95, 107, 122, 0.1)",
            tension: 0.24,
            pointRadius: 0
          }
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
          {
            label: "Remaining Balance (Original)",
            data: originalBalance,
            borderColor: "#8da8de",
            borderDash: [6, 6],
            tension: 0.24,
            pointRadius: 0
          },
          {
            label: "Remaining Balance (With Extra)",
            data: acceleratedBalance,
            borderColor: "#144fc1",
            backgroundColor: "rgba(20, 79, 193, 0.12)",
            tension: 0.24,
            pointRadius: 0
          },
          {
            label: "Balance Reduction Difference",
            data: reductionDiff,
            borderColor: "#1f8b4d",
            backgroundColor: "rgba(31, 139, 77, 0.15)",
            tension: 0.22,
            pointRadius: 0
          }
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

  const togglePanel = (panel, button, closedText, openText) => {
    const isOpen = panel.classList.toggle("is-open");
    panel.setAttribute("aria-hidden", String(!isOpen));
    button.textContent = isOpen ? openText : closedText;
  };

  const showToast = (message = "Link copied") => {
    if (!selectors.shareToast) return;
    selectors.shareToast.textContent = message;
    selectors.shareToast.classList.add("is-visible");
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      selectors.shareToast.classList.remove("is-visible");
    }, 1800);
  };

  const serializeInputsToQuery = () => {
    const params = new URLSearchParams();
    params.set("loan", parseValue(selectors.loanAmount).toFixed(0));
    params.set("rate", parseValue(selectors.interestRate).toFixed(2));
    params.set("term", parseValue(selectors.loanTerm).toFixed(0));
    params.set("unit", selectors.termUnit.value);
    params.set("extra", parseValue(selectors.extraMonthlyPayment).toFixed(0));
    params.set("lump", parseValue(selectors.lumpSumPayment).toFixed(0));
    params.set("start", parseValue(selectors.paymentStartMonth).toFixed(0));
    return params.toString();
  };

  const getShareUrl = () => `${window.location.origin}${window.location.pathname}?${serializeInputsToQuery()}`;

  const copyTextToClipboard = async (text) => {
    await navigator.clipboard.writeText(text);
  };

  const openShareModal = () => {
    const shareUrl = getShareUrl();
    selectors.shareModalInput.value = shareUrl;
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

  const updateSeoAndUrl = () => {
    const nextUrl = `${window.location.pathname}?${buildCalculationQuery()}`;
    window.history.replaceState({}, "", nextUrl);
    if (typeof SeoModule !== "undefined") {
      SeoModule.setLoanMeta({
        amountText: setCurrency(parseValue(selectors.loanAmount)),
        term: parseValue(selectors.loanTerm),
        unit: selectors.termUnit.value,
        rate: parseValue(selectors.interestRate)
      });
    }
  };

  const updateShareLinks = () => {
    const url = getShareUrl();
    const text = encodeURIComponent(document.title);
    const encodedUrl = encodeURIComponent(url);
    document.querySelector('[data-share="whatsapp"]').href = `https://wa.me/?text=${text}%20${encodedUrl}`;
    document.querySelector('[data-share="facebook"]').href =
      `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
    document.querySelector('[data-share="twitter"]').href = `https://twitter.com/intent/tweet?text=${text}&url=${encodedUrl}`;
  };

  const updateResultUI = () => {
    const principal = parseValue(selectors.loanAmount);
    const annualRate = parseValue(selectors.interestRate);
    const totalMonths = getTermInMonths();
    const monthlyPayment = getMonthlyPayment(principal, annualRate, totalMonths);
    const extraConfig = getExtraConfig();

    baselineSchedule = buildSchedule({
      principal,
      annualRate,
      totalMonths,
      monthlyPayment,
      includeExtra: false,
      extraConfig
    });
    acceleratedSchedule = buildSchedule({
      principal,
      annualRate,
      totalMonths,
      monthlyPayment,
      includeExtra: true,
      extraConfig
    });
    displayedSchedule = acceleratedSchedule;

    const baseSummary = summarizeSchedule(baselineSchedule);
    const acceleratedSummary = summarizeSchedule(acceleratedSchedule);

    selectors.monthlyPayment.textContent = setCurrency(monthlyPayment);
    selectors.totalInterest.textContent = setCurrency(acceleratedSummary.totalInterest);
    selectors.totalRepayment.textContent = setCurrency(acceleratedSummary.totalPaid);
    renderScheduleSummary(acceleratedSummary);
    renderComparison(baseSummary, acceleratedSummary);
    renderScheduleTable(displayedSchedule);
    renderCharts();
    updateSeoAndUrl();
    updateShareLinks();
  };

  const syncRangeAndInput = (inputNode, sliderNode, options = {}) => {
    const clamp = (value) => {
      if (typeof options.max !== "number" || typeof options.min !== "number") return value;
      return Math.min(options.max, Math.max(options.min, value));
    };
    inputNode.addEventListener("input", () => {
      sliderNode.value = clamp(Number(inputNode.value) || 0);
      updateResultUI();
    });
    sliderNode.addEventListener("input", () => {
      inputNode.value = sliderNode.value;
      updateResultUI();
    });
  };

  const updateTermSliderRange = () => {
    const inYears = selectors.termUnit.value === "years";
    selectors.loanTermSlider.max = inYears ? "30" : "360";
    selectors.loanTermSlider.min = "1";
    selectors.loanTermSlider.step = "1";
    if (Number(selectors.loanTerm.value) > Number(selectors.loanTermSlider.max)) {
      selectors.loanTerm.value = selectors.loanTermSlider.max;
    }
    selectors.loanTermSlider.value = selectors.loanTerm.value;
  };

  const applyQueryState = () => {
    const params = new URLSearchParams(window.location.search);
    const amount = params.get("loan") || params.get("amount");
    const rate = params.get("rate");
    const term = params.get("term");
    const unit = params.get("unit");
    const extra = params.get("extra");
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

  const bindEvents = () => {
    syncRangeAndInput(selectors.loanAmount, selectors.loanAmountSlider, { min: 1000, max: 500000 });
    syncRangeAndInput(selectors.interestRate, selectors.interestRateSlider, { min: 0, max: 25 });
    syncRangeAndInput(selectors.loanTerm, selectors.loanTermSlider, { min: 1, max: 360 });
    selectors.termUnit.addEventListener("change", () => {
      updateTermSliderRange();
      updateResultUI();
    });
    [selectors.extraMonthlyPayment, selectors.lumpSumPayment, selectors.paymentStartMonth].forEach((node) => {
      node.addEventListener("input", updateResultUI);
    });
    selectors.toggleAdvanced.addEventListener("click", () => {
      togglePanel(selectors.advancedPanel, selectors.toggleAdvanced, "Advanced: Extra Payments", "Hide Advanced: Extra Payments");
    });
    selectors.toggleSchedule.addEventListener("click", () => {
      togglePanel(selectors.schedulePanel, selectors.toggleSchedule, "Show full schedule", "Hide full schedule");
    });
    selectors.downloadCsv.addEventListener("click", downloadScheduleCsv);
    selectors.printSchedule.addEventListener("click", printSchedule);

    selectors.shareButtons.forEach((node) => {
      if (node.dataset.share !== "copy") return;
      node.addEventListener("click", async () => {
        try {
          await copyTextToClipboard(getShareUrl());
          selectors.copyFeedback.textContent = "Link copied to clipboard.";
          showToast("Link copied");
        } catch (_error) {
          selectors.copyFeedback.textContent = "Copy failed. Please copy from the address bar.";
        }
      });
    });

    selectors.shareResultsBtn.addEventListener("click", async () => {
      try {
        await copyTextToClipboard(getShareUrl());
        selectors.copyFeedback.textContent = "Link copied to clipboard.";
        showToast("Link copied");
      } catch (_error) {
        selectors.copyFeedback.textContent = "Copy failed. Please copy from the address bar.";
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
    applyQueryState();
    bindEvents();
    updateResultUI();
  };

  return { init };
})();

window.addEventListener("DOMContentLoaded", LoanCalculator.init);
