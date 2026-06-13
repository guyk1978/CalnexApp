/**
 * Shared Chart.js styling — gradient area fills and modern tooltips.
 */
const CalnexChartEnhancements = (() => {
  const parseRgb = (cssColor) => {
    const c = String(cssColor || "").trim();
    if (c.startsWith("#") && c.length >= 7) {
      const r = parseInt(c.slice(1, 3), 16);
      const g = parseInt(c.slice(3, 5), 16);
      const b = parseInt(c.slice(5, 7), 16);
      return { r, g, b };
    }
    const m = c.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
    if (m) return { r: Number(m[1]), g: Number(m[2]), b: Number(m[3]) };
    return { r: 91, g: 140, b: 255 };
  };

  const areaGradient = (chart, borderColor, topAlpha = 0.28, bottomAlpha = 0) => {
    const { ctx, chartArea } = chart;
    if (!chartArea) return borderColor;
    const { top, bottom } = chartArea;
    const { r, g, b } = parseRgb(borderColor);
    const g = ctx.createLinearGradient(0, top, 0, bottom);
    g.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${topAlpha})`);
    g.addColorStop(1, `rgba(${r}, ${g}, ${b}, ${bottomAlpha})`);
    return g;
  };

  const enhanceLineDataset = (dataset, { fillPrimary = false } = {}) => {
    const border = dataset.borderColor;
    const next = { ...dataset };
    if (fillPrimary) {
      next.fill = true;
      next.backgroundColor = (ctx) => areaGradient(ctx.chart, border, 0.32, 0.02);
    }
    return next;
  };

  const modernTooltip = (palette = {}) => ({
    enabled: true,
    backgroundColor: palette.tooltipBg || "rgba(20, 26, 36, 0.94)",
    titleColor: palette.tooltipFg || "#e7eef8",
    bodyColor: palette.tooltipFg || "#e7eef8",
    borderColor: palette.tooltipBorder || "rgba(255, 255, 255, 0.12)",
    borderWidth: 1,
    cornerRadius: 12,
    padding: 12,
    caretSize: 6,
    caretPadding: 8,
    displayColors: true,
    boxPadding: 6,
    titleFont: { size: 12, weight: "600" },
    bodyFont: { size: 12 },
    footerFont: { size: 11 }
  });

  return { areaGradient, enhanceLineDataset, modernTooltip };
})();

window.CalnexChartEnhancements = CalnexChartEnhancements;
