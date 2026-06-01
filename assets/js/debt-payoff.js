/**
 * Debt Snowball & Avalanche payoff engine + UI (CalnexApp).
 * Self-contained — does not modify FinancialCore or other tools.
 */
const DebtPayoffEngine = (() => {
  const MAX_MONTHS = 1200;
  const EPS = 0.005;

  const clampNonNeg = (n) => Math.max(0, Number(n) || 0);

  const normalizeDebts = (debts) =>
    (Array.isArray(debts) ? debts : [])
      .map((d, i) => ({
        id: d.id != null ? d.id : `debt-${i}`,
        name: String(d.name || `Debt ${i + 1}`).trim() || `Debt ${i + 1}`,
        balance: clampNonNeg(d.balance),
        annualAprPercent: clampNonNeg(d.annualAprPercent),
        minimum: clampNonNeg(d.minimum)
      }))
      .filter((d) => d.balance > EPS);

  const getPayoffOrder = (debts, strategy) => {
    const indexed = debts.map((d, i) => ({ ...d, idx: i }));
    if (strategy === "snowball") {
      return [...indexed]
        .sort((a, b) => a.balance - b.balance || b.annualAprPercent - a.annualAprPercent)
        .map((d) => d.idx);
    }
    return [...indexed]
      .sort((a, b) => b.annualAprPercent - a.annualAprPercent || a.balance - b.balance)
      .map((d) => d.idx);
  };

  const addMonths = (date, months) => {
    const d = new Date(date.getTime());
    d.setMonth(d.getMonth() + months);
    return d;
  };

  /**
   * @param {object[]} debts
   * @param {number} monthlyBudget — total monthly payment pool (minimums + extra)
   * @param {'snowball'|'avalanche'} strategy
   */
  const simulateAccelerated = (debts, monthlyBudget, strategy) => {
    const normalized = normalizeDebts(debts);
    const minSum = normalized.reduce((s, d) => s + d.minimum, 0);
    const budget = clampNonNeg(monthlyBudget);

    if (!normalized.length) {
      return {
        ok: true,
        months: 0,
        totalInterest: 0,
        timeline: [{ month: 0, totalBalance: 0 }],
        debtFreeDate: new Date(),
        minSum: 0
      };
    }

    if (budget + EPS < minSum) {
      return {
        ok: false,
        error: "budget_below_minimums",
        minSum,
        budget
      };
    }

    const state = normalized.map((d) => ({ ...d, balance: d.balance }));
    const order = getPayoffOrder(state, strategy);
    let totalInterest = 0;
    let month = 0;
    const timeline = [{ month: 0, totalBalance: state.reduce((s, d) => s + d.balance, 0) }];

    while (state.some((d) => d.balance > EPS) && month < MAX_MONTHS) {
      month += 1;

      for (const d of state) {
        if (d.balance <= EPS) continue;
        const mr = d.annualAprPercent / 100 / 12;
        const interest = d.balance * mr;
        d.balance += interest;
        totalInterest += interest;
      }

      let cash = budget;
      for (const d of state) {
        if (d.balance <= EPS) continue;
        const pay = Math.min(d.minimum, d.balance);
        d.balance -= pay;
        cash -= pay;
      }

      if (cash > EPS) {
        const focusIdx = order.find((idx) => state[idx] && state[idx].balance > EPS);
        if (focusIdx != null) {
          const focus = state[focusIdx];
          const extra = Math.min(cash, focus.balance);
          focus.balance -= extra;
        }
      }

      timeline.push({
        month,
        totalBalance: state.reduce((s, d) => s + Math.max(0, d.balance), 0)
      });
    }

    return {
      ok: true,
      months: month,
      totalInterest,
      timeline,
      debtFreeDate: addMonths(new Date(), month),
      minSum,
      budget
    };
  };

  /** Pay only required minimums each month — no snowball/avalanche acceleration. */
  const simulateMinimumOnly = (debts) => {
    const normalized = normalizeDebts(debts);
    if (!normalized.length) {
      return { ok: true, months: 0, totalInterest: 0, timeline: [{ month: 0, totalBalance: 0 }], debtFreeDate: new Date() };
    }

    const state = normalized.map((d) => ({ ...d, balance: d.balance }));
    let totalInterest = 0;
    let month = 0;
    const timeline = [{ month: 0, totalBalance: state.reduce((s, d) => s + d.balance, 0) }];

    while (state.some((d) => d.balance > EPS) && month < MAX_MONTHS) {
      month += 1;

      for (const d of state) {
        if (d.balance <= EPS) continue;
        const mr = d.annualAprPercent / 100 / 12;
        const interest = d.balance * mr;
        d.balance += interest;
        totalInterest += interest;
      }

      for (const d of state) {
        if (d.balance <= EPS) continue;
        const pay = Math.min(d.minimum, d.balance);
        d.balance -= pay;
      }

      timeline.push({
        month,
        totalBalance: state.reduce((s, d) => s + Math.max(0, d.balance), 0)
      });
    }

    return {
      ok: true,
      months: month,
      totalInterest,
      timeline,
      debtFreeDate: addMonths(new Date(), month)
    };
  };

  const computeSnapshot = (raw) => {
    const debts = normalizeDebts(raw.debts);
    const budget = clampNonNeg(raw.monthlyBudget);
    const minSum = debts.reduce((s, d) => s + d.minimum, 0);

    const snowball = simulateAccelerated(debts, budget, "snowball");
    const avalanche = simulateAccelerated(debts, budget, "avalanche");
    const minimumOnly = simulateMinimumOnly(debts);

    const pickActive = (active, accelerated, baseline) => {
      if (!accelerated.ok) return { valid: false, error: accelerated.error, minSum: accelerated.minSum, budget };
      const interestSaved = Math.max(0, baseline.totalInterest - accelerated.totalInterest);
      return {
        valid: true,
        months: accelerated.months,
        totalInterest: accelerated.totalInterest,
        debtFreeDate: accelerated.debtFreeDate,
        timeline: accelerated.timeline,
        interestSaved,
        monthsSaved: Math.max(0, baseline.months - accelerated.months)
      };
    };

    return {
      debts,
      budget,
      minSum,
      budgetValid: budget + EPS >= minSum,
      snowball: pickActive("snowball", snowball, minimumOnly),
      avalanche: pickActive("avalanche", avalanche, minimumOnly),
      minimumOnly,
      chart: {
        snowball: snowball.ok ? snowball.timeline : [],
        avalanche: avalanche.ok ? avalanche.timeline : []
      }
    };
  };

  return {
    computeSnapshot,
    simulateAccelerated,
    simulateMinimumOnly,
    normalizeDebts
  };
})();

const DebtPayoffCalculator = (() => {
  const PAGE = "debt-payoff";
  let chartInstance = null;
  let activeStrategy = "snowball";
  let debtRowCounter = 2;

  const formatCurrency = (value) =>
    typeof CurrencyLayer !== "undefined"
      ? CurrencyLayer.formatCurrency(value)
      : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value) || 0);

  const formatDebtFreeDate = (date) => {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "—";
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  };

  const readDebtsFromDom = () => {
    const rows = document.querySelectorAll("#dpDebtRows .cn-debt-row");
    return Array.from(rows).map((row, i) => ({
      id: row.dataset.debtId || `row-${i}`,
      name: row.querySelector("[data-debt-name]")?.value || `Debt ${i + 1}`,
      balance: Number(row.querySelector("[data-debt-balance]")?.value) || 0,
      annualAprPercent: Number(row.querySelector("[data-debt-rate]")?.value) || 0,
      minimum: Number(row.querySelector("[data-debt-minimum]")?.value) || 0
    }));
  };

  const readInputs = () => ({
    monthlyBudget: Number(document.getElementById("dpMonthlyBudget")?.value) || 0,
    debts: readDebtsFromDom()
  });

  const createDebtRowHtml = (defaults = {}) => {
    debtRowCounter += 1;
    const id = `debt-${debtRowCounter}`;
    const name = defaults.name ?? `Credit Card ${debtRowCounter}`;
    const balance = defaults.balance ?? 4200;
    const rate = defaults.rate ?? 22.99;
    const minimum = defaults.minimum ?? 85;
    return `
      <fieldset class="cn-debt-row card" data-debt-id="${id}" style="margin-bottom: var(--cn-space-3); padding: var(--cn-space-3)">
        <div class="cn-debt-row__head" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--cn-space-3)">
          <legend class="cn-debt-row__title" style="font-weight: 600; font-size: 0.95rem; margin: 0">Debt</legend>
          <button type="button" class="btn btn-ghost cn-debt-row__remove" data-remove-debt aria-label="Remove debt">Remove</button>
        </div>
        <div class="field">
          <label>Debt name</label>
          <input type="text" data-debt-name value="${name.replace(/"/g, "&quot;")}" />
        </div>
        <div class="field">
          <label data-currency-label="debt_balance">Remaining balance</label>
          <div class="input-with-prefix">
            <span data-currency-symbol>¤</span>
            <input type="number" data-debt-balance min="0" step="50" value="${balance}" />
          </div>
        </div>
        <div class="field">
          <label>Interest rate (% APR)</label>
          <input type="number" data-debt-rate min="0" max="100" step="0.01" value="${rate}" />
        </div>
        <div class="field">
          <label data-currency-label="debt_minimum">Minimum monthly payment</label>
          <div class="input-with-prefix">
            <span data-currency-symbol>¤</span>
            <input type="number" data-debt-minimum min="0" step="10" value="${minimum}" />
          </div>
        </div>
      </fieldset>`;
  };

  const addDebtRow = (defaults) => {
    const wrap = document.getElementById("dpDebtRows");
    if (!wrap) return;
    wrap.insertAdjacentHTML("beforeend", createDebtRowHtml(defaults));
    updateRemoveButtons();
    recalculate();
  };

  const updateRemoveButtons = () => {
    const rows = document.querySelectorAll("#dpDebtRows .cn-debt-row");
    rows.forEach((row) => {
      const btn = row.querySelector("[data-remove-debt]");
      if (btn) btn.disabled = rows.length <= 1;
    });
  };

  const setStrategy = (strategy) => {
    activeStrategy = strategy === "avalanche" ? "avalanche" : "snowball";
    document.querySelectorAll("[data-dp-strategy]").forEach((btn) => {
      const on = btn.dataset.dpStrategy === activeStrategy;
      btn.classList.toggle("is-active", on);
      btn.setAttribute("aria-selected", on ? "true" : "false");
    });
    renderMetrics(lastSnapshot);
  };

  let lastSnapshot = null;

  const renderValidation = (snap) => {
    const el = document.getElementById("dpValidation");
    if (!el) return;
    if (!snap.debts.length) {
      el.textContent = "Add at least one debt with a balance greater than zero.";
      el.className = "cn-debt-payoff-validation is-warning";
      return;
    }
    if (!snap.budgetValid) {
      el.textContent = `Your monthly budget (${formatCurrency(snap.budget)}) must cover all minimum payments (${formatCurrency(snap.minSum)}).`;
      el.className = "cn-debt-payoff-validation is-error";
      return;
    }
    el.textContent = `Budget covers minimums with ${formatCurrency(snap.budget - snap.minSum)} extra for accelerated payoff.`;
    el.className = "cn-debt-payoff-validation is-ok";
  };

  const renderMetrics = (snap) => {
    if (!snap) return;
    const plan = snap[activeStrategy];
    const dateEl = document.getElementById("dpDebtFreeDate");
    const interestEl = document.getElementById("dpTotalInterest");
    const savingsEl = document.getElementById("dpInterestSavings");
    const monthsEl = document.getElementById("dpMonthsToFree");
    const planLabel = document.getElementById("dpActivePlanLabel");

    if (planLabel) {
      planLabel.textContent = activeStrategy === "snowball" ? "Debt Snowball Plan" : "Debt Avalanche Plan";
    }

    if (!plan?.valid) {
      if (dateEl) dateEl.textContent = "—";
      if (interestEl) interestEl.textContent = "—";
      if (savingsEl) savingsEl.textContent = "—";
      if (monthsEl) monthsEl.textContent = "—";
      return;
    }

    if (dateEl) dateEl.textContent = formatDebtFreeDate(plan.debtFreeDate);
    if (interestEl) interestEl.textContent = formatCurrency(plan.totalInterest);
    if (savingsEl) savingsEl.textContent = formatCurrency(plan.interestSaved);
    if (monthsEl) monthsEl.textContent = String(plan.months);
  };

  const renderChart = (snap) => {
    const canvas = document.getElementById("dpBalanceChart");
    if (!canvas || !window.Chart) return;
    if (chartInstance) {
      chartInstance.destroy();
      chartInstance = null;
    }
    if (!snap?.chart) return;

    const snow = snap.chart.snowball || [];
    const ava = snap.chart.avalanche || [];
    const maxLen = Math.max(snow.length, ava.length, 1);
    const labels = Array.from({ length: maxLen }, (_, i) => (i === 0 ? "Start" : `Mo ${i}`));

    const snowData = labels.map((_, i) => (snow[i] ? snow[i].totalBalance : null));
    const avaData = labels.map((_, i) => (ava[i] ? ava[i].totalBalance : null));

    chartInstance = new window.Chart(canvas, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Snowball balance",
            data: snowData,
            borderColor: "rgba(91, 140, 255, 0.95)",
            backgroundColor: "rgba(91, 140, 255, 0.12)",
            fill: true,
            tension: 0.25,
            pointRadius: 0,
            borderWidth: 2
          },
          {
            label: "Avalanche balance",
            data: avaData,
            borderColor: "rgba(62, 224, 143, 0.95)",
            backgroundColor: "rgba(62, 224, 143, 0.1)",
            fill: true,
            tension: 0.25,
            pointRadius: 0,
            borderWidth: 2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: { position: "bottom" },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.dataset.label}: ${formatCurrency(ctx.parsed.y)}`
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: (v) => formatCurrency(v)
            }
          },
          x: {
            ticks: { maxTicksLimit: 12 }
          }
        }
      }
    });
  };

  const recalculate = () => {
    lastSnapshot = DebtPayoffEngine.computeSnapshot(readInputs());
    renderValidation(lastSnapshot);
    renderMetrics(lastSnapshot);
    renderChart(lastSnapshot);
    return lastSnapshot;
  };

  const bindEvents = () => {
    const form = document.getElementById("dp-form");
    form?.addEventListener("input", recalculate);
    form?.addEventListener("change", recalculate);

    document.getElementById("dpAddDebt")?.addEventListener("click", () => addDebtRow());

    document.getElementById("dpDebtRows")?.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-remove-debt]");
      if (!btn) return;
      const row = btn.closest(".cn-debt-row");
      if (row && document.querySelectorAll("#dpDebtRows .cn-debt-row").length > 1) {
        row.remove();
        updateRemoveButtons();
        recalculate();
      }
    });

    document.querySelectorAll("[data-dp-strategy]").forEach((btn) => {
      btn.addEventListener("click", () => setStrategy(btn.dataset.dpStrategy));
    });
  };

  const init = () => {
    if (document.body.dataset.page !== PAGE) return;
    bindEvents();
    updateRemoveButtons();
    recalculate();
    if (window.CalnexCsvExport) {
      CalnexCsvExport.register("debt-payoff", () => {
        const snap = lastSnapshot;
        const plan = activeStrategy === "avalanche" ? snap?.avalanche : snap?.snowball;
        const timeline = plan?.valid
          ? activeStrategy === "avalanche"
            ? snap?.chart?.avalanche || []
            : snap?.chart?.snowball || []
          : [];
        if (!timeline.length) return null;
        const lines = ["Month,Total balance"];
        timeline.forEach((row) => {
          lines.push(CalnexCsvExport.toCsvLine([row.month, row.totalBalance]));
        });
        return { csv: lines.join("\n"), filename: `debt-payoff-${activeStrategy}.csv` };
      });
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  return { recalculate, addDebtRow, setStrategy };
})();

window.DebtPayoffEngine = DebtPayoffEngine;
window.DebtPayoffCalculator = DebtPayoffCalculator;
