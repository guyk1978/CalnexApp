const SharedState = (() => {
  const fields = [
    "loan_amount",
    "interest_rate",
    "loan_term",
    "extra_payment",
    "down_payment",
    "income",
    "loan_monthly_payment",
    "loan_total_interest",
    "loan_total_repayment",
    "loan_summary_total_payments",
    "loan_summary_total_interest",
    "loan_summary_payoff_date",
    "loan_before_payoff_date",
    "loan_after_payoff_date",
    "loan_copy_feedback",
    "loan_share_toast_message",
    "loan_base_total_paid",
    "loan_base_total_interest",
    "loan_after_total_paid",
    "loan_interest_saved",
    "loan_months_saved",
    "mortgage_monthly_payment",
    "mortgage_total_interest",
    "mortgage_total_cost",
    "mortgage_computed_loan_amount",
    "mortgage_down_payment_percent",
    "mortgage_down_payment_type",
    "mortgage_principal_interest_monthly",
    "mortgage_tax_insurance_monthly",
    "property_tax_annual",
    "home_insurance_annual",
    "mortgage_lump_sum_payment",
    "mortgage_payment_start_month",
    "mortgage_recommended_payment",
    "mortgage_actual_payment",
    "mortgage_compare_15_monthly",
    "mortgage_compare_15_interest",
    "mortgage_compare_30_monthly",
    "mortgage_compare_30_interest",
    "mortgage_compare_interest_diff",
    "mortgage_summary_total_payments",
    "mortgage_summary_total_interest",
    "mortgage_payoff_date",
    "mortgage_summary_payoff_date",
    "mortgage_affordability_warning",
    "car_monthly_payment",
    "car_total_interest",
    "car_total_cost",
    "car_computed_loan_amount",
    "car_safe_min",
    "car_safe_max",
    "car_current_payment",
    "car_compare_monthly_a",
    "car_compare_monthly_b",
    "car_compare_difference",
    "car_affordability_status",
    "car_insight_72_vs_48",
    "car_insight_interest_diff",
    "interest_principal",
    "interest_monthly_contribution",
    "interest_years",
    "interest_compounding",
    "interest_simple_total",
    "interest_compound_total",
    "interest_total_interest",
    "interest_final_amount",
    "retirement_current_age",
    "retirement_target_age",
    "retirement_current_savings",
    "retirement_monthly_contribution",
    "retirement_return_rate",
    "retirement_inflation_rate",
    "retirement_desired_income",
    "retirement_years_to_retirement",
    "retirement_projected_balance",
    "retirement_inflation_adjusted_goal",
    "retirement_monthly_income",
    "retirement_gap",
    "retirement_funding_gap",
    "retirement_readiness",
    "dashboard_loan_count",
    "dashboard_mortgage_affordability",
    "dashboard_growth_projection",
    "dashboard_growth_summary",
    "dashboard_affordability_score",
    "dashboard_affordability_badge",
    "dashboard_country_code",
    "dashboard_country_label",
    "dashboard_geo_summary",
    "dashboard_geo_comparison",
    "dashboard_active_scenario_label",
    "dashboard_scenario_indicator_name",
    "dashboard_scenario_share_text",
    "scenario_delta_monthly",
    "scenario_delta_interest",
    "scenario_delta_payoff",
    "scenario_delta_affordability",
    "currency",
    "selected_country",
    "scenario"
  ];
  const stringFields = new Set([
    "scenario",
    "interest_compounding",
    "currency",
    "selected_country",
    "loan_summary_payoff_date",
    "loan_before_payoff_date",
    "loan_after_payoff_date",
    "loan_copy_feedback",
    "loan_share_toast_message",
    "mortgage_payoff_date",
    "mortgage_summary_payoff_date",
    "mortgage_affordability_warning",
    "mortgage_down_payment_type",
    "car_affordability_status",
    "car_insight_72_vs_48",
    "car_insight_interest_diff",
    "retirement_funding_gap",
    "dashboard_mortgage_affordability",
    "dashboard_growth_summary",
    "dashboard_affordability_score",
    "dashboard_affordability_badge",
    "dashboard_country_code",
    "dashboard_country_label",
    "dashboard_geo_summary",
    "dashboard_geo_comparison",
    "dashboard_active_scenario_label",
    "dashboard_scenario_indicator_name",
    "dashboard_scenario_share_text",
    "scenario_delta_monthly",
    "scenario_delta_interest",
    "scenario_delta_payoff",
    "scenario_delta_affordability"
  ]);
  const objectFields = new Set(["geo_defaults"]);
  const state = {};

  const URL_NUMERIC_KEYS = ["loan_amount", "interest_rate", "loan_term", "extra_payment", "down_payment", "income"];
  const URL_STRING_KEYS = ["currency", "selected_country"];

  const toNumber = (value) => {
    if (value === null || value === undefined || value === "") return undefined;
    if (typeof window.CalnexParse !== "undefined") {
      const parsed = CalnexParse.parseNumber(value);
      return parsed !== null ? parsed : undefined;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  };

  const normalizeState = (raw = {}) => {
    const normalized = {};
    objectFields.forEach((field) => {
      if (raw[field] && typeof raw[field] === "object") {
        normalized[field] = raw[field];
      }
    });
    fields.forEach((key) => {
      if (stringFields.has(key)) {
        const value = raw[key];
        if (value !== undefined && value !== null && value !== "") {
          normalized[key] = String(value);
        }
        return;
      }
      const numeric = toNumber(raw[key]);
      if (numeric !== undefined) normalized[key] = numeric;
    });
    return normalized;
  };

  const parseFromUrl = () => {
    const params = new URLSearchParams(window.location.search);
    const seed = {
      loan_amount: params.get("loan_amount") || params.get("loan") || params.get("amount"),
      interest_rate: params.get("interest_rate") || params.get("rate"),
      loan_term: params.get("loan_term") || params.get("term"),
      extra_payment: params.get("extra_payment") || params.get("extra"),
      down_payment: params.get("down_payment"),
      income: params.get("income"),
      currency: params.get("currency") || window.localStorage.getItem("calnex_currency"),
      selected_country: params.get("selected_country") || params.get("country") || window.localStorage.getItem("calnex_country")
    };
    return normalizeState(seed);
  };

  const toQueryInputStateOnly = (snapshot = state) => {
    const params = new URLSearchParams();
    const snap = snapshot || {};

    if (snap.currency) {
      params.set("currency", String(snap.currency));
    }
    if (snap.selected_country) {
      params.set("country", String(snap.selected_country));
    }

    URL_NUMERIC_KEYS.forEach((key) => {
      const value = toNumber(snap[key]);
      if (value !== undefined && value >= 0) {
        params.set(key, String(value));
      }
    });

    return params.toString();
  };

  let urlDebounceTimer = null;
  const URL_DEBOUNCE_MS = 400;

  const replaceHistoryFromInputState = () => {
    const query = toQueryInputStateOnly(state);
    const nextUrl = query ? `${window.location.pathname}?${query}${window.location.hash}` : `${window.location.pathname}${window.location.hash}`;
    window.history.replaceState({}, "", nextUrl);
    console.log("[URL] updated with input state only", { query });
  };

  const scheduleDebouncedUrlSync = () => {
    if (urlDebounceTimer) window.clearTimeout(urlDebounceTimer);
    urlDebounceTimer = window.setTimeout(() => {
      urlDebounceTimer = null;
      replaceHistoryFromInputState();
    }, URL_DEBOUNCE_MS);
  };

  const refreshToolLinksInternal = () => {
    const query = toQueryInputStateOnly(state);
    document.querySelectorAll("[data-shared-link]").forEach((node) => {
      const target = node.getAttribute("data-target-path");
      if (!target) return;
      const href = query ? `${target}?${query}` : target;
      node.setAttribute("href", href);
    });
  };

  const refreshToolLinks = () => {
    refreshToolLinksInternal();
  };

  const setState = (partial = {}, options = null) => {
    const opts = typeof options === "object" && options !== null ? options : {};
    const syncUrl = opts.syncUrl === true;

    if (typeof window.AppEngine !== "undefined" && AppEngine.shouldDeferSetState(opts)) {
      AppEngine.deferSetState(partial);
      return { ...state };
    }
    const next = normalizeState(partial);
    stringFields.forEach((field) => {
      if (!(field in partial)) return;
      if (partial[field] === null || partial[field] === "") delete state[field];
      else state[field] = String(partial[field]);
    });
    objectFields.forEach((field) => {
      if (!(field in partial)) return;
      if (!partial[field] || typeof partial[field] !== "object") delete state[field];
      else state[field] = { ...partial[field] };
    });
    Object.assign(state, next);
    fields.forEach((key) => {
      if (!(key in next) && partial[key] === null) delete state[key];
    });

    refreshToolLinksInternal();
    if (syncUrl) {
      replaceHistoryFromInputState();
    }

    console.log("[STATE] updated", { keys: Object.keys(next), source: opts.engineCommit ? "commit" : opts.system ? "system" : "external" });
    const engineSource = opts.engineCommit ? "commit" : opts.system ? "system" : "external";
    document.dispatchEvent(new CustomEvent("sharedstate:updated", { detail: { ...state, __engineSource: engineSource } }));
    window.dispatchEvent(
      new CustomEvent("appStateChanged", {
        detail: {
          source: opts.engineCommit ? "engine-commit" : "shared-state",
          state: { ...state },
          bypassInputGuard: !!(opts.engineCommit || opts.system || opts.skipPhaseGuard)
        }
      })
    );
    return { ...state };
  };

  const getState = () => ({ ...state });

  const getCurrentUrl = () => {
    const query = toQueryInputStateOnly(state);
    return `${window.location.origin}${window.location.pathname}${query ? `?${query}` : ""}`;
  };

  Object.assign(state, parseFromUrl());

  window.addEventListener("DOMContentLoaded", () => {
    refreshToolLinks();
  });

  return {
    fields,
    getState,
    setState,
    refreshToolLinks,
    getCurrentUrl,
    scheduleDebouncedUrlSync
  };
})();
