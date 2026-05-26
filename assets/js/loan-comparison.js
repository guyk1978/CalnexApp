const LoanComparisonTool = (() => {
  const PAGE = "loan-comparison";
  const OFFER_IDS = ["a", "b", "c"];

  let chartInstance = null;

  const formatCurrency = (value) =>
    typeof CurrencyLayer !== "undefined"
      ? CurrencyLayer.formatCurrency(value)
      : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value) || 0);

  const formatPercent = (value) => `${(Number(value) || 0).toFixed(2)}%`;

  const readOffer = (id) => {
    const enabled = id === "c" ? document.getElementById("lcEnableOfferC")?.checked : true;
    const termUnit = document.getElementById(`lcTermUnit${id.toUpperCase()}`)?.value === "months" ? "months" : "years";
    return {
      label: id.toUpperCase(),
      enabled,
      principal: Number(document.getElementById(`lcAmount${id.toUpperCase()}`)?.value) || 0,
      annualAprPercent: Number(document.getElementById(`lcRate${id.toUpperCase()}`)?.value) || 0,
      termValue: Number(document.getElementById(`lcTerm${id.toUpperCase()}`)?.value) || 0,
      termUnit,
      fees: Number(document.getElementById(`lcFees${id.toUpperCase()}`)?.value) || 0
    };
  };

  const readInputs = () => ({
    offers: OFFER_IDS.map(readOffer)
  });

  const renderMetricCards = (snap) => {
    const wrap = document.getElementById("lcMetricCards");
    if (!wrap) return;
    const { offers, winnerIndex } = snap;
    if (!offers?.length) {
      wrap.innerHTML = "";
      return;
    }
    wrap.innerHTML = offers
      .map((o, i) => {
        const win = i === winnerIndex;
        return `<article class="cn-loan-compare-metric-card${win ? " is-winner" : ""}" aria-label="Offer ${o.label} metrics">
          <p class="eyebrow">Offer ${o.label}${win ? " · Lowest cost" : ""}</p>
          <dl>
            <div><dt>Monthly payment</dt><dd>${formatCurrency(o.monthlyPayment)}</dd></div>
            <div><dt>Total interest</dt><dd>${formatCurrency(o.totalInterest)}</dd></div>
            <div><dt>Total out-of-pocket</dt><dd>${formatCurrency(o.totalCost)}</dd></div>
            <div><dt>Effective APR</dt><dd>${formatPercent(o.effectiveAprPercent)}</dd></div>
          </dl>
        </article>`;
      })
      .join("");
  };

  const renderVerdict = (snap) => {
    const titleEl = document.getElementById("lcVerdictTitle");
    const detailEl = document.getElementById("lcVerdictDetail");
    const savingsEl = document.getElementById("lcVerdictSavings");
    if (!titleEl) return;
    titleEl.textContent = snap.lc_verdict_title || "Compare loan offers";
    if (detailEl) detailEl.textContent = snap.lc_verdict_detail || "";
    if (savingsEl) {
      if (snap.savingsVsRunnerUp > 0 && snap.winnerLabel) {
        savingsEl.textContent = `Offer ${snap.winnerLabel} saves you ${formatCurrency(snap.savingsVsRunnerUp)} vs. the next-best offer`;
        savingsEl.hidden = false;
      } else {
        savingsEl.textContent = "";
        savingsEl.hidden = true;
      }
    }
  };

  const renderChart = (snap) => {
    const canvas = document.getElementById("lcCostChart");
    if (!canvas || !window.Chart) return;
    const offers = snap.offers || [];
    if (chartInstance) {
      chartInstance.destroy();
      chartInstance = null;
    }
    if (!offers.length) return;

    const labels = offers.map((o) => `Offer ${o.label}`);
    const data = offers.map((o) => o.totalCost);
    const colors = offers.map((_, i) =>
      i === snap.winnerIndex ? "rgba(62, 224, 143, 0.85)" : "rgba(91, 140, 255, 0.75)"
    );

    chartInstance = new window.Chart(canvas, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Total lifetime cost",
            data,
            backgroundColor: colors,
            borderRadius: 8,
            borderSkipped: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: offers.length > 2 ? "y" : "x",
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => formatCurrency(ctx.raw)
            }
          }
        },
        scales: {
          x: {
            ticks: {
              callback: (v) => (typeof v === "number" && v > 100 ? formatCurrency(v) : v)
            }
          },
          y: {
            ticks: {
              callback: (v) => formatCurrency(v)
            }
          }
        }
      }
    });
  };

  const toggleOfferC = () => {
    const on = document.getElementById("lcEnableOfferC")?.checked;
    const panel = document.getElementById("lcOfferPanelC");
    if (panel) panel.classList.toggle("is-hidden", !on);
    recalculate();
  };

  const recalculate = () => {
    if (!window.FinancialCore?.computeLoanComparisonSnapshot) return;
    const snap = FinancialCore.computeLoanComparisonSnapshot(readInputs());
    renderVerdict(snap);
    renderMetricCards(snap);
    renderChart(snap);
    return snap;
  };

  const bindInputs = () => {
    const form = document.getElementById("lc-form");
    if (!form) return;
    form.addEventListener("input", recalculate);
    form.addEventListener("change", recalculate);
    document.getElementById("lcEnableOfferC")?.addEventListener("change", toggleOfferC);
  };

  const init = () => {
    if (document.body.dataset.page !== PAGE) return;
    bindInputs();
    toggleOfferC();
    recalculate();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  return { recalculate };
})();

window.LoanComparisonTool = LoanComparisonTool;
