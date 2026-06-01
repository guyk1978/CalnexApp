/** Matches app.js initHeaderChart — visible before JS loads. */
export function BrandChartMark() {
  return (
    <span className="header-chart-mini" aria-hidden="true" title="CalnexApp Analytics">
      <span className="header-chart-mini__bar" />
      <span className="header-chart-mini__bar" />
      <span className="header-chart-mini__bar" />
      <span className="header-chart-mini__bar" />
    </span>
  );
}
