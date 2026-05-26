import type { ReactNode } from "react";
import styles from "./loan-calculator-layout.module.css";

type LoanCalculatorLayoutProps = {
  inputs: ReactNode;
  /** Metrics, charts, and quick results — wrapped in sticky container on desktop */
  resultsSticky: ReactNode;
  /** Amortization schedule, savings banner, etc. — scrolls below sticky block */
  resultsBelow?: ReactNode;
};

/**
 * Layout-only wrapper for the loan calculator (5/12 inputs, 7/12 results).
 * Does not own form state or calculation logic.
 */
export function LoanCalculatorLayout({ inputs, resultsSticky, resultsBelow }: LoanCalculatorLayoutProps) {
  return (
    <div className={styles.shell}>
      <section className={styles.layout}>
        <div className={styles.inputs}>{inputs}</div>
        <div className={styles.resultsTrack}>
          <div className={styles.resultsSticky}>{resultsSticky}</div>
          {resultsBelow ? <div className={styles.belowSticky}>{resultsBelow}</div> : null}
        </div>
      </section>
    </div>
  );
}
