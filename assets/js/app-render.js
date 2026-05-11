/**
 * Single post-compute render pass: charts (tool-specific) then UiRenderer + dashboard.
 */
const CalnexAppRender = (() => {
  const chartHooks = new Map();

  const registerCharts = (pageKey, fn) => {
    if (!pageKey || typeof fn !== "function") return;
    chartHooks.set(pageKey, fn);
  };

  const appRenderAll = (source = "") => {
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
  };

  return { registerCharts, appRenderAll };
})();

window.CalnexAppRender = CalnexAppRender;
