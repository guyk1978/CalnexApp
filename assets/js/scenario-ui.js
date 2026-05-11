const ScenarioUi = (() => {
  const selectors = {
    saveScenarioBtn: document.getElementById("saveScenarioBtn"),
    resetScenarioBtn: document.getElementById("resetScenarioBtn"),
    savedScenariosList: document.getElementById("savedScenariosList"),
    scenarioActiveLabel: document.getElementById("scenarioActiveLabel"),
    scenarioIndicatorName: document.getElementById("scenarioIndicatorName"),
    scenarioShareLink: document.getElementById("scenarioShareLink")
  };

  const getEngine = () => (typeof ScenarioEngine !== "undefined" ? ScenarioEngine : null);
  const getShared = () => (typeof SharedState !== "undefined" ? SharedState.getState() : {});
  const setDerivedState = (patch) => {
    window.AppDerivedState = Object.assign({}, window.AppDerivedState || {}, patch);
    if (typeof UiRenderer !== "undefined" && typeof UiRenderer.renderOutputs === "function") {
      UiRenderer.renderOutputs();
    }
  };

  const formatDate = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Unknown date";
    return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  };

  const updateActiveIndicator = () => {
    const engine = getEngine();
    if (!engine) return;
    const shared = getShared();
    if (!shared.scenario) {
      setDerivedState({
        dashboard_active_scenario_label: "Active scenario: Baseline",
        dashboard_scenario_indicator_name: "Baseline",
        dashboard_scenario_share_text: "Share URL updates automatically when a scenario is active."
      });
      return;
    }
    const active = engine.getScenarios().find((item) => item.id === shared.scenario);
    const name = active ? active.name : shared.scenario;
    setDerivedState({
      dashboard_active_scenario_label: `Active scenario: ${name}`,
      dashboard_scenario_indicator_name: name,
      dashboard_scenario_share_text: `Share scenario URL: ${window.location.href}`
    });
  };

  const renderSavedScenarios = () => {
    const engine = getEngine();
    if (!engine || !selectors.savedScenariosList) return;
    const scenarios = engine.getScenarios();
    if (!scenarios.length) {
      selectors.savedScenariosList.innerHTML = `<p class="muted">No saved scenarios yet. Build one and click Save Scenario.</p>`;
      return;
    }
    selectors.savedScenariosList.innerHTML = scenarios
      .map(
        (scenario) => `
          <article class="scenario-row" data-scenario-id="${scenario.id}">
            <div>
              <p class="scenario-name">${scenario.name}</p>
              <p class="muted scenario-date">${formatDate(scenario.createdAt)}</p>
            </div>
            <div class="scenario-actions">
              <button class="btn btn-ghost" type="button" data-action="apply">Apply</button>
              <button class="btn btn-ghost" type="button" data-action="rename">Rename</button>
              <button class="btn btn-ghost" type="button" data-action="share">Share</button>
              <button class="btn btn-ghost" type="button" data-action="delete">Delete</button>
            </div>
          </article>
        `
      )
      .join("");
  };

  const handleSave = () => {
    const engine = getEngine();
    if (!engine) return;
    const name = window.prompt("Save scenario as", `Scenario ${new Date().toLocaleTimeString()}`);
    if (!name) return;
    const saved = engine.saveCurrentScenario(name);
    engine.applyScenario(saved.id);
    renderSavedScenarios();
    updateActiveIndicator();
  };

  const handleRowAction = (event) => {
    const target = event.target.closest("[data-action]");
    if (!target) return;
    const row = event.target.closest("[data-scenario-id]");
    if (!row) return;
    const id = row.dataset.scenarioId;
    const action = target.dataset.action;
    const engine = getEngine();
    if (!engine) return;

    if (action === "apply") {
      engine.applyScenario(id);
      updateActiveIndicator();
      return;
    }
    if (action === "rename") {
      const current = engine.getScenarios().find((item) => item.id === id);
      const name = window.prompt("Rename scenario", current ? current.name : "");
      if (!name) return;
      engine.renameScenario(id, name);
      renderSavedScenarios();
      updateActiveIndicator();
      return;
    }
    if (action === "delete") {
      const isConfirmed = window.confirm("Delete this scenario?");
      if (!isConfirmed) return;
      engine.deleteScenario(id);
      renderSavedScenarios();
      updateActiveIndicator();
      return;
    }
    if (action === "share") {
      engine.applyScenario(id);
      const shareUrl = window.location.href;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(shareUrl).catch(() => {});
      }
      window.alert(`Scenario URL ready:\n${shareUrl}`);
      updateActiveIndicator();
    }
  };

  const init = () => {
    if (document.body.dataset.page !== "dashboard") return;
    if (!getEngine()) return;

    if (selectors.saveScenarioBtn) selectors.saveScenarioBtn.addEventListener("click", handleSave);
    if (selectors.resetScenarioBtn) {
      selectors.resetScenarioBtn.addEventListener("click", () => {
        const engine = getEngine();
        if (!engine) return;
        engine.resetScenario();
        updateActiveIndicator();
      });
    }
    if (selectors.savedScenariosList) {
      selectors.savedScenariosList.addEventListener("click", handleRowAction);
    }

    document.addEventListener("scenarioengine:updated", () => {
      renderSavedScenarios();
      updateActiveIndicator();
    });
    document.addEventListener("sharedstate:updated", updateActiveIndicator);

    renderSavedScenarios();
    updateActiveIndicator();
  };

  return { init, renderSavedScenarios, updateActiveIndicator };
})();

window.addEventListener("DOMContentLoaded", ScenarioUi.init);
