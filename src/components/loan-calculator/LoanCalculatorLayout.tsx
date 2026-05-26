import type { ReactNode } from "react";
import styles from "./loan-calculator-layout.module.css";

type LoanCalculatorLayoutProps = {
  inputs: ReactNode;
  results: ReactNode;
  /** Charts, savings banner, amortization — full-width below the 2-column grid */
  belowGrid?: ReactNode;
};

/**
 * Layout-only wrapper matching the static Mortgage Calculator shell.
 */
export function LoanCalculatorLayout({ inputs, results, belowGrid }: LoanCalculatorLayoutProps) {
  return (
    <div className={styles.shell}>
      <section className={styles.layout}>
        {inputs}
        <div className={styles.resultsPanel}>{results}</div>
      </section>
      {belowGrid ? <div className={styles.belowGrid}>{belowGrid}</div> : null}
    </div>
  );
}
