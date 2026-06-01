const RentVsBuyCalculator = (() => {
  const PAGE = "rent-vs-buy-calculator";

  const num = (key, el, fb = 0) =>
    typeof CalnexParse !== "undefined" ? CalnexParse.resolveNumeric(key, el, fb) : Number(el?.value) || fb;

  const formatCurrency = (value) =>
    typeof CurrencyLayer !== "undefined"
      ? CurrencyLayer.formatCurrency(value)
      : new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
          maximumFractionDigits: 0
        }).format(Number(value) || 0);

  const readInputs = () => ({
    monthlyRent: num("rvb_monthly_rent", document.getElementById("rvbMonthlyRent"), 1200),
    rentInsurance: num("rvb_rent_insurance", document.getElementById("rvbRentInsurance"), 15),
    annualRentIncreasePct: num("rvb_rent_increase", document.getElementById("rvbRentIncrease"), 3),
    investmentReturnPct: num("rvb_investment_return", document.getElementById("rvbInvestmentReturn"), 7),
    homePrice: num("rvb_home_price", document.getElementById("rvbHomePrice"), 350000),
    downPaymentPct: num("rvb_down_payment_pct", document.getElementById("rvbDownPaymentPct"), 20),
    interestRatePct: num("rvb_interest_rate", document.getElementById("rvbInterestRate"), 6.5),
    loanTermYears: num("rvb_loan_term", document.getElementById("rvbLoanTerm"), 30),
    propertyTaxPct: num("rvb_property_tax_pct", document.getElementById("rvbPropertyTaxPct"), 1.2),
    maintenancePct: num("rvb_maintenance_pct", document.getElementById("rvbMaintenancePct"), 1),
    annualAppreciationPct: num("rvb_appreciation", document.getElementById("rvbAppreciation"), 3),
    horizonYears: num("rvb_horizon", document.getElementById("rvbHorizon"), 15)
  });

  const renderTimelineTable = (timeline, horizonYear, breakEvenYear) => {
    const body = document.getElementById("rvbTimelineBody");
    if (!body) return;
    const rows = timeline.filter((row) => row.year <= horizonYear);
    body.innerHTML = rows
      .map((row) => {
        const cls = row.year === breakEvenYear || row.year === horizonYear ? "extra-row" : "";
        return `<tr class="${cls}"><td>${row.year}</td><td>${formatCurrency(row.renterNetWorth)}</td><td>${formatCurrency(row.buyerNetWorth)}</td><td>${formatCurrency(row.homeEquity)}</td></tr>`;
      })
      .join("");
  };

  const renderBars = (row) => {
    const wrap = document.getElementById("rvbComparisonBars");
    if (!wrap) return;
    if (!row) {
      wrap.innerHTML = "";
      wrap.setAttribute("aria-hidden", "true");
      return;
    }
    wrap.setAttribute("aria-hidden", "false");
    const max = Math.max(1, Math.abs(row.renterNetWorth), Math.abs(row.buyerNetWorth));
    const rentW = Math.max(4, (Math.max(0, row.renterNetWorth) / max) * 100);
    const buyW = Math.max(4, (Math.max(0, row.buyerNetWorth) / max) * 100);
    wrap.innerHTML = `
      <div class="comparison-bar-row muted" style="display:flex;align-items:center;gap:0.75rem;margin-bottom:0.5rem">
        <span style="flex:0 0 3rem;font-size:0.75rem">Rent</span>
        <div style="flex:1;height:8px;border-radius:999px;background:var(--cn-chart-track)">
          <div style="width:${rentW}%;height:100%;border-radius:999px;background:var(--cn-chart-1)"></div>
        </div>
        <strong>${formatCurrency(row.renterNetWorth)}</strong>
      </div>
      <div class="comparison-bar-row muted" style="display:flex;align-items:center;gap:0.75rem">
        <span style="flex:0 0 3rem;font-size:0.75rem">Buy</span>
        <div style="flex:1;height:8px;border-radius:999px;background:var(--cn-chart-track)">
          <div style="width:${buyW}%;height:100%;border-radius:999px;background:var(--cn-success)"></div>
        </div>
        <strong>${formatCurrency(row.buyerNetWorth)}</strong>
      </div>`;
  };

  const runRentVsBuyPipeline = () => {
    if (!window.FinancialCore?.computeRentVsBuySnapshot) return {};
    const raw = readInputs();
    const snap = FinancialCore.computeRentVsBuySnapshot(raw);
    const horizonRow = snap.timeline?.find((r) => r.year === snap.horizonYear);
    renderTimelineTable(snap.timeline || [], snap.horizonYear, snap.breakEvenYear);
    renderBars(horizonRow);
    return {
      rvb_banner_title: snap.rvb_banner_title,
      rvb_banner_detail: snap.rvb_banner_detail,
      rvb_rent_net_worth: snap.rvb_rent_net_worth,
      rvb_buy_net_worth: snap.rvb_buy_net_worth,
      rvb_break_even_year: snap.rvb_break_even_year
    };
  };

  const init = () => {
    if (document.body.dataset.page !== PAGE) return;
    if (window.CalnexCsvExport) {
      CalnexCsvExport.register("rent-vs-buy-calculator", () => {
        const table = document.querySelector(".cn-rvb-trajectory-table");
        const csv = CalnexCsvExport.tableToCsv(table);
        return csv.trim() ? { csv, filename: "rent-vs-buy-timeline.csv" } : null;
      });
    }
    if (window.AppEngine) {
      AppEngine.registerToolPipeline(PAGE, runRentVsBuyPipeline);
      AppEngine.runImmediate();
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  return { runRentVsBuyPipeline };
})();

window.RentVsBuyCalculator = RentVsBuyCalculator;
