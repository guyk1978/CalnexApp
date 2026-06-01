"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ExportSharePanel } from "@/components/calculator/ExportSharePanel";
import {
  computeTakeHomePay,
  DEFAULT_TAKE_HOME_INPUTS,
  type TakeHomePayInputs,
  type TakeHomePayResult,
} from "@/lib/take-home-pay";
import { useSiteCurrency } from "@/hooks/useSiteCurrency";
import { buildTakeHomePayPdfPayload } from "@/lib/take-home-pay/pdf-export";
import { buildTakeHomePayShareMessage } from "@/lib/take-home-pay/share-message";
import {
  buildTakeHomePayShareUrl,
  TAKE_HOME_PAY_CANONICAL_ORIGIN,
} from "@/lib/take-home-pay/share-url";
import { InputPanel } from "./InputPanel";
import { ResultsDashboard } from "./ResultsDashboard";
import styles from "./take-home-pay.module.css";

const CALCULATOR_NAME = "Take-Home Pay Calculator";
const PAGE_KEY = "take-home-pay-calculator";

function parseInputsFromSearch(): Partial<TakeHomePayInputs> | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  if (!params.toString()) return null;
  const patch: Partial<TakeHomePayInputs> = {};
  const gross = params.get("thp_gross");
  if (gross) patch.grossAnnualSalary = Number(gross);
  const freq = params.get("thp_freq");
  if (freq === "monthly" || freq === "biweekly") patch.payFrequency = freq;
  const filing = params.get("thp_filing");
  if (
    filing === "single" ||
    filing === "married_joint" ||
    filing === "married_separate" ||
    filing === "head_of_household"
  ) {
    patch.filingStatus = filing;
  }
  const state = params.get("thp_state");
  if (state) patch.stateLocalTaxPercent = Number(state);
  return Object.keys(patch).length ? patch : null;
}

function buildCsv(result: TakeHomePayResult, inputs: TakeHomePayInputs): string {
  const rows = [
    ["Field", "Value"],
    ["Gross annual", String(result.grossAnnual)],
    ["Federal tax", String(result.taxes.federal)],
    ["FICA", String(result.taxes.fica)],
    ["State/local", String(result.taxes.stateLocal)],
    ["Net annual", String(result.netAnnual)],
    ["Monthly net", String(result.takeHome.monthly)],
    ["Weekly net", String(result.takeHome.weekly)],
    ["Pay frequency", inputs.payFrequency],
    ["Filing status", inputs.filingStatus],
    ["State/local %", String(inputs.stateLocalTaxPercent)],
  ];
  return rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
}

export function TakeHomePayCalculator() {
  const { formatMoney } = useSiteCurrency();
  const [inputs, setInputs] = useState<TakeHomePayInputs>({ ...DEFAULT_TAKE_HOME_INPUTS });
  const [shareOrigin, setShareOrigin] = useState(TAKE_HOME_PAY_CANONICAL_ORIGIN);
  const shellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const patch = parseInputsFromSearch();
    if (patch) setInputs((prev) => ({ ...prev, ...patch }));
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setShareOrigin(window.location.origin);
    }
  }, []);

  useEffect(() => {
    const el = shellRef.current;
    if (!el) return;
    el.setAttribute("data-cn-react-calculator", "true");
    return () => {
      el.removeAttribute("data-cn-react-calculator");
    };
  }, []);

  const result = useMemo(() => computeTakeHomePay(inputs), [inputs]);

  const pdfPayload = useMemo(
    () => buildTakeHomePayPdfPayload(inputs, result, formatMoney),
    [inputs, result, formatMoney]
  );

  const shareUrl = useMemo(() => buildTakeHomePayShareUrl(inputs, shareOrigin), [inputs, shareOrigin]);
  const shareMessage = useMemo(
    () => buildTakeHomePayShareMessage(inputs, result, formatMoney),
    [inputs, result, formatMoney]
  );

  const calcKey = useMemo(
    () =>
      [
        inputs.grossAnnualSalary,
        inputs.payFrequency,
        inputs.filingStatus,
        inputs.stateLocalTaxPercent,
      ].join("|"),
    [inputs]
  );

  const handleCsv = useCallback(() => {
    const csv = buildCsv(result, inputs);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "take-home-pay-summary.csv";
    a.click();
    URL.revokeObjectURL(url);
  }, [inputs, result]);

  return (
    <div className="cn-tool-shell" ref={shellRef}>
      <section className={`calculator-layout cn-calculator-layout ${styles.layout}`}>
        <InputPanel inputs={inputs} onChange={(patch) => setInputs((prev) => ({ ...prev, ...patch }))} />
        <aside className={`card output-card cn-tool-rail ${styles.rail}`} aria-live="polite">
          <h2>Results</h2>
          <ResultsDashboard result={result} payFrequency={inputs.payFrequency} calcKey={calcKey} />
          <ExportSharePanel
            calculatorName={CALCULATOR_NAME}
            pageKey={PAGE_KEY}
            shareUrl={shareUrl}
            shareMessage={shareMessage}
            pdfInputs={pdfPayload.inputs}
            pdfResults={pdfPayload.results}
            shareUrlInputId="cnShareUrl-take-home-pay-calculator"
            onCopyCsv={handleCsv}
          />
        </aside>
      </section>
    </div>
  );
}
