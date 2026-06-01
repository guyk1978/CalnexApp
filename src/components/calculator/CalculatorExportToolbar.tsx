"use client";

import { PdfExportButton } from "@/components/PdfExportButton";
import { ShareMenu } from "./ShareMenu";

type CalculatorExportToolbarProps = {
  calculatorName: string;
  shareUrl: string;
  shareMessage: string;
  pdfInputs: Record<string, string>;
  pdfResults: Record<string, string>;
  shareUrlInputId?: string;
};

export function CalculatorExportToolbar({
  calculatorName,
  shareUrl,
  shareMessage,
  pdfInputs,
  pdfResults,
  shareUrlInputId,
}: CalculatorExportToolbarProps) {
  return (
    <div
      className="cn-pdf-export-wrap"
      style={{ margin: "0.75rem 0 1rem", display: "flex", flexWrap: "wrap", gap: "0.5rem" }}
    >
      <ShareMenu
        shareUrl={shareUrl}
        shareMessage={shareMessage}
        calculatorTitle={calculatorName}
        urlInputId={shareUrlInputId}
      />
      <PdfExportButton calculatorName={calculatorName} inputs={pdfInputs} results={pdfResults} />
    </div>
  );
}
