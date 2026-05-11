const MortgageCalculator = (() => {
  const selectors = {
    homePrice: document.getElementById("homePrice"),
    downPaymentType: document.getElementById("downPaymentType"),
    downPaymentPercent: document.getElementById("downPaymentPercent"),
    downPaymentAmount: document.getElementById("downPaymentAmount"),
    computedLoanAmount: document.getElementById("computedLoanAmount"),
    interestRate: document.getElementById("mortgageInterestRate"),
    loanTerm: document.getElementById("mortgageLoanTerm"),
    propertyTaxAnnual: document.getElementById("propertyTaxAnnual"),
    homeInsuranceAnnual: document.getElementById("homeInsuranceAnnual"),
    extraMonthlyPayment: document.getElementById("mortgageExtraMonthlyPayment"),
    lumpSumPayment: document.getElementById("mortgageLumpSumPayment"),
    paymentStartMonth: document.getElementById("mortgagePaymentStartMonth"),
    annualIncome: document.getElementById("annualIncome"),
    toggleAdvanced: document.getElementById("toggleMortgageAdvanced"),
    advancedPanel: document.getElementById("mortgageAdvancedPanel"),
    toggleSchedule: document.getElementById("toggleMortgageSchedule"),
    schedulePanel: document.getElementById("mortgageSchedulePanel"),
    monthlyMortgagePayment: document.getElementById("monthlyMortgagePayment"),
    totalInterestPaid: document.getElementById("totalInterestPaid"),
    totalHomeCost: document.getElementById("totalHomeCost"),
    principalInterestMonthly: document.getElementById("principalInterestMonthly"),
    taxInsuranceMonthly: document.getElementById("taxInsuranceMonthly"),
    payoffDate: document.getElementById("payoffDate"),
    summaryTotalPayments: document.getElementById("mortgageSummaryTotalPayments"),
    summaryTotalInterest: document.getElementById("mortgageSummaryTotalInterest"),
    summaryPayoffDate: document.getElementById("mortgageSummaryPayoffDate"),
    scheduleBody: document.getElementById("mortgageScheduleBody"),
    principalInterestChart: document.getElementById("mortgagePrincipalInterestChart"),
    balanceChart: document.getElementById("mortgageBalanceChart"),
    affordabilityRecommended: document.getElementById("recommendedPayment"),
    affordabilityActual: document.getElementById("actualPayment"),
    affordabilityWarning: document.getElementById("affordabilityWarning"),
    compare15Monthly: document.getElementById("compare15Monthly"),
    compare15Interest: document.getElementById("compare15Interest"),
    compare30Monthly: document.getElementById("compare30Monthly"),
    compare30Interest: document.getElementById("compare30Interest"),
    compareDifference: document.getElementById("compareInterestDifference"),
    comparisonBars: document.getElementById("comparisonBars")
  };

  let displayedSchedule = [];
  let baselineSchedule = [];
  let acceleratedSchedule = [];
  let principalInterestChartInstance;
  let balanceChartInstance;

  const setCurrency = (value) =>
    (typeof CurrencyLayer !== "undefined"
      ? CurrencyLayer.formatCurrency(value)
      : new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
          maximumFractionDigits: 2
        }).format(Number(value) || 0));

  const parseValue = (node) => Number(node?.value) || 0;

  const getExtraConfig = () => {
    const totalMonths = parseValue(selectors.loanTerm) * 12;
    const startMonth = Math.max(1, Math.min(totalMonths, parseValue(selectors.paymentStartMonth) || 1));
    selectors.paymentStartMonth.value = String(startMonth);
    return {
      extraMonthly: Math.max(0, parseValue(selectors.extraMonthlyPayment)),
      lumpSum: Math.max(0, parseValue(selectors.lumpSumPayment)),
      startMonth
    };
  };

  const syncDownPayment = () => {
    const homePrice = parseValue(selectors.homePrice);
    const isPercent = selectors.downPaymentType.value === "percent";
    const percent = Math.max(0, parseValue(selectors.downPaymentPercent));
    const fixed = Math.max(0, parseValue(selectors.downPaymentAmount));
    const downPayment = isPercent ? (homePrice * percent) / 100 : fixed;
    const loanAmount = Math.max(0, homePrice - downPayment);
    return { loanAmount, downPayment, homePrice };
  };

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

  const renderScheduleTable = (schedule) => {
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
            tension: 0.24,
            pointRadius: 0
          },
          {
            label: "Interest (With Extra)",
            data: buildSeries(acceleratedSchedule, "interest", maxMonths),
            borderColor: "#5f6b7a",
            tension: 0.24,
            pointRadius: 0
          }
        ]
      },
      options: getChartOptions("Amount (USD)")
    });

    balanceChartInstance = new window.Chart(selectors.balanceChart, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Balance (Original)",
            data: buildSeries(baselineSchedule, "balance", maxMonths, true),
            borderColor: "#8da8de",
            borderDash: [6, 6],
            tension: 0.24,
            pointRadius: 0
          },
          {
            label: "Balance (With Extra)",
            data: buildSeries(acceleratedSchedule, "balance", maxMonths, true),
            borderColor: "#144fc1",
            tension: 0.24,
            pointRadius: 0
          }
        ]
      },
      options: getChartOptions("Remaining Balance (USD)")
    });
  };

  const updateAffordability = (monthlyHousingPayment) => {
    const annualIncome = parseValue(selectors.annualIncome);
    const recommendedMonthly = annualIncome > 0 ? (annualIncome * 0.28) / 12 : 0;
    let warningMessage = "Enter annual income to get an affordability signal.";
    if (recommendedMonthly === 0) {
      selectors.affordabilityWarning.classList.remove("warning");
      if (typeof SharedState !== "undefined") {
        SharedState.setState({ mortgage_affordability_warning: warningMessage });
      }
      return;
    }

    if (monthlyHousingPayment > recommendedMonthly) {
      warningMessage = "Warning: Estimated housing payment is above the 28% affordability guideline.";
      selectors.affordabilityWarning.classList.add("warning");
    } else {
      warningMessage = "Good fit: Estimated housing payment is within the 28% guideline.";
      selectors.affordabilityWarning.classList.remove("warning");
    }
    if (typeof SharedState !== "undefined") {
      SharedState.setState({ mortgage_affordability_warning: warningMessage });
    }
  };

  const updateComparison = (principal, annualRate) => {
    const monthly15 = getMonthlyPayment(principal, annualRate, 180);
    const monthly30 = getMonthlyPayment(principal, annualRate, 360);
    const schedule15 = buildSchedule({
      principal,
      annualRate,
      totalMonths: 180,
      monthlyPayment: monthly15,
      includeExtra: false,
      extraConfig: { extraMonthly: 0, lumpSum: 0, startMonth: 1 }
    });
    const schedule30 = buildSchedule({
      principal,
      annualRate,
      totalMonths: 360,
      monthlyPayment: monthly30,
      includeExtra: false,
      extraConfig: { extraMonthly: 0, lumpSum: 0, startMonth: 1 }
    });
    const summary15 = summarizeSchedule(schedule15);
    const summary30 = summarizeSchedule(schedule30);
    const diff = Math.max(0, summary30.totalInterest - summary15.totalInterest);

    const maxInterest = Math.max(summary15.totalInterest, summary30.totalInterest, 1);
    const width15 = Math.max(4, Math.round((summary15.totalInterest / maxInterest) * 100));
    const width30 = Math.max(4, Math.round((summary30.totalInterest / maxInterest) * 100));
    selectors.comparisonBars.innerHTML = `
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

  const updateResultUI = () => {
    const { loanAmount, homePrice } = syncDownPayment();
    const annualRate = parseValue(selectors.interestRate);
    const totalMonths = parseValue(selectors.loanTerm) * 12;
    const monthlyPrincipalInterest = getMonthlyPayment(loanAmount, annualRate, totalMonths);
    const taxMonthly = parseValue(selectors.propertyTaxAnnual) / 12;
    const insuranceMonthly = parseValue(selectors.homeInsuranceAnnual) / 12;
    const monthlyEscrow = taxMonthly + insuranceMonthly;
    const extraConfig = getExtraConfig();

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

    renderScheduleTable(displayedSchedule);
    renderCharts();
    updateAffordability(monthlyMortgagePayment);
    updateComparison(loanAmount, annualRate);
    if (typeof SharedState !== "undefined") {
      SharedState.setState({
        loan_amount: loanAmount,
        interest_rate: annualRate,
        loan_term: parseValue(selectors.loanTerm),
        extra_payment: parseValue(selectors.extraMonthlyPayment),
        down_payment: Math.max(0, homePrice - loanAmount),
        income: parseValue(selectors.annualIncome),
        mortgage_computed_loan_amount: loanAmount,
        mortgage_monthly_payment: monthlyMortgagePayment,
        mortgage_total_interest: summary.totalInterest,
        mortgage_total_cost: totalHomeCost,
        mortgage_principal_interest_monthly: monthlyPrincipalInterest,
        mortgage_tax_insurance_monthly: monthlyEscrow,
        mortgage_summary_total_payments: summary.totalPaid + monthlyEscrow * summary.months,
        mortgage_summary_total_interest: summary.totalInterest,
        mortgage_payoff_date: getPayoffDate(summary.months),
        mortgage_summary_payoff_date: getPayoffDate(summary.months)
      });
    }
    const annualIncome = parseValue(selectors.annualIncome);
    const recommendedMonthly = annualIncome > 0 ? (annualIncome * 0.28) / 12 : 0;
    const monthly15 = getMonthlyPayment(loanAmount, annualRate, 180);
    const monthly30 = getMonthlyPayment(loanAmount, annualRate, 360);
    const schedule15 = buildSchedule({
      principal: loanAmount,
      annualRate,
      totalMonths: 180,
      monthlyPayment: monthly15,
      includeExtra: false,
      extraConfig: { extraMonthly: 0, lumpSum: 0, startMonth: 1 }
    });
    const schedule30 = buildSchedule({
      principal: loanAmount,
      annualRate,
      totalMonths: 360,
      monthlyPayment: monthly30,
      includeExtra: false,
      extraConfig: { extraMonthly: 0, lumpSum: 0, startMonth: 1 }
    });
    const summary15 = summarizeSchedule(schedule15);
    const summary30 = summarizeSchedule(schedule30);
    if (typeof SharedState !== "undefined") {
      SharedState.setState({
        mortgage_recommended_payment: recommendedMonthly,
        mortgage_actual_payment: monthlyMortgagePayment,
        mortgage_compare_15_monthly: monthly15,
        mortgage_compare_15_interest: summary15.totalInterest,
        mortgage_compare_30_monthly: monthly30,
        mortgage_compare_30_interest: summary30.totalInterest,
        mortgage_compare_interest_diff: Math.max(0, summary30.totalInterest - summary15.totalInterest)
      });
    }
  };

  const togglePanel = (panel, button, closedText, openText) => {
    const isOpen = panel.classList.toggle("is-open");
    panel.setAttribute("aria-hidden", String(!isOpen));
    button.textContent = isOpen ? openText : closedText;
  };

  const bindEvents = () => {
    [
      selectors.homePrice,
      selectors.downPaymentPercent,
      selectors.downPaymentAmount,
      selectors.interestRate,
      selectors.loanTerm,
      selectors.propertyTaxAnnual,
      selectors.homeInsuranceAnnual,
      selectors.extraMonthlyPayment,
      selectors.lumpSumPayment,
      selectors.paymentStartMonth,
      selectors.annualIncome
    ].forEach((node) => node.addEventListener("input", updateResultUI));

    selectors.downPaymentType.addEventListener("change", () => {
      const isPercent = selectors.downPaymentType.value === "percent";
      selectors.downPaymentPercent.closest(".field").style.display = isPercent ? "" : "none";
      selectors.downPaymentAmount.closest(".field").style.display = isPercent ? "none" : "";
      updateResultUI();
    });

    selectors.toggleAdvanced.addEventListener("click", () => {
      togglePanel(
        selectors.advancedPanel,
        selectors.toggleAdvanced,
        "Advanced: Extra Payments",
        "Hide Advanced: Extra Payments"
      );
    });
    selectors.toggleSchedule.addEventListener("click", () => {
      togglePanel(
        selectors.schedulePanel,
        selectors.toggleSchedule,
        "Show full amortization schedule",
        "Hide full amortization schedule"
      );
    });
  };

  const applySharedStateInputs = () => {
    if (typeof SharedState === "undefined") return;
    const shared = SharedState.getState();
    if (shared.loan_amount !== undefined && shared.down_payment !== undefined) {
      selectors.downPaymentType.value = "fixed";
      selectors.downPaymentAmount.value = String(shared.down_payment);
      selectors.homePrice.value = String(shared.loan_amount + shared.down_payment);
    } else if (shared.loan_amount !== undefined) {
      selectors.homePrice.value = String(shared.loan_amount);
    }
    if (shared.interest_rate !== undefined) selectors.interestRate.value = String(shared.interest_rate);
    if (shared.loan_term !== undefined) selectors.loanTerm.value = String(shared.loan_term);
    if (shared.extra_payment !== undefined) selectors.extraMonthlyPayment.value = String(shared.extra_payment);
    if (shared.income !== undefined) selectors.annualIncome.value = String(shared.income);
    SharedState.refreshToolLinks();
  };

  const applyGeoDefaults = (force = false) => {
    if (typeof GeoFinance === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const hasExplicitTerm = params.has("term") || params.has("loan_term");
    if (!force && hasExplicitTerm) return;
    const geo = GeoFinance.getCountryData();
    selectors.loanTerm.value = String(Math.max(1, Number(geo.loan_norm_years) || 5));
    console.log("[CalnexApp] Applied mortgage geo defaults", geo);
  };

  const init = () => {
    if (document.body.dataset.page !== "mortgage-calculator") return;
    applySharedStateInputs();
    applyGeoDefaults(false);
    const isPercent = selectors.downPaymentType.value === "percent";
    selectors.downPaymentPercent.closest(".field").style.display = isPercent ? "" : "none";
    selectors.downPaymentAmount.closest(".field").style.display = isPercent ? "none" : "";
    bindEvents();
    updateResultUI();
    document.addEventListener("sharedstate:updated", () => {
      applySharedStateInputs();
      updateResultUI();
    });
    document.addEventListener("geo:changed", () => {
      applyGeoDefaults(true);
      updateResultUI();
    });
    document.addEventListener("currency:changed", () => {
      updateResultUI();
    });
    document.addEventListener("inputsync:updated", () => {
      updateResultUI();
    });
  };

  return { init };
})();

window.addEventListener("DOMContentLoaded", MortgageCalculator.init);
