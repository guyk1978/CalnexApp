const CarLoanCalculator = (() => {
  const selectors = {
    carPrice: document.getElementById("carPrice"),
    downPaymentType: document.getElementById("carDownPaymentType"),
    downPaymentPercent: document.getElementById("carDownPaymentPercent"),
    downPaymentAmount: document.getElementById("carDownPaymentAmount"),
    tradeInValue: document.getElementById("tradeInValue"),
    fees: document.getElementById("carFees"),
    interestRate: document.getElementById("carInterestRate"),
    loanTerm: document.getElementById("carLoanTerm"),
    termUnit: document.getElementById("carTermUnit"),
    annualIncome: document.getElementById("carAnnualIncome"),
    computedLoanAmount: document.getElementById("carComputedLoanAmount"),
    monthlyPayment: document.getElementById("carMonthlyPayment"),
    totalInterest: document.getElementById("carTotalInterestPaid"),
    totalCost: document.getElementById("carTotalVehicleCost"),
    scheduleBody: document.getElementById("carScheduleBody"),
    principalInterestChart: document.getElementById("carPrincipalInterestChart"),
    balanceChart: document.getElementById("carBalanceChart"),
    toggleSchedule: document.getElementById("toggleCarSchedule"),
    schedulePanel: document.getElementById("carSchedulePanel"),
    safeMin: document.getElementById("carSafeMin"),
    safeMax: document.getElementById("carSafeMax"),
    currentPayment: document.getElementById("carCurrentPayment"),
    affordabilityStatus: document.getElementById("carAffordabilityStatus"),
    comparePriceB: document.getElementById("compareCarPriceB"),
    compareDownB: document.getElementById("compareDownB"),
    compareRateB: document.getElementById("compareRateB"),
    compareTermB: document.getElementById("compareTermB"),
    compareMonthlyA: document.getElementById("compareMonthlyA"),
    compareMonthlyB: document.getElementById("compareMonthlyB"),
    compareDifference: document.getElementById("compareDifference"),
    insight72vs48: document.getElementById("insight72vs48"),
    insightInterestDiff: document.getElementById("insightInterestDiff")
  };

  let principalInterestChartInstance;
  let balanceChartInstance;

  const setCurrency = (value) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2
    }).format(Number(value) || 0);

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

  const buildSchedule = ({ principal, annualRate, totalMonths, monthlyPayment }) => {
    const monthlyRate = annualRate / 100 / 12;
    const schedule = [];
    let balance = principal;
    let month = 1;
    while (balance > 0 && month <= Math.max(totalMonths + 120, 720)) {
      const interest = monthlyRate === 0 ? 0 : balance * monthlyRate;
      const principalPaid = Math.min(balance, Math.max(0, monthlyPayment - interest));
      const payment = principalPaid + interest;
      balance = Math.max(0, balance - principalPaid);
      schedule.push({ month, payment, principal: principalPaid, interest, balance });
      month += 1;
    }
    return schedule;
  };

  const summarizeSchedule = (schedule) => ({
    totalPaid: schedule.reduce((sum, row) => sum + row.payment, 0),
    totalInterest: schedule.reduce((sum, row) => sum + row.interest, 0)
  });

  const computeLoanBase = () => {
    const carPrice = parseValue(selectors.carPrice);
    const tradeInValue = Math.max(0, parseValue(selectors.tradeInValue));
    const fees = Math.max(0, parseValue(selectors.fees));
    const downByPercent = (carPrice * Math.max(0, parseValue(selectors.downPaymentPercent))) / 100;
    const downByAmount = Math.max(0, parseValue(selectors.downPaymentAmount));
    const downPayment = selectors.downPaymentType.value === "percent" ? downByPercent : downByAmount;
    const financed = Math.max(0, carPrice - downPayment - tradeInValue + fees);
    return { carPrice, tradeInValue, fees, downPayment, financed };
  };

  const renderSchedule = (schedule) => {
    selectors.scheduleBody.innerHTML = schedule
      .map(
        (row, index) => `
        <tr class="${index === schedule.length - 1 ? "payoff-row" : ""}">
          <td>${row.month}</td>
          <td>${setCurrency(row.payment)}</td>
          <td>${setCurrency(row.principal)}</td>
          <td>${setCurrency(row.interest)}</td>
          <td>${setCurrency(row.balance)}</td>
        </tr>
      `
      )
      .join("");
  };

  const renderCharts = (schedule) => {
    if (!window.Chart) return;
    const labels = schedule.map((row) => row.month);
    const principal = schedule.map((row) => Number(row.principal.toFixed(2)));
    const interest = schedule.map((row) => Number(row.interest.toFixed(2)));
    const balance = schedule.map((row) => Number(row.balance.toFixed(2)));

    if (principalInterestChartInstance) principalInterestChartInstance.destroy();
    if (balanceChartInstance) balanceChartInstance.destroy();

    principalInterestChartInstance = new window.Chart(selectors.principalInterestChart, {
      type: "line",
      data: {
        labels,
        datasets: [
          { label: "Principal", data: principal, borderColor: "#1b63f0", tension: 0.22, pointRadius: 0 },
          { label: "Interest", data: interest, borderColor: "#5f6b7a", tension: 0.22, pointRadius: 0 }
        ]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });

    balanceChartInstance = new window.Chart(selectors.balanceChart, {
      type: "line",
      data: {
        labels,
        datasets: [{ label: "Remaining Balance", data: balance, borderColor: "#144fc1", tension: 0.22, pointRadius: 0 }]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
  };

  const updateAffordability = (monthlyPayment) => {
    const monthlyIncome = parseValue(selectors.annualIncome) / 12;
    const safeMin = monthlyIncome * 0.15;
    const safeMax = monthlyIncome * 0.2;
    selectors.safeMin.textContent = setCurrency(safeMin);
    selectors.safeMax.textContent = setCurrency(safeMax);
    selectors.currentPayment.textContent = setCurrency(monthlyPayment);

    selectors.affordabilityStatus.classList.remove("status-green", "status-yellow", "status-red");
    if (monthlyIncome <= 0) {
      selectors.affordabilityStatus.textContent = "Add income to evaluate affordability range.";
      return;
    }
    if (monthlyPayment <= safeMax) {
      selectors.affordabilityStatus.textContent = "Affordable (green): payment is within safe range.";
      selectors.affordabilityStatus.classList.add("status-green");
    } else if (monthlyPayment <= safeMax * 1.2) {
      selectors.affordabilityStatus.textContent = "Stretching (yellow): payment is above safe range.";
      selectors.affordabilityStatus.classList.add("status-yellow");
    } else {
      selectors.affordabilityStatus.textContent = "Not affordable (red): payment is significantly above safe range.";
      selectors.affordabilityStatus.classList.add("status-red");
    }
  };

  const updateComparison = (currentMonthly) => {
    const priceB = Math.max(0, parseValue(selectors.comparePriceB));
    const downB = Math.max(0, parseValue(selectors.compareDownB));
    const rateB = Math.max(0, parseValue(selectors.compareRateB));
    const termB = Math.max(1, parseValue(selectors.compareTermB));
    const financedB = Math.max(0, priceB - downB);
    const monthlyB = getMonthlyPayment(financedB, rateB, termB);
    const diff = monthlyB - currentMonthly;
    selectors.compareMonthlyA.textContent = setCurrency(currentMonthly);
    selectors.compareMonthlyB.textContent = setCurrency(monthlyB);
    selectors.compareDifference.textContent = `${diff >= 0 ? "+" : "-"}${setCurrency(Math.abs(diff))}`;
  };

  const updateInsights = (financed, annualRate) => {
    const monthly48 = getMonthlyPayment(financed, annualRate, 48);
    const monthly72 = getMonthlyPayment(financed, annualRate, 72);
    const schedule48 = buildSchedule({ principal: financed, annualRate, totalMonths: 48, monthlyPayment: monthly48 });
    const schedule72 = buildSchedule({ principal: financed, annualRate, totalMonths: 72, monthlyPayment: monthly72 });
    const summary48 = summarizeSchedule(schedule48);
    const summary72 = summarizeSchedule(schedule72);
    const monthlyDiff = Math.max(0, monthly48 - monthly72);
    const interestDiff = Math.max(0, summary72.totalInterest - summary48.totalInterest);
    selectors.insight72vs48.textContent = `You pay ${setCurrency(interestDiff)} more in total interest with 72 months vs 48 months, while reducing monthly payment by about ${setCurrency(monthlyDiff)}.`;
    selectors.insightInterestDiff.textContent = `Interest difference over time: ${setCurrency(interestDiff)} in additional borrowing cost.`;
  };

  const updateSharedState = (financed, annualRate) => {
    if (typeof SharedState === "undefined") return;
    const { downPayment } = computeLoanBase();
    const totalMonths = Math.max(1, getTermInMonths());
    const monthlyPayment = getMonthlyPayment(financed, annualRate, totalMonths);
    const schedule = buildSchedule({ principal: financed, annualRate, totalMonths, monthlyPayment });
    const summary = summarizeSchedule(schedule);
    const { carPrice, tradeInValue, fees } = computeLoanBase();
    SharedState.setState({
      loan_amount: financed,
      interest_rate: annualRate,
      loan_term: totalMonths,
      extra_payment: 0,
      down_payment: downPayment,
      income: parseValue(selectors.annualIncome),
      car_monthly_payment: monthlyPayment,
      car_total_interest: summary.totalInterest,
      car_total_cost: carPrice - tradeInValue - downPayment + fees + summary.totalPaid
    });
  };

  const updateResultUI = () => {
    const { carPrice, financed, tradeInValue, downPayment, fees } = computeLoanBase();
    const annualRate = Math.max(0, parseValue(selectors.interestRate));
    const totalMonths = Math.max(1, getTermInMonths());
    const monthlyPayment = getMonthlyPayment(financed, annualRate, totalMonths);
    const schedule = buildSchedule({ principal: financed, annualRate, totalMonths, monthlyPayment });
    const summary = summarizeSchedule(schedule);

    selectors.computedLoanAmount.textContent = setCurrency(financed);
    selectors.monthlyPayment.textContent = setCurrency(monthlyPayment);
    selectors.totalInterest.textContent = setCurrency(summary.totalInterest);
    selectors.totalCost.textContent = setCurrency(carPrice - tradeInValue - downPayment + fees + summary.totalPaid);
    renderSchedule(schedule);
    renderCharts(schedule);
    updateAffordability(monthlyPayment);
    updateComparison(monthlyPayment);
    updateInsights(financed, annualRate);
    updateSharedState(financed, annualRate);
  };

  const togglePanel = () => {
    const isOpen = selectors.schedulePanel.classList.toggle("is-open");
    selectors.schedulePanel.setAttribute("aria-hidden", String(!isOpen));
    selectors.toggleSchedule.textContent = isOpen ? "Hide amortization schedule" : "Show amortization schedule";
  };

  const bindEvents = () => {
    [
      selectors.carPrice,
      selectors.downPaymentPercent,
      selectors.downPaymentAmount,
      selectors.tradeInValue,
      selectors.fees,
      selectors.interestRate,
      selectors.loanTerm,
      selectors.termUnit,
      selectors.annualIncome,
      selectors.comparePriceB,
      selectors.compareDownB,
      selectors.compareRateB,
      selectors.compareTermB
    ].forEach((node) => node.addEventListener("input", updateResultUI));

    selectors.downPaymentType.addEventListener("change", () => {
      const isPercent = selectors.downPaymentType.value === "percent";
      selectors.downPaymentPercent.closest(".field").style.display = isPercent ? "" : "none";
      selectors.downPaymentAmount.closest(".field").style.display = isPercent ? "none" : "";
      updateResultUI();
    });

    selectors.toggleSchedule.addEventListener("click", togglePanel);
  };

  const applySharedState = () => {
    if (typeof SharedState === "undefined") return;
    const shared = SharedState.getState();
    if (shared.loan_amount !== undefined) selectors.carPrice.value = String(shared.loan_amount);
    if (shared.interest_rate !== undefined) selectors.interestRate.value = String(shared.interest_rate);
    if (shared.loan_term !== undefined) {
      if (shared.loan_term > 84) {
        selectors.termUnit.value = "years";
        selectors.loanTerm.value = String(Math.max(1, Math.round(shared.loan_term / 12)));
      } else {
        selectors.termUnit.value = "months";
        selectors.loanTerm.value = String(shared.loan_term);
      }
    }
    if (shared.down_payment !== undefined) {
      selectors.downPaymentType.value = "fixed";
      selectors.downPaymentAmount.value = String(shared.down_payment);
    }
    if (shared.income !== undefined) selectors.annualIncome.value = String(shared.income);
    SharedState.refreshToolLinks();
  };

  const init = () => {
    if (document.body.dataset.page !== "car-loan-calculator") return;
    applySharedState();
    const isPercent = selectors.downPaymentType.value === "percent";
    selectors.downPaymentPercent.closest(".field").style.display = isPercent ? "" : "none";
    selectors.downPaymentAmount.closest(".field").style.display = isPercent ? "none" : "";
    bindEvents();
    updateResultUI();
    document.addEventListener("sharedstate:updated", () => {
      applySharedState();
      updateResultUI();
    });
  };

  return { init };
})();

window.addEventListener("DOMContentLoaded", CarLoanCalculator.init);
