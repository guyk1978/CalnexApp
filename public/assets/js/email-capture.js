const EmailCapture = (() => {
  const STORAGE_KEY = "calnex_email_capture_v1";
  const RESULTS_KEY = "calnex_saved_results_v1";

  const selectors = {
    name: document.getElementById("emailCaptureName"),
    email: document.getElementById("emailCaptureEmail"),
    sendBtn: document.getElementById("emailCaptureSendBtn"),
    saveBtn: document.getElementById("emailCaptureSaveResultsBtn"),
    summaryLink: document.getElementById("emailCaptureSummaryLink"),
    status: document.getElementById("emailCaptureStatus")
  };

  const getShared = () => (typeof SharedState !== "undefined" ? SharedState.getState() : {});
  const getScenarioId = () => {
    const state = getShared();
    return state.scenario || null;
  };

  const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());

  const buildSummaryLink = () => {
    if (typeof SharedState !== "undefined") return SharedState.getCurrentUrl();
    return window.location.href;
  };

  const buildPayload = () => {
    const state = getShared();
    return {
      capturedAt: new Date().toISOString(),
      page: window.location.pathname,
      summaryLink: buildSummaryLink(),
      email: String(selectors.email.value || "").trim(),
      name: String(selectors.name.value || "").trim(),
      scenario: getScenarioId(),
      currency: state.currency || "USD",
      selected_country: state.selected_country || "US",
      state
    };
  };

  const writeStatus = (message) => {
    if (selectors.status) selectors.status.textContent = message;
  };

  const persistProfile = () => {
    const payload = {
      email: String(selectors.email.value || "").trim(),
      name: String(selectors.name.value || "").trim(),
      updatedAt: new Date().toISOString()
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  };

  const persistResults = () => {
    const payload = buildPayload();
    window.localStorage.setItem(RESULTS_KEY, JSON.stringify(payload));
    selectors.summaryLink.href = payload.summaryLink;
    return payload;
  };

  const submitCapture = () => {
    const email = String(selectors.email.value || "").trim();
    if (!isValidEmail(email)) {
      writeStatus("Enter a valid email to save your results.");
      return;
    }
    persistProfile();
    const payload = persistResults();
    writeStatus(
      `Saved locally for ${email}. API delivery placeholder ready. Summary link generated at ${new Date(
        payload.capturedAt
      ).toLocaleTimeString()}.`
    );
  };

  const loadStoredValues = () => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed.name) selectors.name.value = parsed.name;
      if (parsed.email) selectors.email.value = parsed.email;
    } catch (_error) {
      // ignore parse issues
    }
  };

  const refreshSummaryLink = () => {
    if (!selectors.summaryLink) return;
    selectors.summaryLink.href = buildSummaryLink();
  };

  const init = () => {
    if (document.body.dataset.page !== "dashboard") return;
    if (!selectors.email || !selectors.sendBtn) return;

    loadStoredValues();
    refreshSummaryLink();

    selectors.sendBtn.addEventListener("click", submitCapture);
    selectors.saveBtn.addEventListener("click", () => {
      const payload = persistResults();
      writeStatus(`Results snapshot saved locally (${new Date(payload.capturedAt).toLocaleString()}).`);
    });

    document.addEventListener("sharedstate:updated", refreshSummaryLink);
    document.addEventListener("scenarioengine:applied", refreshSummaryLink);
    document.addEventListener("currency:changed", refreshSummaryLink);
    document.addEventListener("geo:changed", refreshSummaryLink);
  };

  return { init };
})();

window.addEventListener("DOMContentLoaded", EmailCapture.init);
