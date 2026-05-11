/**
 * CalnexApp Gold Standard Financial Model (GSFM) — pure math, no UI.
 * Deterministic in-memory cache: identical normalized inputs → identical outputs.
 */
const FinancialCore = (() => {
  const MAX_CACHE_ENTRIES = 2500;
  const resultCache = new Map();

  const stableSerialize = (val) => {
    if (val === undefined) return '"__u__"';
    if (val === null) return "null";
    const t = typeof val;
    if (t === "number") return JSON.stringify(Number.isFinite(val) ? val : null);
    if (t === "string" || t === "boolean") return JSON.stringify(val);
    if (Array.isArray(val)) return `[${val.map(stableSerialize).join(",")}]`;
    if (t !== "object") return JSON.stringify(String(val));
    const keys = Object.keys(val)
      .filter((k) => val[k] !== undefined)
      .sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${stableSerialize(val[k])}`).join(",")}}`;
  };

  const cacheGetOrSet = (namespace, inputObj, factory) => {
    const key = `${namespace}:${stableSerialize(inputObj)}`;
    if (resultCache.has(key)) {
      const v = resultCache.get(key);
      resultCache.delete(key);
      resultCache.set(key, v);
      return v;
    }
    const computed = factory();
    resultCache.set(key, computed);
    while (resultCache.size > MAX_CACHE_ENTRIES) {
      const first = resultCache.keys().next().value;
      resultCache.delete(first);
    }
    return computed;
  };

  const clampNonNeg = (x) => Math.max(0, Number(x) || 0);

  const periodicRateFromApr = (annualAprPercent, periodsPerYear) => {
    const p = Math.max(1, Math.round(Number(periodsPerYear) || 12));
    return clampNonNeg(annualAprPercent) / 100 / p;
  };

  const compoundGrowthRaw = (principal, annualAprPercent, numberOfPeriods, periodsPerYear = 12) => {
    const P = clampNonNeg(principal);
    const n = Math.max(0, Math.round(Number(numberOfPeriods) || 0));
    if (n === 0) return P;
    const i = periodicRateFromApr(annualAprPercent, periodsPerYear);
    if (i <= 0) return P;
    return P * (1 + i) ** n;
  };

  const annuityContributionRaw = (paymentPerPeriod, annualAprPercent, numberOfPeriods, periodsPerYear = 12) => {
    const C = clampNonNeg(paymentPerPeriod);
    const n = Math.max(0, Math.round(Number(numberOfPeriods) || 0));
    if (n === 0) return 0;
    const i = periodicRateFromApr(annualAprPercent, periodsPerYear);
    if (i <= 0) return C * n;
    const f = (1 + i) ** n;
    return C * ((f - 1) / i);
  };

  const inflationAdjustmentRaw = (amount, annualInflationPercent, years) => {
    const a = Number(amount) || 0;
    const y = Math.max(0, Number(years) || 0);
    const inf = clampNonNeg(annualInflationPercent);
    if (y === 0) return a;
    return a * (1 + inf / 100) ** y;
  };

  const normalizeLoanOpts = (opts = {}) => ({
    principal: clampNonNeg(opts.principal),
    annualAprPercent: clampNonNeg(opts.annualAprPercent),
    termMonths: Math.max(0, Math.round(Number(opts.termMonths) || 0)),
    includeExtra: !!opts.includeExtra,
    extraMonthly: clampNonNeg(opts.extraMonthly),
    lumpSum: clampNonNeg(opts.lumpSum),
    extraStartMonth: Math.max(1, Math.round(Number(opts.extraStartMonth) || 1)),
    maxIterations: opts.maxIterations != null ? Number(opts.maxIterations) : null
  });

  const loanAmortizationRaw = (opts = {}) => {
    console.trace("LOAN CORE EXECUTION"); // 👈 כאן בדיוק
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

  const calculateReferenceRetirementRaw = ({ initial, monthly, annualReturn, months }) => {
    console.trace("RETIREMENT CORE EXECUTION");
    const P = clampNonNeg(initial);
    const PMT = clampNonNeg(monthly);
    const annual = clampNonNeg(annualReturn);
    const n = Math.max(0, Math.round(Number(months) || 0));
    if (n === 0) return P;
    const r = annual / 100 / 12;
    if (r <= 0) return P + PMT * n;
    const f = (1 + r) ** n;
    return P * f + PMT * ((f - 1) / r);
  };

  const simulateFinancialPlanRaw = (opts = {}) => {
    console.trace("SIMULATION CORE EXECUTION");
    const initial = clampNonNeg(opts.initial);
    const monthly = clampNonNeg(opts.monthly);
    const annualReturn = clampNonNeg(opts.annualReturn);
    const years = Math.max(0, Number(opts.years) || 0);
    const inflation = clampNonNeg(opts.inflation);
    const nMonths =
      opts.months != null && opts.months !== ""
        ? Math.max(0, Math.round(Number(opts.months) || 0))
        : Math.max(0, Math.round(years * 12));

    const nominalFinalBalance =
      compoundGrowthRaw(initial, annualReturn, nMonths, 12) +
      annuityContributionRaw(monthly, annualReturn, nMonths, 12);
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

  const compoundGrowth = (principal, annualAprPercent, numberOfPeriods, periodsPerYear = 12) =>
    cacheGetOrSet(
      "compoundGrowth",
      { principal, annualAprPercent, numberOfPeriods, periodsPerYear },
      () => compoundGrowthRaw(principal, annualAprPercent, numberOfPeriods, periodsPerYear)
    );

  const annuityContribution = (paymentPerPeriod, annualAprPercent, numberOfPeriods, periodsPerYear = 12) =>
    cacheGetOrSet(
      "annuityContribution",
      { paymentPerPeriod, annualAprPercent, numberOfPeriods, periodsPerYear },
      () => annuityContributionRaw(paymentPerPeriod, annualAprPercent, numberOfPeriods, periodsPerYear)
    );

  const inflationAdjustment = (amount, annualInflationPercent, years) =>
    cacheGetOrSet(
      "inflationAdjustment",
      { amount, annualInflationPercent, years },
      () => inflationAdjustmentRaw(amount, annualInflationPercent, years)
    );

  const loanAmortization = (opts = {}) =>
    cacheGetOrSet("loanAmortization", normalizeLoanOpts(opts), () => loanAmortizationRaw(opts));

  const calculateReferenceRetirement = (params) =>
    cacheGetOrSet("calculateReferenceRetirement", params, () => calculateReferenceRetirementRaw(params));

  const simulateFinancialPlan = (opts = {}) =>
    cacheGetOrSet("simulateFinancialPlan", opts, () => simulateFinancialPlanRaw(opts));

  const COMPOUNDING_PERIODS = { yearly: 1, monthly: 12, daily: 365 };

  const periodicContributionFromMonthly = (monthlyContribution, periodsPerYear) => {
    const pp = Math.max(1, Math.round(Number(periodsPerYear) || 12));
    return (clampNonNeg(monthlyContribution) * 12) / pp;
  };

  const simpleInterestLumpSum = (principal, annualRatePercent, years) => {
    const P = clampNonNeg(principal);
    const r = clampNonNeg(annualRatePercent);
    const y = Math.max(0, Number(years) || 0);
    return P * (1 + (r / 100) * y);
  };

  const interestCompoundFinalRaw = ({ principal, annualRate, years, periodsPerYear, monthlyContribution }) => {
    const pp = Math.max(1, Math.round(Number(periodsPerYear) || 12));
    const totalPeriods = Math.max(0, Math.round(Number(years) * pp));
    const c = periodicContributionFromMonthly(monthlyContribution, pp);
    return (
      compoundGrowthRaw(principal, annualRate, totalPeriods, pp) +
      annuityContributionRaw(c, annualRate, totalPeriods, pp)
    );
  };

  const buildInterestYearlyRowsRaw = ({ principal, annualRate, years, periodsPerYear, monthlyContribution }) => {
    const rows = [];
    const pp = Math.max(1, Math.round(Number(periodsPerYear) || 12));
    const c = periodicContributionFromMonthly(monthlyContribution, pp);
    const yMax = Math.max(1, Math.round(Number(years) || 1));
    for (let year = 1; year <= yMax; year += 1) {
      const nPer = year * pp;
      const compoundAmount =
        compoundGrowthRaw(principal, annualRate, nPer, pp) + annuityContributionRaw(c, annualRate, nPer, pp);
      const simpleAtYear = principal * (1 + (annualRate / 100) * year);
      const contributionSum = monthlyContribution * 12 * year;
      const interestEarned = compoundAmount - principal - contributionSum;
      rows.push({
        year,
        simpleAmount: simpleAtYear,
        compoundAmount,
        contributions: contributionSum,
        interestEarned
      });
    }
    return rows;
  };

  const computeInterestToolkit = (raw) =>
    cacheGetOrSet("computeInterestToolkit", raw, () => {
      const principal = clampNonNeg(raw.principal);
      const annualRate = clampNonNeg(raw.annualRate);
      const years = Math.max(1, Math.round(Number(raw.years) || 1));
      const monthlyContribution = clampNonNeg(raw.monthlyContribution);
      const compounding = String(raw.compounding || "monthly");
      const periodsPerYear = COMPOUNDING_PERIODS[compounding] || 12;
      const compoundAmount = interestCompoundFinalRaw({
        principal,
        annualRate,
        years,
        periodsPerYear,
        monthlyContribution
      });
      const baseContributed = principal + monthlyContribution * 12 * years;
      const totalInterest = compoundAmount - baseContributed;
      const simpleTotal = simpleInterestLumpSum(principal, annualRate, years);
      const rows = buildInterestYearlyRowsRaw({
        principal,
        annualRate,
        years,
        periodsPerYear,
        monthlyContribution
      });
      return {
        inputs: { principal, annualRate, years, monthlyContribution, compounding, periodsPerYear },
        simpleTotal,
        compoundAmount,
        totalInterest,
        yearlyRows: rows
      };
    });

  const REFERENCE_FINANCIAL_RESULT_KEYS = [
    "projectedBalance",
    "yearsToRetirement",
    "inflationAdjustedGoal",
    "estimatedMonthlyIncome",
    "fundingGap",
    "readinessScore"
  ];

  const buildRetirementReferenceFinancialResult = (inputs, projectedBalance, yearsToRetirement) => {
    const pb = Number(projectedBalance);
    const safePb = Number.isFinite(pb) ? Math.max(0, pb) : 0;
    const ytr = Math.max(0, Number(yearsToRetirement) || 0);

    let inflationAdjustedGoal = inflationAdjustmentRaw(
      inputs.desiredRetirementIncome,
      inputs.inflationRate,
      ytr
    );
    if (!Number.isFinite(inflationAdjustedGoal)) inflationAdjustedGoal = 0;

    const estimatedMonthlyIncome = (safePb * 0.04) / 12;
    const targetMonthlyIncome = inflationAdjustedGoal / 12;
    const fundingGap = Math.max(0, targetMonthlyIncome - estimatedMonthlyIncome);
    const readinessScore =
      targetMonthlyIncome > 0 ? Math.min(100, (estimatedMonthlyIncome / targetMonthlyIncome) * 100) : 0;

    const raw = {
      projectedBalance: safePb,
      yearsToRetirement: ytr,
      inflationAdjustedGoal,
      estimatedMonthlyIncome,
      fundingGap,
      readinessScore
    };

    const result = {};
    REFERENCE_FINANCIAL_RESULT_KEYS.forEach((k) => {
      let v = raw[k];
      if (v === undefined || (typeof v === "number" && !Number.isFinite(v))) v = 0;
      result[k] = v;
    });
    result.readiness = result.readinessScore;
    return result;
  };

  const retirementBalanceAtMonths = (inputs, months) => {
    const m = Math.max(0, Math.round(Number(months) || 0));
    return calculateReferenceRetirementRaw({
      initial: inputs.currentSavings,
      monthly: inputs.monthlyContribution,
      annualReturn: inputs.annualReturnRate,
      months: m
    });
  };

  const buildRetirementChartSeries = (inputs, nMonths, terminalProjectedBalance) => {
    const currentAge = Number(inputs.currentAge) || 0;
    const currentSavings = clampNonNeg(inputs.currentSavings);
    const points = [{ age: currentAge, balance: currentSavings }];
    if (nMonths <= 0) return points;

    const refAt = (m) => retirementBalanceAtMonths(inputs, m);

    for (let m = 12; m <= nMonths; m += 12) {
      points.push({ age: currentAge + m / 12, balance: refAt(m) });
    }
    if (nMonths % 12 !== 0) {
      points.push({
        age: currentAge + nMonths / 12,
        balance: terminalProjectedBalance
      });
    }

    const last = points[points.length - 1];
    if (last && Number.isFinite(terminalProjectedBalance)) {
      const tol = Math.max(1e-9 * Math.max(1, Math.abs(terminalProjectedBalance)), 0.01);
      if (Math.abs(last.balance - terminalProjectedBalance) > tol) {
        last.balance = terminalProjectedBalance;
      }
    }
    return points;
  };

  const normalizeRetirementInputs = (raw) => ({
    currentAge: Math.max(0, Number(raw.currentAge) || 0),
    targetAge: Math.max(0, Number(raw.targetAge) || 0),
    currentSavings: clampNonNeg(raw.currentSavings),
    monthlyContribution: clampNonNeg(raw.monthlyContribution),
    annualReturnRate: clampNonNeg(raw.annualReturnRate),
    inflationRate: clampNonNeg(raw.inflationRate),
    desiredRetirementIncome: clampNonNeg(raw.desiredRetirementIncome)
  });

  const computeRetirementToolkit = (raw) =>
    cacheGetOrSet("computeRetirementToolkit", raw, () => {
      const inputs = normalizeRetirementInputs(raw);
      const targetAge = Math.max(inputs.currentAge + 1, inputs.targetAge || inputs.currentAge + 1);
      const fixed = { ...inputs, targetAge };
      const yearsToRetirement = Math.max(0, fixed.targetAge - fixed.currentAge);
      const nMonths = Math.max(0, Math.round(yearsToRetirement * 12));
      const referenceFV = calculateReferenceRetirementRaw({
        initial: fixed.currentSavings,
        monthly: fixed.monthlyContribution,
        annualReturn: fixed.annualReturnRate,
        months: nMonths
      });
      const projection = buildRetirementChartSeries(fixed, nMonths, referenceFV);
      const referenceFinancialResult = buildRetirementReferenceFinancialResult(fixed, referenceFV, yearsToRetirement);
      return { referenceFinancialResult, projection, nMonths, yearsToRetirement, inputs: fixed };
    });

  const computeLoanSnapshot = (raw) =>
    cacheGetOrSet("computeLoanSnapshot", raw, () => {
      const principal = clampNonNeg(raw.principal);
      const annualRate = clampNonNeg(raw.annualRate);
      const termMonths = Math.max(0, Math.round(Number(raw.termMonths) || 0));
      const extraMonthly = clampNonNeg(raw.extraMonthly);
      const lumpSum = clampNonNeg(raw.lumpSum);
      const extraStartMonth = Math.max(1, Math.round(Number(raw.extraStartMonth) || 1));

      const baselineLoan = loanAmortizationRaw({
        principal,
        annualAprPercent: annualRate,
        termMonths,
        includeExtra: false,
        extraMonthly: 0,
        lumpSum: 0,
        extraStartMonth: extraStartMonth
      });
      const acceleratedLoan = loanAmortizationRaw({
        principal,
        annualAprPercent: annualRate,
        termMonths,
        includeExtra: true,
        extraMonthly,
        lumpSum,
        extraStartMonth: extraStartMonth
      });
      const baseSummary = baselineLoan.summary;
      const acceleratedSummary = acceleratedLoan.summary;
      return {
        principal,
        annualRate,
        termMonths,
        extraMonthly,
        lumpSum,
        extraStartMonth,
        loanTermDisplay: raw.loanTermDisplay != null ? Number(raw.loanTermDisplay) : raw.termMonths,
        monthlyPayment: baselineLoan.monthlyPayment,
        baselineSchedule: baselineLoan.schedule,
        acceleratedSchedule: acceleratedLoan.schedule,
        baseSummary,
        acceleratedSummary,
        loan_interest_saved: Math.max(0, baseSummary.totalInterest - acceleratedSummary.totalInterest),
        loan_months_saved: Math.max(0, baseSummary.months - acceleratedSummary.months)
      };
    });

  const computeMortgageSnapshot = (raw) =>
    cacheGetOrSet("computeMortgageSnapshot", raw, () => {
      const homePrice = clampNonNeg(raw.homePrice);
      const downType = raw.downType === "fixed" ? "fixed" : "percent";
      const downPercent = clampNonNeg(raw.downPercent);
      const downFixed = clampNonNeg(raw.downFixed);
      const downPayment = downType === "percent" ? (homePrice * downPercent) / 100 : downFixed;
      const loanAmount = Math.max(0, homePrice - downPayment);
      const annualRate = clampNonNeg(raw.annualRate);
      const totalMonths = Math.max(0, Math.round(Number(raw.totalMonths) || 0));
      const extraMonthly = clampNonNeg(raw.extraMonthly);
      const lumpSum = clampNonNeg(raw.lumpSum);
      const paymentStartMonth = Math.max(1, Math.min(totalMonths, Math.round(Number(raw.paymentStartMonth) || 1) || 1));
      const propertyTaxAnnual = clampNonNeg(raw.propertyTaxAnnual);
      const homeInsuranceAnnual = clampNonNeg(raw.homeInsuranceAnnual);
      const annualIncome = Math.max(0, Number(raw.annualIncome) || 0);

      const taxMonthly = propertyTaxAnnual / 12;
      const insuranceMonthly = homeInsuranceAnnual / 12;
      const monthlyEscrow = taxMonthly + insuranceMonthly;

      const baselineMortgage = loanAmortizationRaw({
        principal: loanAmount,
        annualAprPercent: annualRate,
        termMonths: totalMonths,
        includeExtra: false,
        extraMonthly: 0,
        lumpSum: 0,
        extraStartMonth: paymentStartMonth
      });
      const acceleratedMortgage = loanAmortizationRaw({
        principal: loanAmount,
        annualAprPercent: annualRate,
        termMonths: totalMonths,
        includeExtra: true,
        extraMonthly,
        lumpSum,
        extraStartMonth: paymentStartMonth
      });
      const monthlyPrincipalInterest = baselineMortgage.monthlyPayment;
      const summary = acceleratedMortgage.summary;
      const monthlyMortgagePayment = monthlyPrincipalInterest + monthlyEscrow;
      const totalHomeCost = downPayment + summary.totalPaid + monthlyEscrow * summary.months;

      const monthlyIncome = annualIncome / 12;
      const recommendedMonthly = monthlyIncome > 0 ? monthlyIncome * 0.28 : 0;
      const mortgage_affordability_warning =
        recommendedMonthly === 0
          ? "Enter annual income to get an affordability signal."
          : monthlyMortgagePayment > recommendedMonthly
            ? "Warning: Estimated housing payment is above the 28% affordability guideline."
            : "Good fit: Estimated housing payment is within the 28% guideline.";

      const loan15 = loanAmortizationRaw({
        principal: loanAmount,
        annualAprPercent: annualRate,
        termMonths: 180,
        includeExtra: false,
        extraStartMonth: 1
      });
      const loan30 = loanAmortizationRaw({
        principal: loanAmount,
        annualAprPercent: annualRate,
        termMonths: 360,
        includeExtra: false,
        extraStartMonth: 1
      });
      const summary15 = loan15.summary;
      const summary30 = loan30.summary;
      const maxInterest = Math.max(summary15.totalInterest, summary30.totalInterest, 1);
      const width15 = Math.max(4, Math.round((summary15.totalInterest / maxInterest) * 100));
      const width30 = Math.max(4, Math.round((summary30.totalInterest / maxInterest) * 100));

      return {
        homePrice,
        downPayment,
        downType,
        downPercent,
        loanAmount,
        annualRate,
        totalMonths,
        extraMonthly,
        lumpSum,
        paymentStartMonth,
        propertyTaxAnnual,
        homeInsuranceAnnual,
        annualIncome,
        baselineSchedule: baselineMortgage.schedule,
        acceleratedSchedule: acceleratedMortgage.schedule,
        monthlyPrincipalInterest,
        monthlyEscrow,
        monthlyMortgagePayment,
        totalHomeCost,
        acceleratedSummary: summary,
        loan15Monthly: loan15.monthlyPayment,
        loan30Monthly: loan30.monthlyPayment,
        summary15,
        summary30,
        mortgage_compare_interest_diff: Math.max(0, summary30.totalInterest - summary15.totalInterest),
        recommendedMonthly,
        mortgage_affordability_warning,
        width15,
        width30,
        mortgage_summary_total_payments: summary.totalPaid + monthlyEscrow * summary.months
      };
    });

  const computeCarLoanSnapshot = (raw) =>
    cacheGetOrSet("computeCarLoanSnapshot", raw, () => {
      const carPrice = clampNonNeg(raw.carPrice);
      const tradeInValue = clampNonNeg(raw.tradeInValue);
      const fees = clampNonNeg(raw.fees);
      const downType = raw.downType === "fixed" ? "fixed" : "percent";
      const downByPercent = (carPrice * clampNonNeg(raw.downPercent)) / 100;
      const downByAmount = clampNonNeg(raw.downFixed);
      const downPayment = downType === "percent" ? downByPercent : downByAmount;
      const financed = Math.max(0, carPrice - downPayment - tradeInValue + fees);
      const annualRate = clampNonNeg(raw.annualRate);
      const totalMonths = Math.max(1, Math.round(Number(raw.totalMonths) || 1));
      const annualIncome = Math.max(0, Number(raw.annualIncome) || 0);
      const affordabilityMin = Number(raw.affordabilityMin) || 0.15;
      const affordabilityMax = Number(raw.affordabilityMax) || 0.2;

      const mainLoan = loanAmortizationRaw({
        principal: financed,
        annualAprPercent: annualRate,
        termMonths: totalMonths,
        includeExtra: false
      });
      const { monthlyPayment, schedule, summary } = mainLoan;

      const monthlyIncome = annualIncome / 12;
      const safeMin = monthlyIncome * affordabilityMin;
      const safeMax = monthlyIncome * affordabilityMax;
      let affordability_band = "none";
      let car_affordability_status = "Add income to evaluate affordability range.";
      if (monthlyIncome > 0) {
        if (monthlyPayment <= safeMax) {
          affordability_band = "green";
          car_affordability_status = "Affordable (green): payment is within safe range.";
        } else if (monthlyPayment <= safeMax * 1.2) {
          affordability_band = "yellow";
          car_affordability_status = "Stretching (yellow): payment is above safe range.";
        } else {
          affordability_band = "red";
          car_affordability_status = "Not affordable (red): payment is significantly above safe range.";
        }
      }

      const priceB = clampNonNeg(raw.comparePriceB);
      const downB = clampNonNeg(raw.compareDownB);
      const rateB = clampNonNeg(raw.compareRateB);
      const termB = Math.max(1, Math.round(Number(raw.compareTermB) || 1));
      const financedB = Math.max(0, priceB - downB);
      const monthlyB = loanAmortizationRaw({
        principal: financedB,
        annualAprPercent: rateB,
        termMonths: termB,
        includeExtra: false
      }).monthlyPayment;

      const loan48 = loanAmortizationRaw({
        principal: financed,
        annualAprPercent: annualRate,
        termMonths: 48,
        includeExtra: false
      });
      const loan72 = loanAmortizationRaw({
        principal: financed,
        annualAprPercent: annualRate,
        termMonths: 72,
        includeExtra: false
      });
      const monthly48 = loan48.monthlyPayment;
      const monthly72 = loan72.monthlyPayment;
      const summary48 = loan48.summary;
      const summary72 = loan72.summary;
      const insight_monthly_diff = Math.max(0, monthly48 - monthly72);
      const insight_interest_diff = Math.max(0, summary72.totalInterest - summary48.totalInterest);

      const car_total_cost = carPrice - tradeInValue - downPayment + fees + summary.totalPaid;

      return {
        carPrice,
        tradeInValue,
        fees,
        downPayment,
        financed,
        annualRate,
        totalMonths,
        schedule,
        car_monthly_payment: monthlyPayment,
        car_total_interest: summary.totalInterest,
        car_total_cost,
        car_safe_min: safeMin,
        car_safe_max: safeMax,
        car_current_payment: monthlyPayment,
        car_affordability_status,
        affordability_band,
        car_compare_monthly_a: monthlyPayment,
        car_compare_monthly_b: monthlyB,
        car_compare_difference: monthlyB - monthlyPayment,
        insight_interest_diff,
        insight_monthly_diff
      };
    });

  const futureValueAnnualContributions = (annualPayment, annualRateFraction, periods) => {
    const pmt = Math.max(0, Number(annualPayment) || 0);
    const r = Math.max(1e-9, Number(annualRateFraction) || 0);
    const n = Math.max(0, Math.round(Number(periods) || 0));
    if (n === 0) return 0;
    return (pmt * ((1 + r) ** n - 1)) / r;
  };

  const pickDashboardCacheKey = (state) => ({
    loan_monthly_payment: state.loan_monthly_payment,
    mortgage_monthly_payment: state.mortgage_monthly_payment,
    car_monthly_payment: state.car_monthly_payment,
    income: state.income,
    interest_compound_total: state.interest_compound_total,
    interest_years: state.interest_years,
    interest_compounding: state.interest_compounding,
    loan_term: state.loan_term,
    interest_rate: state.interest_rate,
    loan_total_interest: state.loan_total_interest,
    mortgage_total_interest: state.mortgage_total_interest,
    car_total_interest: state.car_total_interest,
    retirement_target_age: state.retirement_target_age,
    retirement_current_age: state.retirement_current_age,
    retirement_years_to_retirement: state.retirement_years_to_retirement,
    referenceFinancialResult: state.referenceFinancialResult,
    retirement_projected_balance: state.retirement_projected_balance
  });

  const computeDashboardFinancialSlice = (state) =>
    cacheGetOrSet("computeDashboardFinancialSlice", pickDashboardCacheKey(state), () => {
      const loanMonthly = Number(state.loan_monthly_payment) || 0;
      const mortgageMonthly = Number(state.mortgage_monthly_payment) || 0;
      const carMonthly = Number(state.car_monthly_payment) || 0;
      const annualIncome = Number(state.income) || 0;
      const monthlyIncome = annualIncome / 12;
      const obligations = loanMonthly + mortgageMonthly + carMonthly;
      const obligationRatio = monthlyIncome > 0 ? obligations / monthlyIncome : null;

      const dashboard_loan_count = [loanMonthly, mortgageMonthly, carMonthly].filter((v) => v > 0).length;
      const dashboard_mortgage_affordability =
        monthlyIncome > 0
          ? `${Math.round((mortgageMonthly / monthlyIncome) * 100)}% of monthly income`
          : "Set income in tools";

      const compoundTotal = Number(state.interest_compound_total) || 0;
      const hasInterestProjection = compoundTotal > 0;
      let dashboard_growth_projection = 0;
      let dashboard_growth_summary = "";

      if (hasInterestProjection) {
        const years =
          Number(state.interest_years) || Math.max(1, Math.round((Number(state.loan_term) || 120) / 12));
        dashboard_growth_projection = compoundTotal;
        dashboard_growth_summary = `${years}-year projection from Interest Calculator (${String(
          state.interest_compounding || "monthly"
        )} compounding).`;
      } else {
        const refRetirementBal =
          state.referenceFinancialResult && typeof state.referenceFinancialResult === "object"
            ? Number(state.referenceFinancialResult.projectedBalance) || 0
            : Number(state.retirement_projected_balance) || 0;
        if (refRetirementBal > 0) {
          dashboard_growth_projection = refRetirementBal;
          const yrs =
            state.retirement_target_age != null && state.retirement_current_age != null
              ? Math.max(0, Number(state.retirement_target_age) - Number(state.retirement_current_age))
              : Number(state.retirement_years_to_retirement) || 0;
          dashboard_growth_summary = `Retirement projection (reference) with ${yrs} years to target age.`;
        } else {
          const yearlyContribution = annualIncome * 0.1;
          const yearlyRate = Math.max(0.01, (Number(state.interest_rate) || 5) / 100);
          dashboard_growth_projection = futureValueAnnualContributions(yearlyContribution, yearlyRate, 10);
          const pctLabel = `${Math.round(yearlyRate * 100)}%`;
          dashboard_growth_summary = `10-year projection using ${pctLabel} annual compound rate on 10% income contribution.`;
        }
      }

      let dashboard_affordability_badge = "Safe";
      let dashboard_affordability_badge_class = "status-green";
      if (obligationRatio != null) {
        if (obligationRatio > 0.45) {
          dashboard_affordability_badge = "Overleveraged";
          dashboard_affordability_badge_class = "status-red";
        } else if (obligationRatio > 0.3) {
          dashboard_affordability_badge = "Caution";
          dashboard_affordability_badge_class = "status-yellow";
        }
      }

      const dashboard_affordability_score =
        monthlyIncome > 0 && obligationRatio != null ? `${Math.round(obligationRatio * 100)}%` : "N/A";

      const totalInterest =
        (Number(state.loan_total_interest) || 0) +
        (Number(state.mortgage_total_interest) || 0) +
        (Number(state.car_total_interest) || 0);

      const interestBurdenSeries = [
        loanMonthly * 12,
        mortgageMonthly * 12,
        carMonthly * 12,
        totalInterest
      ];

      return {
        dashboard_loan_count,
        dashboard_mortgage_affordability,
        dashboard_growth_projection,
        dashboard_growth_summary,
        dashboard_affordability_score,
        dashboard_affordability_badge,
        dashboard_affordability_badge_class,
        chartSummary: {
          monthlyIncome,
          obligations,
          totalInterest,
          loanMonthly,
          mortgageMonthly,
          carMonthly,
          interestBurdenSeries
        }
      };
    });

  const buildScenarioTimelineSeries = (comparison) => {
    if (!comparison || !comparison.first || !comparison.second) {
      return { maxMonths: 0, firstLine: [], secondLine: [], labels: [] };
    }
    const maxMonths = Math.max(comparison.first.payoffMonths, comparison.second.payoffMonths, 1);
    const firstLine = [];
    const secondLine = [];
    for (let index = 1; index <= maxMonths; index += 1) {
      const firstRatio = Math.max(0, 1 - index / comparison.first.payoffMonths);
      const secondRatio = Math.max(0, 1 - index / comparison.second.payoffMonths);
      firstLine.push(firstRatio * comparison.first.monthlyPayment * comparison.first.payoffMonths);
      secondLine.push(secondRatio * comparison.second.monthlyPayment * comparison.second.payoffMonths);
    }
    const labels = Array.from({ length: maxMonths }, (_, idx) => `M${idx + 1}`);
    return { maxMonths, firstLine, secondLine, labels };
  };

  console.log("[FINTECH_ENGINE] deterministic mode active");

  return {
    compoundGrowth,
    annuityContribution,
    loanAmortization,
    inflationAdjustment,
    simulateFinancialPlan,
    calculateReferenceRetirement,
    computeInterestToolkit,
    computeRetirementToolkit,
    computeLoanSnapshot,
    computeMortgageSnapshot,
    computeCarLoanSnapshot,
    computeDashboardFinancialSlice,
    buildScenarioTimelineSeries,
    COMPOUNDING_PERIODS
  };
})();

window.FinancialCore = FinancialCore;
