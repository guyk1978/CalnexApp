/**
 * CalnexApp Gold Standard Financial Model (GSFM) — pure math, no UI.
 * Single source of truth for compounding, annuities, amortization, inflation, and plan simulation.
 */
const FinancialCore = (() => {
  const clampNonNeg = (x) => Math.max(0, Number(x) || 0);

  /** Periodic rate from nominal annual APR % and compounding frequency per year. */
  const periodicRateFromApr = (annualAprPercent, periodsPerYear) => {
    const p = Math.max(1, Math.round(Number(periodsPerYear) || 12));
    return clampNonNeg(annualAprPercent) / 100 / p;
  };

  /**
   * Future value of a lump sum with periodic compounding.
   * @param {number} principal
   * @param {number} annualAprPercent nominal annual rate in percent (e.g. 5.9 for 5.9%)
   * @param {number} numberOfPeriods full periods elapsed
   * @param {number} [periodsPerYear=12] compounding periods per year
   */
  const compoundGrowth = (principal, annualAprPercent, numberOfPeriods, periodsPerYear = 12) => {
    const P = clampNonNeg(principal);
    const n = Math.max(0, Math.round(Number(numberOfPeriods) || 0));
    if (n === 0) return P;
    const i = periodicRateFromApr(annualAprPercent, periodsPerYear);
    if (i <= 0) return P;
    return P * (1 + i) ** n;
  };

  /**
   * Future value of an ordinary annuity (payment at end of each period).
   * @param {number} paymentPerPeriod
   * @param {number} annualAprPercent
   * @param {number} numberOfPeriods
   * @param {number} [periodsPerYear=12]
   */
  const annuityContribution = (paymentPerPeriod, annualAprPercent, numberOfPeriods, periodsPerYear = 12) => {
    const C = clampNonNeg(paymentPerPeriod);
    const n = Math.max(0, Math.round(Number(numberOfPeriods) || 0));
    if (n === 0) return 0;
    const i = periodicRateFromApr(annualAprPercent, periodsPerYear);
    if (i <= 0) return C * n;
    const f = (1 + i) ** n;
    return C * ((f - 1) / i);
  };

  /**
   * Nominal future value of an amount growing at a constant annual inflation rate.
   * @returns amount * (1 + annualInflationPercent/100) ^ years
   */
  const inflationAdjustment = (amount, annualInflationPercent, years) => {
    const a = Number(amount) || 0;
    const y = Math.max(0, Number(years) || 0);
    const inf = clampNonNeg(annualInflationPercent);
    if (y === 0) return a;
    return a * (1 + inf / 100) ** y;
  };

  /**
   * Level-payment amortization (monthly), optional extra principal from a start month.
   * @param {object} opts
   * @param {number} opts.principal
   * @param {number} opts.annualAprPercent
   * @param {number} opts.termMonths contractual amortization horizon (for payment formula)
   * @param {boolean} [opts.includeExtra]
   * @param {number} [opts.extraMonthly]
   * @param {number} [opts.lumpSum]
   * @param {number} [opts.extraStartMonth] 1-based month index when extras apply
   * @param {number} [opts.maxIterations]
   */
  const loanAmortization = (opts = {}) => {
    const principal0 = clampNonNeg(opts.principal);
    const annual = clampNonNeg(opts.annualAprPercent);
    const termMonths = Math.max(0, Math.round(Number(opts.termMonths) || 0));
    const monthlyRate = annual / 100 / 12;

    let monthlyPayment = 0;
    if (principal0 > 0 && termMonths > 0) {
      if (monthlyRate <= 0) monthlyPayment = principal0 / termMonths;
      else {
        const pow = (1 + monthlyRate) ** termMonths;
        monthlyPayment = (principal0 * monthlyRate * pow) / (pow - 1);
      }
    }

    const includeExtra = !!opts.includeExtra;
    const extraMonthly = clampNonNeg(opts.extraMonthly);
    const lumpSum = clampNonNeg(opts.lumpSum);
    const startM = Math.max(1, Math.round(Number(opts.extraStartMonth) || 1));
    const cap = opts.maxIterations != null ? Number(opts.maxIterations) : Math.max(1200, termMonths + 240);

    const schedule = [];
    let balance = principal0;
    let month = 1;

    while (balance > 0 && month <= cap) {
      const interest = monthlyRate === 0 ? 0 : balance * monthlyRate;
      const basePrincipalPaid = Math.max(0, monthlyPayment - interest);
      let extraMonthlyApplied = 0;
      let lumpApplied = 0;
      if (includeExtra && month >= startM) {
        extraMonthlyApplied = extraMonthly;
        if (month === startM) lumpApplied = lumpSum;
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

    const summary = {
      totalPaid: schedule.reduce((s, r) => s + r.payment, 0),
      totalInterest: schedule.reduce((s, r) => s + r.interest, 0),
      months: schedule.length
    };

    return { monthlyPayment, schedule, summary };
  };

  /**
   * Master retirement-style simulation: monthly compounding, level monthly contributions,
   * optional inflation for real (today-dollar) terminal balance.
   * @param {object} opts
   * @param {number} opts.initial starting balance
   * @param {number} opts.monthly contribution per month
   * @param {number} opts.annualReturn nominal annual return % (APR, monthly compounded)
   * @param {number} opts.years horizon in years (fractional allowed; months = round(years*12))
   * @param {number} [opts.inflation] annual inflation % for real balance discount
   */
  const simulateFinancialPlan = (opts = {}) => {
    const initial = clampNonNeg(opts.initial);
    const monthly = clampNonNeg(opts.monthly);
    const annualReturn = clampNonNeg(opts.annualReturn);
    const years = Math.max(0, Number(opts.years) || 0);
    const inflation = clampNonNeg(opts.inflation);
    const nMonths = Math.max(0, Math.round(years * 12));

    const nominalFinalBalance =
      compoundGrowth(initial, annualReturn, nMonths, 12) + annuityContribution(monthly, annualReturn, nMonths, 12);
    const totalContributions = initial + monthly * nMonths;
    const totalGrowth = nominalFinalBalance - totalContributions;
    const realFinalBalance =
      inflation > 0 && years > 0 ? nominalFinalBalance / (1 + inflation / 100) ** years : nominalFinalBalance;
    const monthlyEquivalentIncome = (nominalFinalBalance * 0.04) / 12;

    return {
      nominalFinalBalance,
      realFinalBalance,
      totalContributions,
      totalGrowth,
      monthlyEquivalentIncome
    };
  };

  return {
    compoundGrowth,
    annuityContribution,
    loanAmortization,
    inflationAdjustment,
    simulateFinancialPlan
  };
})();

window.FinancialCore = FinancialCore;
