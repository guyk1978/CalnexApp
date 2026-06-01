"use client";

import { useCallback, useState } from "react";

export type PdfExportButtonProps = {
  calculatorName: string;
  inputs: Record<string, string>;
  results: Record<string, string>;
  pageKey?: string;
  className?: string;
  variant?: "primary" | "ghost";
  onToast?: (message: string, isError?: boolean) => void;
};

const PDF_ICON = (
  <svg
    className="cn-pdf-export-btn__icon cn-theme-icon"
    viewBox="0 0 24 24"
    width="18"
    height="18"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

export function PdfExportButton({
  calculatorName,
  inputs,
  results,
  pageKey,
  className = "",
  variant = "ghost",
  onToast,
}: PdfExportButtonProps) {
  const [loading, setLoading] = useState(false);
  const resolvedPageKey = pageKey ?? "";

  const notify = useCallback(
    (message: string, isError = false) => {
      if (onToast) {
        onToast(message, isError);
        return;
      }
      if (isError) {
        console.warn(message);
      }
    },
    [onToast]
  );

  const handleClick = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    try {
      const { exportToPdf } = await import("@/lib/pdf-export");
      await exportToPdf({ calculatorName, inputs, results });
      notify("PDF downloaded");
    } catch {
      notify("PDF generation failed. Please try again.", true);
    } finally {
      setLoading(false);
    }
  }, [calculatorName, inputs, results, loading, notify]);

  const variantClass = variant === "primary" ? "btn btn-primary" : "btn btn-ghost";

  return (
    <button
      type="button"
      className={`cn-pdf-export-btn ${variantClass} ${className}`.trim()}
      data-cn-pdf-export
      data-page-key={resolvedPageKey}
      data-calculator-name={calculatorName}
      onClick={() => void handleClick()}
      disabled={loading}
      aria-busy={loading}
      aria-label={loading ? "Generating PDF report" : "Export results to PDF"}
    >
      {PDF_ICON}
      <span className="cn-pdf-export-btn__label">{loading ? "Generating…" : "Export PDF"}</span>
    </button>
  );
}
