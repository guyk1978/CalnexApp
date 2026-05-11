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
    "mortgage_principal_interest_monthly",
    "mortgage_tax_insurance_monthly",
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
    "car_affordability_status",
    "car_insight_72_vs_48",
    "car_insight_interest_diff",
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

  const toNumber = (value) => {
    if (value === null || value === undefined || value === "") return undefined;
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
      scenario: params.get("scenario"),
      interest_compounding: params.get("interest_compounding") || params.get("frequency"),
      currency: params.get("currency") || window.localStorage.getItem("calnex_currency"),
      selected_country: params.get("selected_country") || params.get("country") || window.localStorage.getItem("calnex_country")
    };
    fields.forEach((field) => {
      if (!(field in seed)) {
        seed[field] = params.get(field);
      }
    });
    return normalizeState(seed);
  };

  const toQuery = (snapshot = state) => {
    const params = new URLSearchParams();
    fields.forEach((key) => {
      if (stringFields.has(key)) {
        if (snapshot[key]) {
          if (key === "selected_country") params.set("country", String(snapshot[key]));
          else params.set(key, String(snapshot[key]));
        }
        return;
      }
      const value = toNumber(snapshot[key]);
      if (value !== undefined && value >= 0) {
        params.set(key, String(value));
      }
    });
    return params.toString();
  };

  const replaceUrl = () => {
    const query = toQuery(state);
    const nextUrl = query ? `${window.location.pathname}?${query}${window.location.hash}` : `${window.location.pathname}${window.location.hash}`;
    window.history.replaceState({}, "", nextUrl);
  };

  const refreshToolLinks = () => {
    const query = toQuery(state);
    document.querySelectorAll("[data-shared-link]").forEach((node) => {
      const target = node.getAttribute("data-target-path");
      if (!target) return;
      const href = query ? `${target}?${query}` : target;
      node.setAttribute("href", href);
    });
  };

  const setState = (partial = {}, options = { syncUrl: true }) => {
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
    if (options.syncUrl !== false) replaceUrl();
    refreshToolLinks();
    document.dispatchEvent(new CustomEvent("sharedstate:updated", { detail: { ...state } }));
    window.dispatchEvent(new CustomEvent("appStateChanged", { detail: { source: "shared-state", state: { ...state } } }));
    return { ...state };
  };

  const getState = () => ({ ...state });

  const getCurrentUrl = () => {
    const query = toQuery(state);
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
    getCurrentUrl
  };
})();
