/**
 * FinancialValidator — passive verification only.
 * Compares committed state to referenceFinancialResult (single source of truth).
 * Does not call FinancialCore or perform amortization, FV, or other engine math.
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

  const pushWarn = (warnings, scoreRef, msg, delta = 10) => {
    warnings.push(msg);
    scoreRef.v = Math.max(0, scoreRef.v - delta);
  };

  const labelFromScore = (s) => {
    if (s >= 85) return "High";
    if (s >= 60) return "Medium";
    return "Low";
  };

  /** Relative drift; returns false if either side is non-finite or reference magnitude is negligible. */
  const relativeDriftExceeds = (actual, reference, maxRel) => {
    const a = n(actual, NaN);
    const b = n(reference, NaN);
    if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
    const denom = Math.max(Math.abs(b), 1e-9);
    return Math.abs(a - b) / denom > maxRel;
  };

  const SHADOW_FIELD_PAIRS = [
    ["retirement_projected_balance", "projectedBalance", 0.005],
    ["retirement_years_to_retirement", "yearsToRetirement", 0.02],
    ["retirement_inflation_adjusted_goal", "inflationAdjustedGoal", 0.02],
    ["retirement_monthly_income", "estimatedMonthlyIncome", 0.02],
    ["retirement_gap", "fundingGap", 0.03],
    ["retirement_readiness", "readinessScore", 0.02]
  ];

  const validateRetirementObserver = (inputs, outputs, warnings, scoreRef) => {
    let isValid = true;
    const ref = outputs.referenceFinancialResult;

    if (!ref || typeof ref !== "object") {
      pushWarn(warnings, scoreRef, "Missing referenceFinancialResult — cannot verify retirement outputs.", 30);
      return false;
    }

    const pb = n(ref.projectedBalance);
    if (!Number.isFinite(pb) || pb < 0) {
      pushWarn(warnings, scoreRef, "Reference projected balance is missing, non-finite, or negative.", 35);
      isValid = false;
    }

    const ytr = n(ref.yearsToRetirement);
    if (!Number.isFinite(ytr) || ytr < 0) {
      pushWarn(warnings, scoreRef, "Reference years to retirement is invalid.", 20);
      isValid = false;
    }

    const rs = n(ref.readinessScore ?? ref.readiness);
    if (Number.isFinite(rs) && (rs < -0.01 || rs > 100.01)) {
      pushWarn(warnings, scoreRef, "Reference readiness is outside the expected 0–100 range.", 15);
    }

    for (const [flatKey, refKey, tol] of SHADOW_FIELD_PAIRS) {
      const shadow = outputs[flatKey];
      if (shadow === null || shadow === undefined || shadow === "") continue;
      const sv = n(shadow, NaN);
      if (!Number.isFinite(sv)) continue;
      const rv = n(ref[refKey], NaN);
      if (!Number.isFinite(rv)) continue;
      if (relativeDriftExceeds(sv, rv, tol)) {
        pushWarn(
          warnings,
          scoreRef,
          `State field "${flatKey}" diverges from referenceFinancialResult.${refKey} (passive drift check).`,
          22
        );
      }
    }

    const c = n(inputs.retirement_monthly_contribution ?? outputs.retirement_monthly_contribution);
    const years = Math.max(0, n(inputs.retirement_target_age, 0) - n(inputs.retirement_current_age, 0));
    if (c >= 1000 && years >= 25 && pb > 12_000_000) {
      pushWarn(warnings, scoreRef, "Very large reference balance for typical contribution levels — verify inputs.", 12);
    }

    return isValid;
  };

  const validateFinancialResult = ({ type, inputs, outputs }) => {
    const warnings = [];
    const scoreRef = { v: 100 };
    let isValid = true;

    if (!type || !outputs || typeof outputs !== "object") {
      return { isValid: true, warnings: [], adjustedConfidenceScore: 100 };
    }

    if (type === "retirement") {
      isValid = validateRetirementObserver(inputs || {}, outputs, warnings, scoreRef) && isValid;
    }

    const adjustedConfidenceScore = Math.round(Math.max(0, Math.min(100, scoreRef.v)));
    if (!isValid || adjustedConfidenceScore < 50 || warnings.length >= 2) {
      console.warn("[VALIDATOR] anomaly", { type, isValid, warnings, score: adjustedConfidenceScore });
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
    validateFinancialResult,
    toStatePatch
  };
})();

window.FinancialValidator = FinancialValidator;
