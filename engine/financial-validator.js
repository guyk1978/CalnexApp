/**
 * Financial Engine Validator — benchmarks calculator outputs and flags anomalies.
 */
const FinancialValidator = (() => {
  const PAGE_TO_TYPE = {
    "loan-calculator": "loan",
    "mortgage-calculator": "mortgage",
    "car-loan-calculator": "car",
    "retirement-calculator": "retirement",
    "interest-calculator": "interest"
  };

  const getTypeFromPage = (page) => (page && PAGE_TO_TYPE[page]) || null;

  const n = (v, fb = 0) => {
    const x = Number(v);
    return Number.isFinite(x) ? x : fb;
  };

  const amortMonthlyPayment = (principal, annualPct, months) => {
    const P = Math.max(0, principal);
    const mo = Math.max(1, Math.round(months));
    const r = annualPct / 100 / 12;
    if (!P || !mo) return 0;
    if (r <= 0) return P / mo;
    const pow = (1 + r) ** mo;
    return (P * r * pow) / (pow - 1);
  };

  const amortTotalInterest = (principal, annualPct, months) => {
    const M = amortMonthlyPayment(principal, annualPct, months);
    const mo = Math.max(1, Math.round(months));
    return Math.max(0, M * mo - principal);
  };

  const resolveLoanTermMonths = (storedTerm, page) => {
    const t = Math.max(1, n(storedTerm, 1));
    if (page === "loan-calculator") {
      const unit = document.getElementById("termUnit")?.value;
      return unit === "years" ? Math.round(t * 12) : Math.round(t);
    }
    if (page === "car-loan-calculator") {
      const unit = document.getElementById("carTermUnit")?.value;
      return unit === "years" ? Math.round(t * 12) : Math.round(t);
    }
    if (page === "mortgage-calculator") {
      const raw = n(storedTerm, 360);
      if (raw >= 12 && raw <= 600) return Math.round(raw);
      if (raw <= 40) return Math.round(raw * 12);
      return 360;
    }
    return Math.round(t);
  };

  const fvRetirement = (pv, monthlyContrib, annualPct, years) => {
    const m = Math.max(0, Math.round(years * 12));
    const r = annualPct / 100 / 12;
    const C = Math.max(0, monthlyContrib);
    const P = Math.max(0, pv);
    if (m === 0) return P;
    if (r <= 0) return P + C * m;
    const factor = (1 + r) ** m;
    return P * factor + C * ((factor - 1) / r);
  };

  const compoundFvBenchmark = (principal, annualPct, years, periodsPerYear, monthlyContrib) => {
    const r = annualPct / 100;
    const pp = Math.max(1, periodsPerYear);
    const totalPeriods = Math.round(years * pp);
    const periodicRate = r / pp;
    const periodsPerMonth = pp / 12;
    const periodicContribution = periodsPerMonth > 0 ? monthlyContrib / periodsPerMonth : 0;
    if (totalPeriods <= 0) return principal;
    if (periodicRate <= 0) return principal + periodicContribution * totalPeriods;
    const growthFactor = (1 + periodicRate) ** totalPeriods;
    return principal * growthFactor + periodicContribution * ((growthFactor - 1) / periodicRate);
  };

  const compoundingMap = { yearly: 1, monthly: 12, daily: 365 };

  const calculateBenchmark = (type, inputs, outputs) => {
    const out = {};
    if (type === "loan" || type === "car") {
      const principal = n(type === "car" ? outputs.car_computed_loan_amount ?? inputs.loan_amount : outputs.loan_amount ?? inputs.loan_amount);
      const rate = n(inputs.interest_rate ?? outputs.interest_rate);
      const months = resolveLoanTermMonths(inputs.loan_term ?? outputs.loan_term, type === "car" ? "car-loan-calculator" : "loan-calculator");
      out.monthlyPayment = amortMonthlyPayment(principal, rate, months);
      out.totalInterest = amortTotalInterest(principal, rate, months);
      out.totalRepayment = principal + out.totalInterest;
      out.termMonths = months;
    } else if (type === "mortgage") {
      const principal = n(outputs.mortgage_computed_loan_amount ?? inputs.loan_amount);
      const rate = n(inputs.interest_rate ?? outputs.interest_rate);
      const months = resolveLoanTermMonths(inputs.loan_term ?? outputs.loan_term, "mortgage-calculator");
      out.monthlyPayment = amortMonthlyPayment(principal, rate, months);
      out.totalInterest = amortTotalInterest(principal, rate, months);
      out.termMonths = months;
    } else if (type === "retirement") {
      const pv = n(inputs.retirement_current_savings ?? outputs.retirement_current_savings);
      const c = n(inputs.retirement_monthly_contribution ?? outputs.retirement_monthly_contribution);
      const r = n(inputs.retirement_return_rate ?? outputs.retirement_return_rate);
      const years = Math.max(0, n(inputs.retirement_target_age, 67) - n(inputs.retirement_current_age, 30));
      out.projectedBalance = fvRetirement(pv, c, r, years);
      out.years = years;
    } else if (type === "interest") {
      const principal = n(inputs.interest_principal ?? outputs.interest_principal ?? inputs.loan_amount);
      const rate = n(inputs.interest_rate ?? outputs.interest_rate);
      const years = Math.max(1, n(inputs.interest_years ?? outputs.interest_years, 1));
      const contrib = n(inputs.interest_monthly_contribution ?? outputs.interest_monthly_contribution ?? inputs.extra_payment);
      const comp = String(inputs.interest_compounding ?? outputs.interest_compounding ?? "monthly");
      const pp = compoundingMap[comp] || 12;
      out.finalAmount = compoundFvBenchmark(principal, rate, years, pp, contrib);
      const baseContributed = principal + contrib * 12 * years;
      out.totalInterest = Math.max(0, out.finalAmount - baseContributed);
    }
    return out;
  };

  const pushWarn = (warnings, scoreRef, msg, delta = 10) => {
    warnings.push(msg);
    scoreRef.v = Math.max(0, scoreRef.v - delta);
  };

  const labelFromScore = (s) => {
    if (s >= 85) return "High";
    if (s >= 60) return "Medium";
    return "Low";
  };

  const validateLoanLike = (type, inputs, outputs, warnings, scoreRef, bench) => {
    const principal =
      type === "car"
        ? n(outputs.car_computed_loan_amount ?? inputs.loan_amount)
        : n(outputs.loan_amount ?? inputs.loan_amount);
    const rate = n(inputs.interest_rate ?? outputs.interest_rate);
    const actualInterest = type === "car" ? n(outputs.car_total_interest) : n(outputs.loan_total_interest);
    const actualMonthly = type === "car" ? n(outputs.car_monthly_payment) : n(outputs.loan_monthly_payment);

    if (principal > 0 && actualMonthly <= 0) {
      pushWarn(warnings, scoreRef, "Monthly payment is zero while principal is positive.", 25);
    }
    if (actualInterest < 0) {
      pushWarn(warnings, scoreRef, "Total interest is negative.", 30);
      return false;
    }
    if (principal > 0 && actualInterest > principal * 6) {
      pushWarn(warnings, scoreRef, "Total interest exceeds six times principal (unusual for typical loans).", 20);
    }

    const bInt = bench.totalInterest || 0;
    const bPay = bench.monthlyPayment || 0;
    if (bInt > 0 && actualInterest > bInt * 2.5) {
      pushWarn(warnings, scoreRef, "Total interest is far above a standard amortization benchmark (>2.5×).", 25);
    }
    if (bPay > 0 && actualMonthly > bPay * 2.5) {
      pushWarn(warnings, scoreRef, "Monthly payment is far above benchmark for this principal, rate, and term.", 20);
    }
    if (bPay > 0 && actualMonthly > 0 && actualMonthly < bPay * 0.25) {
      pushWarn(warnings, scoreRef, "Monthly payment is far below benchmark (check term units or inputs).", 20);
    }
    return true;
  };

  const validateMortgage = (inputs, outputs, warnings, scoreRef, bench) => {
    const principal = n(outputs.mortgage_computed_loan_amount ?? inputs.loan_amount);
    const pi = n(outputs.mortgage_principal_interest_monthly);
    const bPay = bench.monthlyPayment || 0;
    const actualInterest = n(outputs.mortgage_total_interest);
    const bInt = bench.totalInterest || 0;

    if (principal > 0 && pi <= 0) {
      pushWarn(warnings, scoreRef, "Principal & interest payment is zero while loan amount is positive.", 25);
    }
    if (bPay > 0 && pi > 0 && Math.abs(pi - bPay) / bPay > 0.45) {
      pushWarn(warnings, scoreRef, "Principal & interest component differs strongly from amortization benchmark.", 15);
    }
    if (principal > 0 && actualInterest > principal * 6) {
      pushWarn(warnings, scoreRef, "Mortgage interest exceeds six times loan principal.", 20);
    }
    if (bInt > 0 && actualInterest > bInt * 2.5) {
      pushWarn(warnings, scoreRef, "Mortgage total interest is far above benchmark (>2.5×).", 25);
    }
    return true;
  };

  const validateRetirement = (inputs, outputs, warnings, scoreRef, bench) => {
    const projected = n(outputs.retirement_projected_balance);
    const b = n(bench.projectedBalance);
    if (projected < 0) {
      pushWarn(warnings, scoreRef, "Projected balance is negative.", 35);
      return false;
    }
    if (b > 0) {
      const ratio = projected / b;
      if (ratio > 2) {
        pushWarn(warnings, scoreRef, "Projected balance is more than double the internal benchmark (check rates and horizon).", 20);
      }
      if (ratio < 0.35 && bench.years >= 5) {
        pushWarn(warnings, scoreRef, "Projected balance is far below benchmark vs contributions and return (possible input mismatch).", 15);
      }
    }
    const c = n(inputs.retirement_monthly_contribution ?? outputs.retirement_monthly_contribution);
    const years = n(bench.years);
    if (c >= 1000 && years >= 25 && projected > 12_000_000) {
      pushWarn(warnings, scoreRef, "Very large balance for typical contribution levels — verify return rate and horizon.", 15);
    }
    return true;
  };

  const validateInterest = (inputs, outputs, warnings, scoreRef, bench) => {
    const finalAmt = n(outputs.interest_final_amount ?? outputs.interest_compound_total);
    const b = n(bench.finalAmount);
    const ti = n(outputs.interest_total_interest);
    if (finalAmt < 0 || ti < -1) {
      pushWarn(warnings, scoreRef, "Compound results are negative.", 35);
      return false;
    }
    if (b > 0) {
      const ratio = finalAmt / b;
      if (ratio > 2) {
        pushWarn(warnings, scoreRef, "Final amount is more than double the benchmark estimate.", 25);
      }
      if (ratio < 0.4 && n(inputs.interest_years, 1) >= 3) {
        pushWarn(warnings, scoreRef, "Final amount is far below benchmark — verify compounding and contributions.", 15);
      }
    }
    return true;
  };

  const validateFinancialResult = ({ type, inputs, outputs }) => {
    const warnings = [];
    const scoreRef = { v: 100 };
    let isValid = true;

    if (!type || !outputs || typeof outputs !== "object") {
      return { isValid: true, warnings: [], adjustedConfidenceScore: 100 };
    }

    const bench = calculateBenchmark(type, inputs, outputs);

    if (type === "loan") {
      isValid = validateLoanLike("loan", inputs, outputs, warnings, scoreRef, bench) && isValid;
    } else if (type === "car") {
      isValid = validateLoanLike("car", inputs, outputs, warnings, scoreRef, bench) && isValid;
    } else if (type === "mortgage") {
      isValid = validateMortgage(inputs, outputs, warnings, scoreRef, bench) && isValid;
    } else if (type === "retirement") {
      isValid = validateRetirement(inputs, outputs, warnings, scoreRef, bench) && isValid;
    } else if (type === "interest") {
      isValid = validateInterest(inputs, outputs, warnings, scoreRef, bench) && isValid;
    }

    const adjustedConfidenceScore = Math.round(Math.max(0, Math.min(100, scoreRef.v)));
    if (!isValid || adjustedConfidenceScore < 50 || warnings.length >= 2) {
      console.warn("[VALIDATOR] anomaly", { type, isValid, warnings, benchmark: bench, score: adjustedConfidenceScore });
    }

    return { isValid, warnings, adjustedConfidenceScore };
  };

  const toStatePatch = (v) => ({
    financial_validation_confidence_score: v.adjustedConfidenceScore,
    financial_validation_confidence_label: labelFromScore(v.adjustedConfidenceScore),
    financial_validation_warnings_text: v.warnings.join(" · "),
    financial_validation_badge: v.warnings.length > 0 || !v.isValid ? "Review numbers" : "",
    financial_validation_is_valid: v.isValid ? 1 : 0
  });

  return {
    getTypeFromPage,
    calculateBenchmark,
    validateFinancialResult,
    toStatePatch
  };
})();

window.FinancialValidator = FinancialValidator;
