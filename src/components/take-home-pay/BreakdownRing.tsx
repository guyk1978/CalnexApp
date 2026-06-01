"use client";

import type { TakeHomePayResult } from "@/lib/take-home-pay";

const RADIUS = 58;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

type BreakdownRingProps = {
  segments: TakeHomePayResult["segments"];
  netPercent: number;
};

export function BreakdownRing({ segments, netPercent }: BreakdownRingProps) {
  const taxSegments = segments.filter((s) => s.key !== "net");
  let offset = 0;

  return (
    <div className="relative mx-auto" style={{ width: 148, height: 148 }}>
      <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90" aria-hidden>
        <circle cx="64" cy="64" r={RADIUS} className="fill-none stroke-[color:var(--cn-chart-track)]" strokeWidth={12} />
        {taxSegments.map((seg) => {
          const dash = (seg.percent / 100) * CIRCUMFERENCE;
          const gap = CIRCUMFERENCE - dash;
          const el = (
            <circle
              key={seg.key}
              cx="64"
              cy="64"
              r={RADIUS}
              fill="none"
              stroke={seg.color}
              strokeWidth={12}
              strokeLinecap="round"
              strokeDasharray={`${dash} ${gap}`}
              strokeDashoffset={-offset}
              style={{ transition: "stroke-dasharray 0.55s cubic-bezier(0.22, 1, 0.36, 1)" }}
            />
          );
          offset += dash;
          return el;
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-3">
        <strong className="text-xl font-extrabold tabular-nums text-[color:var(--cn-success)]">
          {netPercent.toFixed(0)}%
        </strong>
        <span className="text-[10px] uppercase tracking-wider text-[color:var(--cn-text-tertiary)]">
          kept
        </span>
      </div>
    </div>
  );
}
