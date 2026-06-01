import type { jsPDF } from 'jspdf';
import promoConfig from '../../data/pdf-joinmypdf-promo.json';

export type PdfJoinMyPdfPromoConfig = typeof promoConfig;

export const JOINMYPDF_PROMO: PdfJoinMyPdfPromoConfig = promoConfig;

export type PdfPromoTheme = {
  partnerHeader: readonly [number, number, number];
  link: readonly [number, number, number];
  text: readonly [number, number, number];
  muted: readonly [number, number, number];
  white: readonly [number, number, number];
  cardBg: readonly [number, number, number];
  cardBorder: readonly [number, number, number];
  footerBg: readonly [number, number, number];
};

const PAGE_W = 210;
const MARGIN = 14;
const CONTENT_RIGHT = PAGE_W - MARGIN;
const CONTENT_W = CONTENT_RIGHT - MARGIN;

function drawToolLink(
  doc: jsPDF,
  label: string,
  url: string,
  x: number,
  y: number,
  linkColor: readonly [number, number, number]
) {
  const text = `• ${label}`;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(linkColor[0], linkColor[1], linkColor[2]);
  doc.textWithLink(text, x, y, { url });
  return y + 5;
}

function drawPromoCard(
  doc: jsPDF,
  section: PdfJoinMyPdfPromoConfig['sections'][number],
  x: number,
  y: number,
  w: number,
  theme: PdfPromoTheme
) {
  const tools = section.tools || [];
  const cardH = 14 + tools.length * 5 + 2;

  doc.setFillColor(...theme.cardBg);
  doc.setDrawColor(...theme.cardBorder);
  doc.setLineWidth(0.2);
  doc.roundedRect(x, y, w, cardH, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...theme.link);
  doc.text(section.title, x + 4, y + 8);

  let ty = y + 14;
  tools.forEach((tool) => {
    ty = drawToolLink(doc, tool.label, tool.url, x + 4, ty, theme.link);
  });

  return y + cardH;
}

/** Final page appended to every calculator PDF export. */
export function drawJoinMyPdfPromoPage(doc: jsPDF, theme: PdfPromoTheme) {
  const cfg = JOINMYPDF_PROMO;
  doc.addPage();

  const headerH = 28;
  doc.setFillColor(...theme.partnerHeader);
  doc.rect(0, 0, PAGE_W, headerH, 'F');

  doc.setTextColor(...theme.white);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(cfg.headerTitle, MARGIN, 17);

  let y = headerH + 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...theme.muted);
  const taglineLines = doc.splitTextToSize(cfg.tagline, CONTENT_W);
  doc.text(taglineLines, MARGIN, y);
  y += taglineLines.length * 5 + 10;

  const colGap = 6;
  const colW = (CONTENT_W - colGap) / 2;
  const leftX = MARGIN;
  const rightX = MARGIN + colW + colGap;

  const leftCardBottom = drawPromoCard(doc, cfg.sections[0], leftX, y, colW, theme);
  const rightCardBottom = drawPromoCard(doc, cfg.sections[1], rightX, y, colW, theme);
  y = Math.max(leftCardBottom, rightCardBottom) + 12;

  const footerH = 22;
  doc.setFillColor(...theme.footerBg);
  doc.setDrawColor(...theme.cardBorder);
  doc.roundedRect(MARGIN, y, CONTENT_W, footerH, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...theme.link);
  doc.text(cfg.footer.title, PAGE_W / 2, y + 9, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...theme.text);
  const cta = `Visit ${cfg.footer.linkLabel} for dozens of free PDF utilities.`;
  const ctaW = doc.getTextWidth(cta);
  doc.textWithLink(cta, (PAGE_W - ctaW) / 2, y + 17, { url: cfg.footer.linkUrl });
}
