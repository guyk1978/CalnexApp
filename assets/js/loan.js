const LoanCalculator = (() => {
  const selectors = {
    loanAmount: document.getElementById("loanAmount"),
    loanAmountSlider: document.getElementById("loanAmountSlider"),
    interestRate: document.getElementById("interestRate"),
    interestRateSlider: document.getElementById("interestRateSlider"),
    loanTerm: document.getElementById("loanTerm"),
    loanTermSlider: document.getElementById("loanTermSlider"),
    termUnit: document.getElementById("termUnit"),
    monthlyPayment: document.getElementById("monthlyPayment"),
    totalInterest: document.getElementById("totalInterest"),
    totalRepayment: document.getElementById("totalRepayment"),
    summaryTotalPayments: document.getElementById("summaryTotalPayments"),
    summaryTotalInterest: document.getElementById("summaryTotalInterest"),
    summaryPayoffDate: document.getElementById("summaryPayoffDate"),
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
  let latestSchedule = [];
  let principalInterestChartInstance;
  let balanceChartInstance;

  const setCurrency = (value) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2
    }).format(value);

  const parseValue = (node) => Number(node?.value) || 0;

  const getTermInMonths = () => {
    const term = parseValue(selectors.loanTerm);
    return selectors.termUnit.value === "years" ? term * 12 : term;
  };

  const calculateLoan = () => {
    const principal = parseValue(selectors.loanAmount);
    const annualRate = parseValue(selectors.interestRate);
    const totalMonths = getTermInMonths();

    if (!principal || !totalMonths) {
      return { monthly: 0, totalInterest: 0, totalRepayment: 0 };
    }

    const monthlyRate = annualRate / 100 / 12;
    let monthly;

    if (monthlyRate === 0) {
      monthly = principal / totalMonths;
    } else {
      const factor = (1 + monthlyRate) ** totalMonths;
      monthly = (principal * monthlyRate * factor) / (factor - 1);
    }

    const totalRepayment = monthly * totalMonths;
    const totalInterest = totalRepayment - principal;
    return { monthly, totalInterest, totalRepayment };
  };

  const buildAmortizationSchedule = () => {
    const principal = parseValue(selectors.loanAmount);
    const annualRate = parseValue(selectors.interestRate);
    const totalMonths = getTermInMonths();
    if (!principal || !totalMonths) return [];

    const monthlyRate = annualRate / 100 / 12;
    const loan = calculateLoan();
    let balance = principal;
    const schedule = [];

    for (let month = 1; month <= totalMonths; month += 1) {
      const rawInterest = monthlyRate === 0 ? 0 : balance * monthlyRate;
      const interest = Math.max(0, rawInterest);
      let principalPaid = loan.monthly - interest;
      if (month === totalMonths || principalPaid > balance) {
        principalPaid = balance;
      }
      const payment = principalPaid + interest;
      balance = Math.max(0, balance - principalPaid);

      schedule.push({
        month,
        payment,
        principal: principalPaid,
        interest,
        balance
      });
    }

    return schedule;
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
    if (!selectors.scheduleBody) return;
    selectors.scheduleBody.innerHTML = schedule
      .map((row, index) => {
        const payoffClass = index === schedule.length - 1 ? "payoff-row" : "";
        return `
          <tr class="${payoffClass}">
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

  const renderScheduleSummary = (schedule) => {
    const totalPayments = schedule.reduce((sum, row) => sum + row.payment, 0);
    const totalInterest = schedule.reduce((sum, row) => sum + row.interest, 0);
    selectors.summaryTotalPayments.textContent = setCurrency(totalPayments);
    selectors.summaryTotalInterest.textContent = setCurrency(totalInterest);
    selectors.summaryPayoffDate.textContent = schedule.length ? getPayoffDate(schedule.length) : "-";
  };

  const getChartOptions = () => ({
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
      duration: 450
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
          text: "Amount (USD)"
        },
        ticks: {
          callback: (value) => `$${Number(value).toLocaleString("en-US")}`
        }
      }
    }
  });

  const renderCharts = (schedule) => {
    if (!window.Chart || !selectors.principalInterestChart || !selectors.balanceChart) {
      return;
    }

    const labels = schedule.map((row) => row.month);
    const principalSeries = schedule.map((row) => Number(row.principal.toFixed(2)));
    const interestSeries = schedule.map((row) => Number(row.interest.toFixed(2)));
    const balanceSeries = schedule.map((row) => Number(row.balance.toFixed(2)));

    if (principalInterestChartInstance) {
      principalInterestChartInstance.destroy();
    }
    if (balanceChartInstance) {
      balanceChartInstance.destroy();
    }

    principalInterestChartInstance = new window.Chart(selectors.principalInterestChart, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Principal Paid",
            data: principalSeries,
            borderColor: "#1b63f0",
            backgroundColor: "rgba(27, 99, 240, 0.15)",
            tension: 0.25,
            pointRadius: 0
          },
          {
            label: "Interest Paid",
            data: interestSeries,
            borderColor: "#5f6b7a",
            backgroundColor: "rgba(95, 107, 122, 0.15)",
            tension: 0.25,
            pointRadius: 0
          }
        ]
      },
      options: getChartOptions()
    });

    balanceChartInstance = new window.Chart(selectors.balanceChart, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Remaining Balance",
            data: balanceSeries,
            borderColor: "#144fc1",
            backgroundColor: "rgba(20, 79, 193, 0.14)",
            tension: 0.25,
            pointRadius: 0
          }
        ]
      },
      options: getChartOptions()
    });
  };

  const toCsv = (schedule) => {
    const header = ["Month", "Payment", "Principal", "Interest", "Remaining Balance"];
    const lines = schedule.map((row) => [
      row.month,
      row.payment.toFixed(2),
      row.principal.toFixed(2),
      row.interest.toFixed(2),
      row.balance.toFixed(2)
    ]);
    return [header, ...lines].map((line) => line.join(",")).join("\n");
  };

  const downloadScheduleCsv = () => {
    if (!latestSchedule.length) return;
    const csv = toCsv(latestSchedule);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
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
    if (!latestSchedule.length) return;
    const rows = latestSchedule
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
      <html>
        <head>
          <title>Loan Amortization Schedule</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #dce4f0; padding: 8px; text-align: right; }
            th:first-child, td:first-child { text-align: left; }
            thead th { background: #f2f6fd; }
          </style>
        </head>
        <body>
          <h1>CalnexApp Loan Amortization Schedule</h1>
          <table>
            <thead>
              <tr><th>Month</th><th>Payment</th><th>Principal</th><th>Interest</th><th>Remaining Balance</th></tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </body>
      </html>
    `);
    win.document.close();
    win.focus();
    win.print();
  };

  const toggleSchedule = () => {
    const isOpen = selectors.schedulePanel.classList.toggle("is-open");
    selectors.schedulePanel.setAttribute("aria-hidden", String(!isOpen));
    selectors.toggleSchedule.textContent = isOpen ? "Hide full schedule" : "Show full schedule";
  };

  const buildCalculationQuery = () => {
    const params = new URLSearchParams();
    params.set("amount", parseValue(selectors.loanAmount).toFixed(0));
    params.set("rate", parseValue(selectors.interestRate).toFixed(2));
    params.set("term", parseValue(selectors.loanTerm).toFixed(0));
    params.set("unit", selectors.termUnit.value);
    return params.toString();
  };

  const updateSeoAndUrl = () => {
    const query = buildCalculationQuery();
    const nextUrl = `${window.location.pathname}?${query}`;
    window.history.replaceState({}, "", nextUrl);
    if (window.SeoModule) {
      window.SeoModule.setLoanMeta({
        amountText: setCurrency(parseValue(selectors.loanAmount)),
        term: parseValue(selectors.loanTerm),
        unit: selectors.termUnit.value,
        rate: parseValue(selectors.interestRate)
      });
    }
  };

  const updateShareLinks = () => {
    const url = window.location.href;
    const text = encodeURIComponent(document.title);
    const encodedUrl = encodeURIComponent(url);
    document.querySelector('[data-share="whatsapp"]').href =
      `https://wa.me/?text=${text}%20${encodedUrl}`;
    document.querySelector('[data-share="facebook"]').href =
      `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
    document.querySelector('[data-share="twitter"]').href =
      `https://twitter.com/intent/tweet?text=${text}&url=${encodedUrl}`;
  };

  const updateResultUI = () => {
    const result = calculateLoan();
    selectors.monthlyPayment.textContent = setCurrency(result.monthly);
    selectors.totalInterest.textContent = setCurrency(result.totalInterest);
    selectors.totalRepayment.textContent = setCurrency(result.totalRepayment);
    latestSchedule = buildAmortizationSchedule();
    renderScheduleSummary(latestSchedule);
    renderScheduleTable(latestSchedule);
    renderCharts(latestSchedule);
    updateSeoAndUrl();
    updateShareLinks();
  };

  const syncRangeAndInput = (inputNode, sliderNode, options = {}) => {
    const clamp = (value) => {
      if (typeof options.max !== "number" || typeof options.min !== "number") {
        return value;
      }
      return Math.min(options.max, Math.max(options.min, value));
    };

    inputNode.addEventListener("input", () => {
      const value = clamp(Number(inputNode.value) || 0);
      sliderNode.value = value;
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
    const amount = params.get("amount");
    const rate = params.get("rate");
    const term = params.get("term");
    const unit = params.get("unit");

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
  };

  const bindEvents = () => {
    syncRangeAndInput(selectors.loanAmount, selectors.loanAmountSlider, { min: 1000, max: 500000 });
    syncRangeAndInput(selectors.interestRate, selectors.interestRateSlider, { min: 0, max: 25 });
    syncRangeAndInput(selectors.loanTerm, selectors.loanTermSlider, { min: 1, max: 360 });
    selectors.termUnit.addEventListener("change", () => {
      updateTermSliderRange();
      updateResultUI();
    });
    selectors.toggleSchedule.addEventListener("click", toggleSchedule);
    selectors.downloadCsv.addEventListener("click", downloadScheduleCsv);
    selectors.printSchedule.addEventListener("click", printSchedule);

    selectors.shareButtons.forEach((node) => {
      if (node.dataset.share !== "copy") return;
      node.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(window.location.href);
          selectors.copyFeedback.textContent = "Link copied to clipboard.";
        } catch (_error) {
          selectors.copyFeedback.textContent = "Copy failed. Please copy from the address bar.";
        }
      });
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
