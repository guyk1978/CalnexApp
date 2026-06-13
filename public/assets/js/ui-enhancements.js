/**
 * Vibrant UI enhancements: confidence meter, slider fields, icon lists fallback.
 */
(function () {
  const STAT_ICONS = {
    truth: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 17l6-6 4 4 8-10"/><path d="M14 5h7v7"/></svg>',
    depth: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 2 2 7l10 5 10-5-10-5Z"/><path d="m2 12 10 5 10-5"/><path d="m2 17 10 5 10-5"/></svg>',
    friction:
      '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8Z"/></svg>'
  };

  const statVariantFromLabel = (label) => {
    const t = String(label || "").toLowerCase();
    if (t.includes("truth") || t.includes("honest") || t.includes("numbers") || t.includes("strateg")) {
      if (t.includes("strateg") && !t.includes("truth")) return null;
      if (t.includes("truth") || t.includes("honest") || t.includes("pmt")) return "truth";
    }
    if (t.includes("scenario") || t.includes("depth") || t.includes("timeline") || t.includes("parallel"))
      return "depth";
    if (t.includes("friction") || t.includes("near zero") || t.includes("savings") || t.includes("verdict"))
      return "friction";
    if (t.includes("truth")) return "truth";
    if (t.includes("depth") || t.includes("offers") || t.includes("break-even")) return "depth";
    return null;
  };

  const enhanceStatCards = () => {
    document.querySelectorAll(".cn-stat-row .cn-stat").forEach((card, index) => {
      if (card.querySelector(".cn-stat__icon-wrap")) return;
      const label = card.querySelector(".cn-stat__label")?.textContent?.trim() || "";
      let variant =
        card.dataset.stat ||
        statVariantFromLabel(label) ||
        (["truth", "depth", "friction"][index] ?? "truth");
      card.classList.add("cn-stat--interactive", `cn-stat--${variant}`);
      const wrap = document.createElement("span");
      wrap.className = "cn-stat__icon-wrap";
      wrap.innerHTML = STAT_ICONS[variant] || STAT_ICONS.truth;
      card.insertBefore(wrap, card.firstChild);
    });
  };

  const SLIDER_MAP = [
    { ids: ["loanAmountSlider", "homePriceSlider", "carPriceSlider", "principalSlider"], cls: "cn-slider-field--amount" },
    { ids: ["interestRateSlider", "mortgageRateSlider"], cls: "cn-slider-field--rate" },
    { ids: ["loanTermSlider", "termSlider"], cls: "cn-slider-field--term" }
  ];

  const enhanceSliders = () => {
    SLIDER_MAP.forEach(({ ids, cls }) => {
      ids.forEach((id) => {
        const slider = document.getElementById(id);
        if (!slider) return;
        const field = slider.closest(".field");
        if (!field) return;
        field.classList.add("cn-slider-field", cls);
      });
    });
  };

  const init = () => {
    enhanceStatCards();
    enhanceSliders();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  document.addEventListener("cn-render-complete", init);
})();
