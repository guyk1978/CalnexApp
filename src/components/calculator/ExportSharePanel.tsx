"use client";

import { PdfExportButton } from "@/components/PdfExportButton";
import { ShareMenu } from "./ShareMenu";

type ExportSharePanelProps = {
  calculatorName: string;
  shareUrl: string;
  shareMessage: string;
  pdfInputs: Record<string, string>;
  pdfResults: Record<string, string>;
  shareUrlInputId?: string;
  onCopyCsv?: () => void;
};

/**
 * Matches static calculator "Export & share" portable results box (loan calculator layout).
 */
export function ExportSharePanel({
  calculatorName,
  shareUrl,
  shareMessage,
  pdfInputs,
  pdfResults,
  shareUrlInputId = "cnShareUrl-inline",
  onCopyCsv,
}: ExportSharePanelProps) {
  return (
    <div className="share-tools cn-portable-results-box" data-cn-share>
      <h3>Export &amp; share</h3>
      <p className="muted cn-portable-results__lead">
        Download data or send a link that restores this calculation.
      </p>
      <div className="cn-export-share-toolbar">
        {onCopyCsv ? (
          <button type="button" className="btn btn-ghost" onClick={onCopyCsv}>
            Download CSV
          </button>
        ) : null}
        <PdfExportButton calculatorName={calculatorName} inputs={pdfInputs} results={pdfResults} />
        <ShareMenu
          shareUrl={shareUrl}
          shareMessage={shareMessage}
          calculatorTitle={calculatorName}
          urlInputId={shareUrlInputId}
          embedded
        />
      </div>
    </div>
  );
}
