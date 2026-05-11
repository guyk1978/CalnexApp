/**
 * CalnexApp execution engine: strict phases to avoid reactive loops.
 * INPUT → (debounce) → COMPUTE → COMMIT → RENDER
 */
const AppEngine = (() => {
  const PHASE = { IDLE: "idle", INPUT: "input", COMPUTE: "compute", COMMIT: "commit", RENDER: "render" };
  let phase = PHASE.IDLE;
  let debounceId = null;
  const DEBOUNCE_MS = 110;
  const pipelines = new Map();
  const deferredPartials = [];

  const logPhase = (name) => console.log(`[ENGINE] ${name} phase`);

  const getPhase = () => phase;
  const isInputPhase = () => phase === PHASE.INPUT;

  const registerToolPipeline = (pageKey, fn) => {
    if (!pageKey || typeof fn !== "function") return;
    pipelines.set(pageKey, fn);
  };

  const shouldDeferSetState = (options = {}) => {
    if (options.engineCommit || options.system || options.skipPhaseGuard) return false;
    return phase === PHASE.INPUT;
  };

  const deferSetState = (partial) => {
    if (!partial || typeof partial !== "object") return;
    deferredPartials.push({ ...partial });
  };

  const takeDeferredMerged = () => {
    if (!deferredPartials.length) return null;
    const merged = deferredPartials.reduce((acc, patch) => Object.assign(acc, patch), {});
    deferredPartials.length = 0;
    return merged;
  };

  const beginInput = () => {
    if (phase !== PHASE.INPUT) {
      phase = PHASE.INPUT;
      logPhase("input");
    }
  };

  const schedulePipeline = () => {
    if (debounceId) window.clearTimeout(debounceId);
    debounceId = window.setTimeout(() => {
      debounceId = null;
      runPipeline();
    }, DEBOUNCE_MS);
  };

  const notifyToolInput = () => {
    beginInput();
    schedulePipeline();
  };

  const runPipeline = () => {
    const page = document.body?.dataset?.page;
    const runner = page ? pipelines.get(page) : null;
    if (!runner) {
      phase = PHASE.IDLE;
      return;
    }

    phase = PHASE.COMPUTE;
    logPhase("compute");

    let snapshot = null;
    try {
      snapshot = runner();
    } catch (err) {
      console.error("[ENGINE] compute failed", err);
    }

    const deferred = takeDeferredMerged();
    if (deferred && snapshot && typeof snapshot === "object") {
      snapshot = { ...deferred, ...snapshot };
    } else if (deferred && (!snapshot || typeof snapshot !== "object")) {
      snapshot = deferred;
    }

    if (snapshot && typeof snapshot === "object" && Object.keys(snapshot).length) {
      phase = PHASE.COMMIT;
      logPhase("commit");
      if (typeof SharedState !== "undefined") {
        SharedState.setState(snapshot, { engineCommit: true });
      }
      queueMicrotask(() => {
        phase = PHASE.RENDER;
        logPhase("render");
        phase = PHASE.IDLE;
      });
    } else {
      phase = PHASE.IDLE;
    }
  };

  const runImmediate = () => {
    if (debounceId) {
      window.clearTimeout(debounceId);
      debounceId = null;
    }
    runPipeline();
  };

  return {
    PHASE,
    getPhase,
    isInputPhase,
    registerToolPipeline,
    beginInput,
    schedulePipeline,
    notifyToolInput,
    runImmediate,
    shouldDeferSetState,
    deferSetState
  };
})();

window.AppEngine = AppEngine;
