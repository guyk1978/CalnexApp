const InputSyncLayer = (() => {
  const previousValid = new Map();

  const normalizeValue = (node, key) => {
    const raw = node.value;
    const trimmed = String(raw ?? "").trim();
    if (trimmed === "") return null;

    const isNumericInput = node.type === "number" || node.type === "range";
    if (isNumericInput) {
      const parsed = Number(trimmed);
      if (Number.isFinite(parsed)) {
        previousValid.set(key, parsed);
        return parsed;
      }
      if (previousValid.has(key)) return previousValid.get(key);
      return null;
    }

    const parsed = Number(trimmed);
    if (Number.isFinite(parsed) && node.dataset.inputType !== "text") {
      previousValid.set(key, parsed);
      return parsed;
    }
    previousValid.set(key, trimmed);
    return trimmed;
  };

  const updateSharedState = (node) => {
    if (!node) return;
    if (node.dataset.programmaticUpdate === "true") return;
    const key = node.getAttribute("data-input-bind");
    if (!key) return;
    if (typeof window.AppEngine !== "undefined") {
      AppEngine.beginInput();
      AppEngine.schedulePipeline();
      console.log(`[input-sync] input phase (deferred commit): ${key}`);
      return;
    }
    if (typeof SharedState === "undefined") return;
    const normalized = normalizeValue(node, key);
    const current = SharedState.getState();
    if (current[key] === normalized) return;
    SharedState.setState({ [key]: normalized }, { skipPhaseGuard: true });
    console.log(`[input-sync] field updated: ${key}=${normalized === null ? "null" : normalized}`);
  };

  const bindInput = (node) => {
    if (!node || node.dataset.inputSyncBound === "true") return;
    node.dataset.inputSyncBound = "true";
    ["input", "change", "blur"].forEach((eventName) => {
      node.addEventListener(eventName, () => updateSharedState(node));
    });
  };

  const bindAll = () => {
    document.querySelectorAll("[data-input-bind]").forEach(bindInput);
  };

  const init = () => {
    bindAll();
    const observer = new MutationObserver(() => bindAll());
    observer.observe(document.body, { childList: true, subtree: true });
  };

  return { init, bindAll, updateSharedState };
})();

window.InputSyncLayer = InputSyncLayer;
if (document.readyState === "loading") {
  window.addEventListener("DOMContentLoaded", InputSyncLayer.init);
} else {
  InputSyncLayer.init();
}
