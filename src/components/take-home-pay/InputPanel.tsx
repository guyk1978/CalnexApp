"use client";

import { useSiteCurrency } from "@/hooks/useSiteCurrency";
import type { PayFrequency, TakeHomePayInputs, TaxFilingStatus } from "@/lib/take-home-pay";
import styles from "./take-home-pay.module.css";

type InputPanelProps = {
  inputs: TakeHomePayInputs;
  onChange: (patch: Partial<TakeHomePayInputs>) => void;
};

const FILING_OPTIONS: { value: TaxFilingStatus; label: string }[] = [
  { value: "single", label: "Single" },
  { value: "married_joint", label: "Married filing jointly" },
  { value: "married_separate", label: "Married filing separately" },
  { value: "head_of_household", label: "Head of household" },
];

export function InputPanel({ inputs, onChange }: InputPanelProps) {
  const { symbol } = useSiteCurrency();

  return (
    <form
      className="card input-card"
      aria-label="Take-home pay calculator form"
      onSubmit={(e) => e.preventDefault()}
    >
      <header className="cn-calc-form__head">
        <h2 className="cn-calc-form__title">Paycheck inputs</h2>
        <p className="cn-calc-form__lede muted">
          Adjust salary and tax assumptions—the results update as you type.
        </p>
      </header>

      <div className="field">
        <label htmlFor="thp-gross">Gross annual salary</label>
        <div className="input-with-prefix">
          <span data-currency-symbol>{symbol}</span>
          <input
            id="thp-gross"
            type="number"
            min={0}
            step={1000}
            data-input-bind="thp_gross"
            value={inputs.grossAnnualSalary}
            onChange={(e) => onChange({ grossAnnualSalary: Number(e.target.value) })}
          />
        </div>
      </div>

      <fieldset className="cn-calc-fieldset" style={{ border: 0, padding: 0, margin: "0 0 1rem" }}>
        <legend className="cn-calc-fieldset__legend" style={{ marginBottom: "0.5rem" }}>
          Pay frequency
        </legend>
        <input type="hidden" data-input-bind="thp_freq" value={inputs.payFrequency} readOnly />
        <div className={styles.frequencyPills} role="group" aria-label="Pay frequency">
          {(
            [
              { value: "monthly" as PayFrequency, label: "Monthly (12/yr)" },
              { value: "biweekly" as PayFrequency, label: "Bi-weekly (26/yr)" },
            ] as const
          ).map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`${styles.pill} ${inputs.payFrequency === opt.value ? styles.pillActive : ""}`}
              aria-pressed={inputs.payFrequency === opt.value}
              onClick={() => onChange({ payFrequency: opt.value })}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="field">
        <label htmlFor="thp-filing">Tax filing status</label>
        <select
          id="thp-filing"
          data-input-bind="thp_filing"
          value={inputs.filingStatus}
          onChange={(e) => onChange({ filingStatus: e.target.value as TaxFilingStatus })}
        >
          {FILING_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="thp-state">State / local tax (estimated %)</label>
        <div className="input-with-suffix">
          <input
            id="thp-state"
            type="number"
            min={0}
            max={20}
            step={0.1}
            data-input-bind="thp_state"
            value={inputs.stateLocalTaxPercent}
            onChange={(e) => onChange({ stateLocalTaxPercent: Number(e.target.value) })}
          />
          <span>%</span>
        </div>
        <span style={{ fontSize: "var(--cn-text-xs)", color: "var(--cn-text-tertiary)" }}>
          Flat effective rate for planning—not itemized state rules.
        </span>
      </div>
    </form>
  );
}
