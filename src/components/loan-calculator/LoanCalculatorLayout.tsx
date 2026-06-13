import type { ReactNode } from "react";
import styles from "./loan-calculator-layout.module.css";

type LoanCalculatorLayoutProps = {
  inputs: ReactNode;
  results: ReactNode;
  /** Charts, savings banner, amortization — full-width below results */
  belowGrid?: ReactNode;
};

/**
 * Page-level sticky sidebar + main results column (matches static tool shell).
 */
export function LoanCalculatorLayout({ inputs, results, belowGrid }: LoanCalculatorLayoutProps) {
  return (
    <div className={`${styles.pageBody} cn-calc-page-body`}>
      <aside className={`${styles.globalSidebar} cn-calc-global-sidebar cn-calc-sidebar`} aria-label="Calculator inputs">
        {inputs}
      </aside>
      <div className={`${styles.pageMain} cn-calc-page-main`}>
        <div className={`${styles.shell} cn-tool-shell cn-calc-workflow`}>
          <section className={`${styles.resultsOnly} calculator-layout cn-calculator-layout cn-calculator-workflow`}>
            <div className={`${styles.resultsPanel} cn-calc-results`}>{results}</div>
          </section>
          {belowGrid ? <div className={styles.belowGrid}>{belowGrid}</div> : null}
        </div>
      </div>
    </div>
  );
}
