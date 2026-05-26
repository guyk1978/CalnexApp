"use client";

import { useMemo, useState } from "react";
import {
  computeRentVsBuy,
  DEFAULT_BUY_INPUTS,
  DEFAULT_HORIZON_YEARS,
  DEFAULT_RENT_INPUTS,
} from "@/lib/rent-vs-buy";
import type { BuyInputs, RentInputs } from "@/lib/rent-vs-buy";
import { InputPanel } from "./InputPanel";
import { ResultsPanel } from "./ResultsPanel";
import styles from "./rent-vs-buy.module.css";

export function RentVsBuyCalculator() {
  const [rent, setRent] = useState<RentInputs>({ ...DEFAULT_RENT_INPUTS });
  const [buy, setBuy] = useState<BuyInputs>({ ...DEFAULT_BUY_INPUTS });
  const [horizonYears, setHorizonYears] = useState(DEFAULT_HORIZON_YEARS);

  const result = useMemo(
    () =>
      computeRentVsBuy({
        rent,
        buy,
        horizonYears,
      }),
    [rent, buy, horizonYears]
  );

  return (
    <div className={styles.shell}>
      <section className={styles.layout}>
        <InputPanel
          rent={rent}
          buy={buy}
          horizonYears={horizonYears}
          onRentChange={(patch) => setRent((prev) => ({ ...prev, ...patch }))}
          onBuyChange={(patch) => setBuy((prev) => ({ ...prev, ...patch }))}
          onHorizonChange={setHorizonYears}
        />
        <ResultsPanel result={result} />
      </section>
    </div>
  );
}
