import type { ReactNode } from "react";

export type FeatureStatVariant = "truth" | "depth" | "friction";

const ICONS: Record<FeatureStatVariant, ReactNode> = {
  truth: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M3 17l6-6 4 4 8-10" />
      <path d="M14 5h7v7" />
    </svg>
  ),
  depth: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M12 2 2 7l10 5 10-5-10-5Z" />
      <path d="m2 12 10 5 10-5" />
      <path d="m2 17 10 5 10-5" />
    </svg>
  ),
  friction: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8Z" />
    </svg>
  )
};

export type FeatureStat = {
  variant: FeatureStatVariant;
  label: string;
  value: string;
};

type FeatureStatRowProps = {
  stats: FeatureStat[];
};

/**
 * React reference for the static-site hero feature grid.
 * Static HTML mirrors these class names: cn-stat--interactive, cn-stat--{variant}.
 */
export function FeatureStatRow({ stats }: FeatureStatRowProps) {
  return (
    <div className="cn-stat-row grid gap-4 sm:grid-cols-3">
      {stats.map((stat) => (
        <div key={stat.variant} className={`cn-stat cn-stat--interactive cn-stat--${stat.variant}`}>
          <span className="cn-stat__icon-wrap">{ICONS[stat.variant]}</span>
          <p className="cn-stat__label m-0 text-xs font-semibold uppercase tracking-wide text-[color:var(--cn-text-tertiary)]">
            {stat.label}
          </p>
          <p className="cn-stat__value m-0 mt-1 text-xl font-bold tabular-nums text-[color:var(--cn-text-primary)]">
            {stat.value}
          </p>
        </div>
      ))}
    </div>
  );
}

export const DEFAULT_FEATURE_STATS: FeatureStat[] = [
  { variant: "truth", label: "Truth in numbers", value: "PMT + schedule" },
  { variant: "depth", label: "Scenario depth", value: "Extras + CSV" },
  { variant: "friction", label: "Friction", value: "Near zero" }
];
