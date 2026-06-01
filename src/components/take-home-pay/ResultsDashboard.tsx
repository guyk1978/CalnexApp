"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { PayFrequency, TakeHomePayResult } from "@/lib/take-home-pay";
import { useSiteCurrency } from "@/hooks/useSiteCurrency";
import { BreakdownRing } from "./BreakdownRing";
import { formatPercent } from "./format";
import styles from "./take-home-pay.module.css";

type ResultsDashboardProps = {
  result: TakeHomePayResult;
  payFrequency: PayFrequency;
  calcKey: string;
};

export function ResultsDashboard({ result, payFrequency, calcKey }: ResultsDashboardProps) {
  const { formatMoney, currency } = useSiteCurrency();
  const reduceMotion = useReducedMotion();
  const netSegment = result.segments.find((s) => s.key === "net");
  const netPercent = netSegment?.percent ?? 0;
  const payLabel = payFrequency === "biweekly" ? "Bi-weekly" : "Monthly";

  const taxBars = result.segments.filter((s) => s.key !== "net");

  return (
    <motion.article
      key={`${calcKey}|${currency}`}
      className={styles.resultCard}
      initial={reduceMotion ? false : { opacity: 0.85, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      aria-live="polite"
    >
      {!reduceMotion ? (
        <motion.div
          className={styles.shimmerOverlay}
          initial={{ x: "-120%" }}
          animate={{ x: "200%" }}
          transition={{ duration: 0.85, ease: "easeInOut" }}
          aria-hidden
        />
      ) : null}

      <p
        style={{
          margin: 0,
          fontSize: "var(--cn-text-xs)",
          fontWeight: 600,
          letterSpacing: "0.07em",
          textTransform: "uppercase",
          color: "var(--cn-text-tertiary)",
        }}
      >
        Net take-home pay
      </p>
      <p className={styles.heroAmount}>{formatMoney(result.takeHome.yearly)}</p>
      <p className="muted" style={{ margin: "0.35rem 0 0", fontSize: "var(--cn-text-sm)" }}>
        {formatPercent(result.effectiveTaxRate * 100)} effective tax · {payLabel} paycheck{" "}
        {formatMoney(result.takeHome.perPayPeriod, true)}
      </p>

      <dl className={styles.metricGrid}>
        <div className={styles.metricTile}>
          <dt>Monthly</dt>
          <dd>{formatMoney(result.takeHome.monthly)}</dd>
        </div>
        <div className={styles.metricTile}>
          <dt>Weekly</dt>
          <dd>{formatMoney(result.takeHome.weekly)}</dd>
        </div>
        <div className={styles.metricTile}>
          <dt>Yearly</dt>
          <dd>{formatMoney(result.takeHome.yearly)}</dd>
        </div>
      </dl>

      <div className={styles.dashboard}>
        <BreakdownRing segments={result.segments} netPercent={netPercent} />
        <div className={styles.barList} aria-label="Pay breakdown by category">
          {taxBars.map((seg) => (
            <motion.div
              key={seg.key}
              className={styles.barRow}
              layout
              transition={{ duration: 0.4 }}
            >
              <span className={styles.barLabel}>{seg.label}</span>
              <div className={styles.barTrack}>
                <motion.div
                  className={styles.barFill}
                  style={{ backgroundColor: seg.color, color: seg.color }}
                  initial={false}
                  animate={{ width: `${Math.max(seg.percent, 0.5)}%` }}
                  transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
              <span className={styles.barPct}>{seg.percent.toFixed(1)}%</span>
            </motion.div>
          ))}
          <div className={styles.barRow}>
            <span className={styles.barLabel}>Gross</span>
            <div className={styles.barTrack}>
              <div
                className={styles.barFill}
                style={{
                  width: "100%",
                  backgroundColor: "var(--cn-text-tertiary)",
                  color: "var(--cn-text-tertiary)",
                  opacity: 0.45,
                }}
              />
            </div>
            <span className={styles.barPct}>100%</span>
          </div>
        </div>
      </div>

      <dl className={styles.taxDetailGrid}>
        <div className={styles.taxDetailItem}>
          <dt>Federal income tax</dt>
          <dd>{formatMoney(result.taxes.federal)}</dd>
        </div>
        <div className={styles.taxDetailItem}>
          <dt>FICA (SS + Medicare)</dt>
          <dd>{formatMoney(result.taxes.fica)}</dd>
        </div>
        <div className={styles.taxDetailItem}>
          <dt>State / local</dt>
          <dd>{formatMoney(result.taxes.stateLocal)}</dd>
        </div>
        <div className={styles.taxDetailItem}>
          <dt>Gross salary</dt>
          <dd>{formatMoney(result.grossAnnual)}</dd>
        </div>
      </dl>

      <p className={styles.disclaimer}>
        Estimates use 2025 federal brackets and standard deduction, plus FICA wage bases. Actual
        withholding varies with W-4 elections, pre-tax benefits, and credits—consult a tax
        professional for filing decisions.
      </p>
    </motion.article>
  );
}
