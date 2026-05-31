"use client";

import { useMemo, useState } from "react";
import {
  computeRentVsBuy,
  DEFAULT_BUY_INPUTS,
  DEFAULT_HORIZON_YEARS,
  DEFAULT_RENT_INPUTS,
} from "@/lib/rent-vs-buy";
import type { BuyInputs, RentInputs } from "@/lib/rent-vs-buy";
import { PdfExportButton } from "@/components/PdfExportButton";
import { buildRentVsBuyPdfPayload } from "@/lib/rent-vs-buy/pdf-export";
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

  const pdfPayload = useMemo(
    () => buildRentVsBuyPdfPayload(rent, buy, horizonYears, result),
    [rent, buy, horizonYears, result]
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
        <div className={styles.resultsColumn}>
          <ResultsPanel result={result} />
          <div className={styles.pdfExportRow}>
            <PdfExportButton
              calculatorName="Rent vs. Buy Calculator"
              inputs={pdfPayload.inputs}
              results={pdfPayload.results}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
