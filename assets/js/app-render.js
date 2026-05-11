/**
 * Single Render Authority: כל רינדור UI (DOM / charts / dashboard) עובר דרך appRenderAll בלבד.
 */
const CalnexAppRender = (() => {
  const chartHooks = new Map();
  /** מפתחות רינדור פעילים — מונע re-entrancy / כפילות לאותו source+מצב */
  const activeRender = new Set();

  const registerCharts = (pageKey, fn) => {
    if (!pageKey || typeof fn !== "function") return;
    chartHooks.set(pageKey, fn);
  };

  const renderKey = (source, outputsOnly) => `${source || "anonymous"}::${outputsOnly ? "outputs" : "full"}`;

  const appRenderAll = (source = "", opts) => {
    const options = opts && typeof opts === "object" ? opts : {};
    const outputsOnly = !!options.outputsOnly;
    const key = renderKey(source, outputsOnly);

    if (activeRender.has(key)) {
      console.warn("[RENDER SKIP DUPLICATE]", source, outputsOnly ? { outputsOnly: true } : {});
      return;
    }
    activeRender.add(key);

    try {
      if (outputsOnly) {
        if (typeof window.UiRenderer !== "undefined" && typeof UiRenderer.renderOutputs === "function") {
          UiRenderer.renderOutputs();
        }
        return;
      }

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
      activeRender.delete(key);
    }
  };

  let appStateRenderBridgeAttached = false;
  /**
   * מאזין יחיד ל-appStateChanged — לא ב-UiRenderer.
   * engine-commit לא נשלח מ-SharedState; אם מישהו שולח עם engine-commit — NO-OP מוחלט.
   */
  const attachAppStateRenderBridge = () => {
    if (appStateRenderBridgeAttached) return;
    appStateRenderBridgeAttached = true;
    window.addEventListener("appStateChanged", (event) => {
      if (event.detail?.source === "engine-commit") {
        return;
      }
      if (typeof window.AppEngine !== "undefined" && AppEngine.isInputPhase() && !event.detail?.bypassInputGuard) {
        console.log("[ENGINE] render skipped (input phase, no bypass)");
        return;
      }
      appRenderAll(event.detail?.source || "app-state-changed");
    });
  };

  attachAppStateRenderBridge();

  return { registerCharts, appRenderAll };
})();

window.CalnexAppRender = CalnexAppRender;
