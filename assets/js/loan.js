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
    copyFeedback: document.getElementById("copyFeedback"),
    shareButtons: document.querySelectorAll("[data-share]")
  };

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
