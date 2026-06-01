import { jsPDF } from 'jspdf';
import { drawJoinMyPdfPromoPage } from '@/lib/pdf-joinmypdf-promo';

export type PdfReportData = {
  calculatorName: string;
  inputs: Record<string, string>;
  results: Record<string, string>;
};

const PAGE_W = 210;
const MARGIN = 14;
const CONTENT_RIGHT = PAGE_W - MARGIN;
const CONTENT_W = CONTENT_RIGHT - MARGIN;
const PAGE_BOTTOM = 268;
const HEADER_H = 34;
const ROW_H = 9;

const THEME = {
  header: [27, 58, 95] as const,
  headerSub: [220, 228, 238] as const,
  inputsAccent: [45, 106, 168] as const,
  resultsAccent: [36, 107, 86] as const,
  text: [30, 41, 59] as const,
  label: [51, 65, 85] as const,
  value: [15, 23, 42] as const,
  valueHighlight: [27, 58, 95] as const,
  muted: [100, 116, 139] as const,
  white: [255, 255, 255] as const,
  rowAlt: [248, 250, 252] as const,
  rowHighlight: [236, 242, 249] as const,
  calloutBg: [232, 240, 248] as const,
  calloutText: [45, 106, 168] as const,
  border: [226, 232, 240] as const,
};

function safeFilename(name: string) {
  const base = String(name || 'calnexapp-calculator')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${base || 'calnexapp-calculator'}-report.pdf`;
}

function sanitizePdfText(text: unknown) {
  return String(text ?? '')
    .replace(/\u20AA/g, 'ILS ')
    .replace(/\u20BD/g, 'RUB ')
    .replace(/\u20AC/g, 'EUR ')
    .replace(/\u00A3/g, 'GBP ')
    .replace(/[\u0000-\u001f\u007f-\u009f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function continuationY() {
  return MARGIN + 6;
}

function ensureSpace(doc: jsPDF, y: number, blockHeight: number) {
  if (y + blockHeight <= PAGE_BOTTOM) return y;
  doc.addPage();
  return continuationY();
}

function drawPageHeader(doc: jsPDF, title: string, subtitle: string) {
  doc.setFillColor(...THEME.header);
  doc.rect(0, 0, PAGE_W, HEADER_H, 'F');

  doc.setTextColor(...THEME.white);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(19);
  doc.text(sanitizePdfText(title), MARGIN, 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...THEME.headerSub);
  doc.text(sanitizePdfText(subtitle), MARGIN, 23);

  return HEADER_H + 10;
}

function drawSectionTitle(
  doc: jsPDF,
  title: string,
  accentRgb: readonly [number, number, number],
  y: number
) {
  y = ensureSpace(doc, y, 16);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...THEME.text);
  doc.text(title, MARGIN, y);

  y += 3;
  doc.setDrawColor(...accentRgb);
  doc.setLineWidth(0.55);
  doc.line(MARGIN, y, CONTENT_RIGHT, y);

  return y + 7;
}

function measureRow(doc: jsPDF, label: string, value: string, highlight: boolean) {
  const labelW = CONTENT_W * 0.52 - (highlight ? 2 : 0);
  const valueW = CONTENT_W * 0.46;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  const labelLines = doc.splitTextToSize(sanitizePdfText(label), labelW);
  doc.setFont('helvetica', highlight ? 'bold' : 'normal');
  const valueLines = doc.splitTextToSize(sanitizePdfText(value), valueW);
  const lines = Math.max(labelLines.length, valueLines.length, 1);
  return {
    labelLines,
    valueLines,
    rowHeight: Math.max(ROW_H, lines * 4.8 + 3),
    highlight,
  };
}

function drawKvRow(
  doc: jsPDF,
  label: string,
  value: string,
  y: number,
  options: { highlight?: boolean; alt?: boolean } = {}
) {
  const { labelLines, valueLines, rowHeight, highlight } = measureRow(
    doc,
    label,
    value,
    Boolean(options.highlight)
  );
  y = ensureSpace(doc, y, rowHeight + 2);

  const boxY = y - 5;
  if (highlight) {
    doc.setFillColor(...THEME.rowHighlight);
    doc.roundedRect(MARGIN, boxY, CONTENT_W, rowHeight, 2, 2, 'F');
  } else if (options.alt) {
    doc.setFillColor(...THEME.rowAlt);
    doc.roundedRect(MARGIN, boxY, CONTENT_W, rowHeight, 1.5, 1.5, 'F');
  }

  const labelX = MARGIN + (highlight ? 3 : 2);
  const valueX = CONTENT_RIGHT - (highlight ? 3 : 2);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...THEME.label);
  doc.text(labelLines, labelX, y);

  doc.setFont('helvetica', highlight ? 'bold' : 'normal');
  doc.setFontSize(10);
  const valueRgb = highlight ? THEME.valueHighlight : THEME.value;
  doc.setTextColor(valueRgb[0], valueRgb[1], valueRgb[2]);
  doc.text(valueLines, valueX, y, { align: 'right' });

  return y + rowHeight + 1.5;
}

function drawSection(
  doc: jsPDF,
  title: string,
  entries: Record<string, string>,
  accentRgb: readonly [number, number, number],
  startY: number,
  options: { highlightFirst?: boolean } = {}
) {
  const rows = Object.entries(entries || {}).filter(([, value]) => sanitizePdfText(value));
  if (!rows.length) return startY;

  let y = drawSectionTitle(doc, title, accentRgb, startY);

  rows.forEach(([label, value], index) => {
    const highlight = Boolean(options.highlightFirst && index === 0);
    const alt = !highlight && index % 2 === 1;
    y = drawKvRow(doc, label, value, y, { highlight, alt });
  });

  return y + 6;
}

function drawCallout(doc: jsPDF, y: number) {
  const boxH = 16;
  y = ensureSpace(doc, y, boxH + 12);

  doc.setFillColor(...THEME.calloutBg);
  doc.setDrawColor(...THEME.border);
  doc.setLineWidth(0.2);
  doc.roundedRect(MARGIN, y, CONTENT_W, boxH, 3, 3, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...THEME.calloutText);
  doc.text(
    'Generated automatically by CalnexApp Financial Calculators',
    PAGE_W / 2,
    y + 10,
    { align: 'center' }
  );

  return y + boxH + 10;
}

function drawPageFooters(doc: jsPDF, generatedAt: string) {
  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...THEME.muted);
    doc.text(`Generated by CalnexApp · calnexapp.com · ${generatedAt}`, MARGIN, 292);
    doc.text(`Page ${page} of ${pageCount}`, CONTENT_RIGHT, 292, { align: 'right' });
  }
}

function buildReportDocument(data: PdfReportData) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });

  const title = data.calculatorName || 'CalnexApp Calculator';
  const subtitle = 'Financial calculator report';
  const generatedAt = new Date().toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  let y = drawPageHeader(doc, title, subtitle);

  y = drawSection(doc, 'Inputs', data.inputs, THEME.inputsAccent, y);
  y = drawSection(doc, 'Results', data.results, THEME.resultsAccent, y, {
    highlightFirst: true,
  });

  if (!Object.keys(data.inputs || {}).length && !Object.keys(data.results || {}).length) {
    y = ensureSpace(doc, y, 12);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    doc.setTextColor(...THEME.muted);
    doc.text(
      'No calculator values were captured. Run the calculator and try again.',
      MARGIN,
      y
    );
    y += 10;
  }

  drawCallout(doc, y);
  drawJoinMyPdfPromoPage(doc, {
    partnerHeader: THEME.inputsAccent,
    link: THEME.calloutText,
    text: THEME.text,
    muted: THEME.muted,
    white: THEME.white,
    cardBg: THEME.rowAlt,
    cardBorder: THEME.border,
    footerBg: THEME.calloutBg,
  });
  drawPageFooters(doc, generatedAt);

  return doc;
}

export async function exportToPdf(data: PdfReportData) {
  const doc = buildReportDocument(data);
  doc.save(safeFilename(data.calculatorName));
}
