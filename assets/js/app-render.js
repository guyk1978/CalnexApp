/**
 * Single render authority: all full UI passes go through appRenderAll (engine-commit, init, etc.).
 */
const CalnexAppRender = (() => {
  const chartHooks = new Map();
  let engineCommitRenderDepth = 0;

  const registerCharts = (pageKey, fn) => {
    if (!pageKey || typeof fn !== "function") return;
    chartHooks.set(pageKey, fn);
  };

  const appRenderAll = (source = "", opts) => {
    const options = opts && typeof opts === "object" ? opts : {};
    if (options.outputsOnly) {
      if (typeof window.UiRenderer !== "undefined" && typeof UiRenderer.renderOutputs === "function") {
        UiRenderer.renderOutputs();
      }
      return;
    }

    if (source === "engine-commit") {
      if (engineCommitRenderDepth > 0) {
        console.warn("[RENDER] skipped nested engine-commit (single pass already active)");
        return;
      }
      engineCommitRenderDepth += 1;
    }

    try {
      const page = document.body?.dataset?.page || "";
      const hook = chartHooks.get(page);
      console.log("[RENDER] charts", { page, source, hasHook: !!hook });
      if (hook) {
        try {
          hook();
        } catch (err) {
          console.warn("[RENDER] charts failed", err);
        }
      }
      if (typeof window.UiRenderer !== "undefined" && typeof UiRenderer.renderAll === "function") {
        UiRenderer.renderAll();
      }
    } finally {
      if (source === "engine-commit") {
        engineCommitRenderDepth -= 1;
      }
    }
  };

  return { registerCharts, appRenderAll };
})();

window.CalnexAppRender = CalnexAppRender;
