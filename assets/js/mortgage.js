const MortgageCalculator = (() => {
  const selectors = {
    downPaymentPercentField: document.getElementById("downPaymentPercent")?.closest(".field") || null,
    downPaymentAmountField: document.getElementById("downPaymentAmount")?.closest(".field") || null,
    toggleAdvanced: document.getElementById("toggleMortgageAdvanced"),
    advancedPanel: document.getElementById("mortgageAdvancedPanel"),
    toggleSchedule: document.getElementById("toggleMortgageSchedule"),
    schedulePanel: document.getElementById("mortgageSchedulePanel"),
    scheduleBody: document.getElementById("mortgageScheduleBody"),
    principalInterestChart: document.getElementById("mortgagePrincipalInterestChart"),
    balanceChart: document.getElementById("mortgageBalanceChart"),
    affordabilityWarning: document.getElementById("affordabilityWarning"),
    comparisonBars: document.getElementById("comparisonBars"),
    mortgageInputs: Array.from(document.querySelectorAll("[data-input-bind]"))
  };

  let displayedSchedule = [];
  let baselineSchedule = [];
  let acceleratedSchedule = [];
  let principalInterestChartInstance;
  let balanceChartInstance;
  let computeRaf = null;

  const getState = () => (typeof SharedState !== "undefined" ? SharedState.getState() : {});

  const setCurrency = (value) =>
    (typeof CurrencyLayer !== "undefined"
      ? CurrencyLayer.formatCurrency(value)
      : new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
          maximumFractionDigits: 2
        }).format(Number(value) || 0));

  const getMonthlyPayment = (principal, annualRate, totalMonths) => {
    if (!principal || !totalMonths) return 0;
    const monthlyRate = annualRate / 100 / 12;
    if (monthlyRate === 0) return principal / totalMonths;
    const factor = (1 + monthlyRate) ** totalMonths;
    return (principal * monthlyRate * factor) / (factor - 1);
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
        if (month === extraConfig.startMonth) lumpApplied = extraConfig.lumpSum;
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

  const summarizeSchedule = (schedule) => ({
    totalPaid: schedule.reduce((sum, row) => sum + row.payment, 0),
    totalInterest: schedule.reduce((sum, row) => sum + row.interest, 0),
    months: schedule.length
  });

  const getPayoffDate = (monthsAhead) => {
    const payoff = new Date();
    payoff.setMonth(payoff.getMonth() + monthsAhead);
    return payoff.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  };

  const setStateIfChanged = (patch) => {
    if (typeof SharedState === "undefined") return;
    const current = SharedState.getState();
    const next = {};
    Object.entries(patch).forEach(([key, value]) => {
      if (current[key] === value) return;
      next[key] = value;
    });
    if (!Object.keys(next).length) return;
    SharedState.setState(next);
    console.log("[Mortgage] state updated", Object.keys(next));
  };

  const buildComparisonBars = (summary15, summary30) => {
    const maxInterest = Math.max(summary15.totalInterest, summary30.totalInterest, 1);
    const width15 = Math.max(4, Math.round((summary15.totalInterest / maxInterest) * 100));
    const width30 = Math.max(4, Math.round((summary30.totalInterest / maxInterest) * 100));
    return `
      <div class="interest-bar-row">
        <span>15-year interest</span>
        <div class="interest-bar-track"><div class="interest-bar-fill" style="width:${width15}%"></div></div>
      </div>
      <div class="interest-bar-row">
        <span>30-year interest</span>
        <div class="interest-bar-track"><div class="interest-bar-fill danger" style="width:${width30}%"></div></div>
      </div>
    `;
  };

  const computeMortgage = (state) => {
    const homePrice = Math.max(0, Number(state.loan_amount) || 0);
    const downType = String(state.mortgage_down_payment_type || "percent");
    const downPercent = Math.max(0, Number(state.mortgage_down_payment_percent) || 20);
    const downAmountRaw = Math.max(0, Number(state.down_payment) || 0);
    const downPayment = downType === "percent" ? (homePrice * downPercent) / 100 : downAmountRaw;
    const loanAmount = Math.max(0, homePrice - downPayment);

    const annualRate = Math.max(0, Number(state.interest_rate) || 0);
    const loanTermYears = Math.max(1, Number(state.loan_term) || 30);
    const totalMonths = loanTermYears * 12;
    const extraMonthly = Math.max(0, Number(state.extra_payment) || 0);
    const lumpSum = Math.max(0, Number(state.mortgage_lump_sum_payment) || 0);
    const paymentStartMonth = Math.max(1, Math.min(totalMonths, Number(state.mortgage_payment_start_month) || 1));

    const monthlyPrincipalInterest = getMonthlyPayment(loanAmount, annualRate, totalMonths);
    const taxMonthly = Math.max(0, Number(state.property_tax_annual) || 0) / 12;
    const insuranceMonthly = Math.max(0, Number(state.home_insurance_annual) || 0) / 12;
    const monthlyEscrow = taxMonthly + insuranceMonthly;
    const extraConfig = { extraMonthly, lumpSum, startMonth: paymentStartMonth };

    baselineSchedule = buildSchedule({
      principal: loanAmount,
      annualRate,
      totalMonths,
      monthlyPayment: monthlyPrincipalInterest,
      includeExtra: false,
      extraConfig
    });
    acceleratedSchedule = buildSchedule({
      principal: loanAmount,
      annualRate,
      totalMonths,
      monthlyPayment: monthlyPrincipalInterest,
      includeExtra: true,
      extraConfig
    });
    displayedSchedule = acceleratedSchedule;

    const summary = summarizeSchedule(displayedSchedule);
    const monthlyMortgagePayment = monthlyPrincipalInterest + monthlyEscrow;
    const totalHomeCost = homePrice - (homePrice - loanAmount) + summary.totalPaid + monthlyEscrow * summary.months;
    const payoffDate = getPayoffDate(summary.months);

    const monthlyIncome = Math.max(0, Number(state.income) || 0) / 12;
    const recommendedMonthly = monthlyIncome > 0 ? (monthlyIncome * 0.28) : 0;
    const warningMessage =
      recommendedMonthly === 0
        ? "Enter annual income to get an affordability signal."
        : monthlyMortgagePayment > recommendedMonthly
          ? "Warning: Estimated housing payment is above the 28% affordability guideline."
          : "Good fit: Estimated housing payment is within the 28% guideline.";

    const monthly15 = getMonthlyPayment(loanAmount, annualRate, 180);
    const monthly30 = getMonthlyPayment(loanAmount, annualRate, 360);
    const summary15 = summarizeSchedule(
      buildSchedule({
        principal: loanAmount,
        annualRate,
        totalMonths: 180,
        monthlyPayment: monthly15,
        includeExtra: false,
        extraConfig: { extraMonthly: 0, lumpSum: 0, startMonth: 1 }
      })
    );
    const summary30 = summarizeSchedule(
      buildSchedule({
        principal: loanAmount,
        annualRate,
        totalMonths: 360,
        monthlyPayment: monthly30,
        includeExtra: false,
        extraConfig: { extraMonthly: 0, lumpSum: 0, startMonth: 1 }
      })
    );

    return {
      schedule: displayedSchedule,
      comparisonBarsHtml: buildComparisonBars(summary15, summary30),
      warningClassOn: recommendedMonthly > 0 && monthlyMortgagePayment > recommendedMonthly,
      statePatch: {
        loan_amount: loanAmount,
        down_payment: downPayment,
        mortgage_computed_loan_amount: loanAmount,
        mortgage_monthly_payment: monthlyMortgagePayment,
        mortgage_total_interest: summary.totalInterest,
        mortgage_total_cost: totalHomeCost,
        mortgage_principal_interest_monthly: monthlyPrincipalInterest,
        mortgage_tax_insurance_monthly: monthlyEscrow,
        mortgage_summary_total_payments: summary.totalPaid + monthlyEscrow * summary.months,
        mortgage_summary_total_interest: summary.totalInterest,
        mortgage_payoff_date: payoffDate,
        mortgage_summary_payoff_date: payoffDate,
        mortgage_recommended_payment: recommendedMonthly,
        mortgage_actual_payment: monthlyMortgagePayment,
        mortgage_compare_15_monthly: monthly15,
        mortgage_compare_15_interest: summary15.totalInterest,
        mortgage_compare_30_monthly: monthly30,
        mortgage_compare_30_interest: summary30.totalInterest,
        mortgage_compare_interest_diff: Math.max(0, summary30.totalInterest - summary15.totalInterest),
        mortgage_affordability_warning: warningMessage
      }
    };
  };

  const renderScheduleTable = (schedule) => {
    if (!selectors.scheduleBody) return;
    selectors.scheduleBody.innerHTML = schedule
      .map((row, index) => {
        const classes = [];
        if (index === schedule.length - 1) classes.push("payoff-row");
        if (row.hadExtraPayment) classes.push("extra-row");
        return `
          <tr class="${classes.join(" ")}">
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

  const buildSeries = (schedule, key, length, padWithZero = false) =>
    Array.from({ length }, (_, i) => {
      const row = schedule[i];
      if (!row) return padWithZero ? 0 : null;
      return Number(row[key].toFixed(2));
    });

  const getChartOptions = (yLabel) => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: { legend: { position: "top" } },
    scales: {
      x: { title: { display: true, text: "Month" } },
      y: {
        title: { display: true, text: yLabel },
        ticks: { callback: (value) => setCurrency(Number(value) || 0) }
      }
    }
  });

  const renderCharts = () => {
    if (!window.Chart || !selectors.principalInterestChart || !selectors.balanceChart) return;
    const maxMonths = Math.max(baselineSchedule.length, acceleratedSchedule.length, 1);
    const labels = Array.from({ length: maxMonths }, (_, i) => i + 1);
    if (principalInterestChartInstance) principalInterestChartInstance.destroy();
    if (balanceChartInstance) balanceChartInstance.destroy();
    principalInterestChartInstance = new window.Chart(selectors.principalInterestChart, {
      type: "line",
      data: {
        labels,
        datasets: [
          { label: "Principal (Original)", data: buildSeries(baselineSchedule, "principal", maxMonths), borderColor: "#8da8de", borderDash: [6, 6], tension: 0.24, pointRadius: 0 },
          { label: "Interest (Original)", data: buildSeries(baselineSchedule, "interest", maxMonths), borderColor: "#b0bac8", borderDash: [6, 6], tension: 0.24, pointRadius: 0 },
          { label: "Principal (With Extra)", data: buildSeries(acceleratedSchedule, "principal", maxMonths), borderColor: "#1b63f0", tension: 0.24, pointRadius: 0 },
          { label: "Interest (With Extra)", data: buildSeries(acceleratedSchedule, "interest", maxMonths), borderColor: "#5f6b7a", tension: 0.24, pointRadius: 0 }
        ]
      },
      options: getChartOptions("Amount (USD)")
    });
    balanceChartInstance = new window.Chart(selectors.balanceChart, {
      type: "line",
      data: {
        labels,
        datasets: [
          { label: "Balance (Original)", data: buildSeries(baselineSchedule, "balance", maxMonths, true), borderColor: "#8da8de", borderDash: [6, 6], tension: 0.24, pointRadius: 0 },
          { label: "Balance (With Extra)", data: buildSeries(acceleratedSchedule, "balance", maxMonths, true), borderColor: "#144fc1", tension: 0.24, pointRadius: 0 }
        ]
      },
      options: getChartOptions("Remaining Balance (USD)")
    });
  };

  const syncUiFromState = (state) => {
    const downType = String(state.mortgage_down_payment_type || "percent");
    if (selectors.downPaymentPercentField) selectors.downPaymentPercentField.style.display = downType === "percent" ? "" : "none";
    if (selectors.downPaymentAmountField) selectors.downPaymentAmountField.style.display = downType === "percent" ? "none" : "";
    if (selectors.affordabilityWarning) selectors.affordabilityWarning.classList.toggle("warning", !!state.mortgage_affordability_warning?.startsWith("Warning:"));
  };

  const scheduleRecompute = () => {
    if (computeRaf) cancelAnimationFrame(computeRaf);
    computeRaf = requestAnimationFrame(() => {
      computeRaf = null;
      const state = getState();
      console.log("[Mortgage] compute triggered");
      const computed = computeMortgage(state);
      renderScheduleTable(computed.schedule);
      renderCharts();
      if (selectors.comparisonBars) selectors.comparisonBars.innerHTML = computed.comparisonBarsHtml;
      if (selectors.affordabilityWarning) selectors.affordabilityWarning.classList.toggle("warning", computed.warningClassOn);
      syncUiFromState(state);
      setStateIfChanged(computed.statePatch);
    });
  };

  const bindUiOnlyEvents = () => {
    if (selectors.toggleAdvanced && selectors.advancedPanel) {
      selectors.toggleAdvanced.addEventListener("click", () => {
        const isOpen = selectors.advancedPanel.classList.toggle("is-open");
        selectors.advancedPanel.setAttribute("aria-hidden", String(!isOpen));
        selectors.toggleAdvanced.textContent = isOpen ? "Hide Advanced: Extra Payments" : "Advanced: Extra Payments";
      });
    }
    if (selectors.toggleSchedule && selectors.schedulePanel) {
      selectors.toggleSchedule.addEventListener("click", () => {
        const isOpen = selectors.schedulePanel.classList.toggle("is-open");
        selectors.schedulePanel.setAttribute("aria-hidden", String(!isOpen));
        selectors.toggleSchedule.textContent = isOpen ? "Hide full amortization schedule" : "Show full amortization schedule";
      });
    }
  };

  const init = () => {
    if (document.body.dataset.page !== "mortgage-calculator") return;
    bindUiOnlyEvents();
    if (typeof GeoFinance !== "undefined" && typeof SharedState !== "undefined") {
      const state = getState();
      if (state.loan_term === undefined) {
        const geo = GeoFinance.getCountryData();
        setStateIfChanged({ loan_term: Math.max(1, Number(geo.loan_norm_years) || 5) });
      }
      if (!state.mortgage_down_payment_type) {
        setStateIfChanged({ mortgage_down_payment_type: "percent", mortgage_down_payment_percent: 20 });
      }
    }
    if (window.getEventListeners) {
      selectors.mortgageInputs.forEach((node) => {
        const listeners = window.getEventListeners(node);
        const count = Object.values(listeners || {}).reduce((sum, list) => sum + list.length, 0);
        console.log("[Mortgage] input listener count", node.id || node.name || "unnamed", count);
      });
    }
    scheduleRecompute();
    window.addEventListener("appStateChanged", scheduleRecompute);
  };

  return { init, computeMortgage };
})();

window.addEventListener("DOMContentLoaded", MortgageCalculator.init);
