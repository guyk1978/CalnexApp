"use client";

import type { BuyInputs, RentInputs } from "@/lib/rent-vs-buy";

type InputPanelProps = {
  rent: RentInputs;
  buy: BuyInputs;
  horizonYears: number;
  onRentChange: (patch: Partial<RentInputs>) => void;
  onBuyChange: (patch: Partial<BuyInputs>) => void;
  onHorizonChange: (years: number) => void;
};

function NumberField({
  id,
  label,
  value,
  onChange,
  min,
  max,
  step,
  prefix,
  suffix,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  prefix?: string;
  suffix?: string;
}) {
  const input = (
    <input
      id={id}
      type="number"
      value={Number.isFinite(value) ? value : 0}
      min={min}
      max={max}
      step={step ?? 1}
      onChange={(e) => onChange(Number(e.target.value))}
    />
  );

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {prefix ? (
        <div className="input-with-prefix">
          <span>{prefix}</span>
          {input}
        </div>
      ) : (
        input
      )}
      {suffix ? (
        <span style={{ fontSize: "var(--cn-text-xs)", color: "var(--cn-text-tertiary)" }}>{suffix}</span>
      ) : null}
    </div>
  );
}

export function InputPanel({
  rent,
  buy,
  horizonYears,
  onRentChange,
  onBuyChange,
  onHorizonChange,
}: InputPanelProps) {
  return (
    <form className="card input-card" aria-label="Rent vs buy calculator form" onSubmit={(e) => e.preventDefault()}>
      <header className="cn-calc-form__head">
        <h2 className="cn-calc-form__title">Scenario inputs</h2>
        <p className="cn-calc-form__lede muted">Adjust rent, purchase, and macro assumptions—the results update as you type.</p>
      </header>

      <fieldset className="cn-calc-fieldset">
        <legend className="cn-calc-fieldset__legend">Renting variables</legend>
        <NumberField
          id="monthlyRent"
          label="Monthly rent"
          prefix="$"
          value={rent.monthlyRent}
          min={0}
          step={50}
          onChange={(v) => onRentChange({ monthlyRent: v })}
        />
        <NumberField
          id="rentInsurance"
          label="Renter insurance (monthly)"
          prefix="$"
          value={rent.rentInsurance}
          min={0}
          step={5}
          onChange={(v) => onRentChange({ rentInsurance: v })}
        />
        <NumberField
          id="annualRentIncreasePct"
          label="Expected annual rent increase"
          suffix="% per year"
          value={rent.annualRentIncreasePct}
          min={0}
          max={20}
          step={0.1}
          onChange={(v) => onRentChange({ annualRentIncreasePct: v })}
        />
      </fieldset>

      <fieldset className="cn-calc-fieldset">
        <legend className="cn-calc-fieldset__legend">Buying variables</legend>
        <NumberField
          id="homePrice"
          label="Home price"
          prefix="$"
          value={buy.homePrice}
          min={0}
          step={5000}
          onChange={(v) => onBuyChange({ homePrice: v })}
        />
        <NumberField
          id="downPaymentPct"
          label="Down payment"
          suffix="% of home price"
          value={buy.downPaymentPct}
          min={0}
          max={100}
          step={0.5}
          onChange={(v) => onBuyChange({ downPaymentPct: v })}
        />
        <NumberField
          id="interestRatePct"
          label="Mortgage interest rate"
          suffix="% APR"
          value={buy.interestRatePct}
          min={0}
          max={25}
          step={0.01}
          onChange={(v) => onBuyChange({ interestRatePct: v })}
        />
        <NumberField
          id="loanTermYears"
          label="Loan term"
          suffix="years"
          value={buy.loanTermYears}
          min={5}
          max={40}
          step={1}
          onChange={(v) => onBuyChange({ loanTermYears: v })}
        />
        <NumberField
          id="propertyTaxPct"
          label="Property tax"
          suffix="% of home value / year"
          value={buy.propertyTaxPct}
          min={0}
          max={10}
          step={0.1}
          onChange={(v) => onBuyChange({ propertyTaxPct: v })}
        />
        <NumberField
          id="maintenancePct"
          label="Maintenance & repairs"
          suffix="% of home value / year"
          value={buy.maintenancePct}
          min={0}
          max={10}
          step={0.1}
          onChange={(v) => onBuyChange({ maintenancePct: v })}
        />
        <NumberField
          id="annualAppreciationPct"
          label="Expected home appreciation"
          suffix="% per year"
          value={buy.annualAppreciationPct}
          min={-5}
          max={20}
          step={0.1}
          onChange={(v) => onBuyChange({ annualAppreciationPct: v })}
        />
      </fieldset>

      <fieldset className="cn-calc-fieldset">
        <legend className="cn-calc-fieldset__legend">Macro variables</legend>
        <NumberField
          id="horizonYears"
          label="Comparison timeline"
          suffix="years (10–30)"
          value={horizonYears}
          min={10}
          max={30}
          step={1}
          onChange={onHorizonChange}
        />
        <NumberField
          id="investmentReturnPct"
          label="Investment return (opportunity cost)"
          suffix="% annual return if renting & investing down payment"
          value={rent.investmentReturnPct}
          min={0}
          max={20}
          step={0.1}
          onChange={(v) => onRentChange({ investmentReturnPct: v })}
        />
      </fieldset>
    </form>
  );
}
