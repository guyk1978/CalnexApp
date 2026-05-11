/**
 * Single global input pipeline: capture-phase `input` only (device-agnostic).
 * input → normalize → schedule compute (AppEngine) or legacy setState
 */
const InputSyncLayer = (() => {
  const previousValid = new Map();

  const normalizeValue = (node, key) => {
    const raw = node.value;
    const trimmed = String(raw ?? "").trim();
    if (trimmed === "") return null;

    if (typeof CalnexParse !== "undefined" && node.tagName !== "SELECT" && node.dataset.inputType !== "text") {
      const parsed = CalnexParse.parseNumber(raw);
      if (parsed !== null) {
        previousValid.set(key, parsed);
        return parsed;
      }
      if (previousValid.has(key)) return previousValid.get(key);
      return null;
    }

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

  const resolveBoundNode = (target) => {
    if (!target || target.nodeType !== 1) return null;
    if (target.dataset?.programmaticUpdate === "true") return null;
    if (target.hasAttribute?.("data-input-bind")) return target;
    return target.closest?.("[data-input-bind]") || null;
  };

  const updateSharedState = (node) => {
    if (!node) return;
    if (node.dataset.programmaticUpdate === "true") return;
    const key = node.getAttribute("data-input-bind");
    if (!key) return;

    console.log("[INPUT] fired", { key, raw: node.value });

    if (typeof window.AppEngine !== "undefined") {
      AppEngine.beginInput();
      AppEngine.schedulePipeline();
      return;
    }
    if (typeof SharedState === "undefined") return;
    const normalized = normalizeValue(node, key);
    const current = SharedState.getState();
    if (current[key] === normalized) return;
    SharedState.setState({ [key]: normalized }, { skipPhaseGuard: true });
  };

  const onDelegatedInput = (event) => {
    const node = resolveBoundNode(event.target);
    if (!node) return;
    updateSharedState(node);
  };

  const bindAll = () => {};

  const init = () => {
    if (window.__calnexInputSyncInit) return;
    window.__calnexInputSyncInit = true;
    const root = document.body || document.documentElement;
    root.addEventListener("input", onDelegatedInput, true);
  };

  return { init, bindAll, updateSharedState };
})();

window.InputSyncLayer = InputSyncLayer;
if (document.readyState === "loading") {
  window.addEventListener("DOMContentLoaded", InputSyncLayer.init);
} else {
  InputSyncLayer.init();
}
