/**
 * Client-side calculator report PDF (runs in the browser; no upload).
 */
const CalnexPdfReportGenerator = (() => {
  const PAGE_W = 210;
  const MARGIN = 14;
  const CONTENT_RIGHT = PAGE_W - MARGIN;
  const CONTENT_W = CONTENT_RIGHT - MARGIN;
  const PAGE_BOTTOM = 268;
  const HEADER_H = 34;
  const ROW_H = 9;

  /** Finance-oriented palette (navy + forest accent) */
  const THEME = {
    header: [27, 58, 95],
    headerSub: [220, 228, 238],
    inputsAccent: [45, 106, 168],
    resultsAccent: [36, 107, 86],
    text: [30, 41, 59],
    label: [51, 65, 85],
    value: [15, 23, 42],
    valueHighlight: [27, 58, 95],
    muted: [100, 116, 139],
    white: [255, 255, 255],
    rowAlt: [248, 250, 252],
    rowHighlight: [236, 242, 249],
    calloutBg: [232, 240, 248],
    calloutText: [45, 106, 168],
    border: [226, 232, 240]
  };

  const loadJsPDF = () => {
    if (window.jspdf?.jsPDF) {
      return Promise.resolve(window.jspdf.jsPDF);
    }

    const existing = document.querySelector('script[data-cn-jspdf="1"]');
    if (existing) {
      return new Promise((resolve, reject) => {
        const done = () => {
          if (window.jspdf?.jsPDF) resolve(window.jspdf.jsPDF);
          else reject(new Error("jsPDF failed to load"));
        };
        existing.addEventListener("load", done, { once: true });
        existing.addEventListener("error", () => reject(new Error("jsPDF failed to load")), {
          once: true
        });
      });
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      const src =
        typeof CalnexPath === "function"
          ? CalnexPath("/assets/js/vendor/jspdf.umd.min.js")
          : "/assets/js/vendor/jspdf.umd.min.js";
      script.src = src;
      script.defer = true;
      script.dataset.cnJspdf = "1";
      script.onload = () => {
        if (window.jspdf?.jsPDF) resolve(window.jspdf.jsPDF);
        else reject(new Error("jsPDF failed to load"));
      };
      script.onerror = () => reject(new Error("jsPDF failed to load"));
      document.head.appendChild(script);
    });
  };

  const safeFilename = (name) => {
    const base = String(name || "calnexapp-calculator")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return `${base || "calnexapp-calculator"}-report.pdf`;
  };

  /** Helvetica / WinAnsi: replace currency symbols that render as garbage */
  const sanitizePdfText = (text) => {
    return String(text ?? "")
      .replace(/\u20AA/g, "ILS ")
      .replace(/\u20BD/g, "RUB ")
      .replace(/\u20AC/g, "EUR ")
      .replace(/\u00A3/g, "GBP ")
      .replace(/[\u0000-\u001f\u007f-\u009f]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  };

  const continuationY = () => MARGIN + 6;

  const ensureSpace = (doc, y, blockHeight) => {
    if (y + blockHeight <= PAGE_BOTTOM) return y;
    doc.addPage();
    return continuationY();
  };

  const drawPageHeader = (doc, title, subtitle) => {
    doc.setFillColor(...THEME.header);
    doc.rect(0, 0, PAGE_W, HEADER_H, "F");

    doc.setTextColor(...THEME.white);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(19);
    doc.text(sanitizePdfText(title), MARGIN, 15);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...THEME.headerSub);
    doc.text(sanitizePdfText(subtitle), MARGIN, 23);

    return HEADER_H + 10;
  };

  const drawSectionTitle = (doc, title, accentRgb, y) => {
    y = ensureSpace(doc, y, 16);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(...THEME.text);
    doc.text(title, MARGIN, y);

    y += 3;
    doc.setDrawColor(...accentRgb);
    doc.setLineWidth(0.55);
    doc.line(MARGIN, y, CONTENT_RIGHT, y);

    return y + 7;
  };

  const measureRow = (doc, label, value, highlight) => {
    const pad = highlight ? 2 : 0;
    const labelW = CONTENT_W * 0.52 - pad;
    const valueW = CONTENT_W * 0.46;
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    const labelLines = doc.splitTextToSize(sanitizePdfText(label), labelW);
    doc.setFont("helvetica", highlight ? "bold" : "normal");
    const valueLines = doc.splitTextToSize(sanitizePdfText(value), valueW);
    const lines = Math.max(labelLines.length, valueLines.length, 1);
    return { labelLines, valueLines, rowHeight: Math.max(ROW_H, lines * 4.8 + 3), highlight };
  };

  const drawKvRow = (doc, label, value, y, options = {}) => {
    const { labelLines, valueLines, rowHeight, highlight } = measureRow(
      doc,
      label,
      value,
      options.highlight
    );
    y = ensureSpace(doc, y, rowHeight + 2);

    const boxY = y - 5;
    if (highlight) {
      doc.setFillColor(...THEME.rowHighlight);
      doc.roundedRect(MARGIN, boxY, CONTENT_W, rowHeight, 2, 2, "F");
    } else if (options.alt) {
      doc.setFillColor(...THEME.rowAlt);
      doc.roundedRect(MARGIN, boxY, CONTENT_W, rowHeight, 1.5, 1.5, "F");
    }

    const labelX = MARGIN + (highlight ? 3 : 2);
    const valueX = CONTENT_RIGHT - (highlight ? 3 : 2);
    const textY = y;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...THEME.label);
    doc.text(labelLines, labelX, textY);

    doc.setFont("helvetica", highlight ? "bold" : "normal");
    doc.setFontSize(10);
    doc.setTextColor(...(highlight ? THEME.valueHighlight : THEME.value));
    doc.text(valueLines, valueX, textY, { align: "right" });

    return y + rowHeight + 1.5;
  };

  const drawSection = (doc, title, entries, accentRgb, startY, options = {}) => {
    const rows = Object.entries(entries || {}).filter(([, value]) =>
      sanitizePdfText(value)
    );
    if (!rows.length) return startY;

    let y = drawSectionTitle(doc, title, accentRgb, startY);

    rows.forEach(([label, value], index) => {
      const highlight = options.highlightFirst && index === 0;
      const alt = !highlight && index % 2 === 1;
      y = drawKvRow(doc, label, value, y, { highlight, alt });
    });

    return y + 6;
  };

  const drawCallout = (doc, y) => {
    const boxH = 16;
    y = ensureSpace(doc, y, boxH + 12);

    doc.setFillColor(...THEME.calloutBg);
    doc.setDrawColor(...THEME.border);
    doc.setLineWidth(0.2);
    doc.roundedRect(MARGIN, y, CONTENT_W, boxH, 3, 3, "FD");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...THEME.calloutText);
    doc.text(
      "Generated automatically by CalnexApp Financial Calculators",
      PAGE_W / 2,
      y + 10,
      { align: "center" }
    );

    return y + boxH + 10;
  };

  const getPromoConfig = () => {
    if (typeof window !== "undefined" && window.CalnexPdfJoinMyPdfPromo) {
      return window.CalnexPdfJoinMyPdfPromo;
    }
    return null;
  };

  const drawToolLink = (doc, label, url, x, y) => {
    const text = `• ${sanitizePdfText(label)}`;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(...THEME.calloutText);
    doc.textWithLink(text, x, y, { url });
    return y + 5;
  };

  const drawPromoCard = (doc, section, x, y, w) => {
    const tools = section.tools || [];
    const cardH = 14 + tools.length * 5 + 2;

    doc.setFillColor(...THEME.rowAlt);
    doc.setDrawColor(...THEME.border);
    doc.setLineWidth(0.2);
    doc.roundedRect(x, y, w, cardH, 2, 2, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...THEME.calloutText);
    doc.text(sanitizePdfText(section.title), x + 4, y + 8);

    let ty = y + 14;
    tools.forEach((tool) => {
      ty = drawToolLink(doc, tool.label, tool.url, x + 4, ty);
    });

    return y + cardH;
  };

  const drawJoinMyPdfPromoPage = (doc) => {
    const cfg = getPromoConfig();
    if (!cfg || !cfg.sections?.length) return;

    doc.addPage();

    const headerH = 28;
    doc.setFillColor(...THEME.inputsAccent);
    doc.rect(0, 0, PAGE_W, headerH, "F");

    doc.setTextColor(...THEME.white);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(sanitizePdfText(cfg.headerTitle || "Explore More PDF Tools"), MARGIN, 17);

    let y = headerH + 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...THEME.muted);
    const taglineLines = doc.splitTextToSize(sanitizePdfText(cfg.tagline || ""), CONTENT_W);
    doc.text(taglineLines, MARGIN, y);
    y += taglineLines.length * 5 + 10;

    const colGap = 6;
    const colW = (CONTENT_W - colGap) / 2;
    const leftX = MARGIN;
    const rightX = MARGIN + colW + colGap;

    const leftBottom = drawPromoCard(doc, cfg.sections[0], leftX, y, colW);
    const rightBottom = cfg.sections[1]
      ? drawPromoCard(doc, cfg.sections[1], rightX, y, colW)
      : y;
    y = Math.max(leftBottom, rightBottom) + 12;

    const footerH = 22;
    doc.setFillColor(...THEME.calloutBg);
    doc.setDrawColor(...THEME.border);
    doc.roundedRect(MARGIN, y, CONTENT_W, footerH, 3, 3, "FD");

    const footer = cfg.footer || {};
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...THEME.calloutText);
    doc.text(sanitizePdfText(footer.title || "Need more PDF tools?"), PAGE_W / 2, y + 9, {
      align: "center"
    });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(...THEME.text);
    const linkLabel = footer.linkLabel || "JoinMyPDF.com";
    const cta = sanitizePdfText(`Visit ${linkLabel} for dozens of free PDF utilities.`);
    const ctaW = doc.getTextWidth(cta);
    doc.textWithLink(cta, (PAGE_W - ctaW) / 2, y + 17, {
      url: footer.linkUrl || cfg.siteUrl || "https://joinmypdf.com/"
    });
  };

  const drawPageFooters = (doc, generatedAt) => {
    const pageCount = doc.getNumberOfPages();
    for (let page = 1; page <= pageCount; page += 1) {
      doc.setPage(page);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...THEME.muted);
      doc.text(`Generated by CalnexApp · calnexapp.com · ${generatedAt}`, MARGIN, 292);
      doc.text(`Page ${page} of ${pageCount}`, CONTENT_RIGHT, 292, { align: "right" });
    }
  };

  const buildDocument = async (data) => {
    const jsPDF = await loadJsPDF();
    const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });

    const title = data.calculatorName || "CalnexApp Calculator";
    const subtitle = "Financial calculator report";
    const generatedAt = new Date().toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short"
    });

    let y = drawPageHeader(doc, title, subtitle);

    y = drawSection(doc, "Inputs", data.inputs, THEME.inputsAccent, y);
    y = drawSection(doc, "Results", data.results, THEME.resultsAccent, y, {
      highlightFirst: true
    });

    if (!Object.keys(data.inputs || {}).length && !Object.keys(data.results || {}).length) {
      y = ensureSpace(doc, y, 12);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(10);
      doc.setTextColor(...THEME.muted);
      doc.text(
        "No calculator values were captured. Run the calculator and try again.",
        MARGIN,
        y
      );
      y += 10;
    }

    drawCallout(doc, y);
    drawJoinMyPdfPromoPage(doc);
    drawPageFooters(doc, generatedAt);

    return doc;
  };

  const download = async (data) => {
    const doc = await buildDocument(data);
    doc.save(safeFilename(data.calculatorName));
  };

  const toBlob = async (data) => {
    const doc = await buildDocument(data);
    return doc.output("blob");
  };

  return { download, toBlob, buildDocument, safeFilename, sanitizePdfText, THEME };
})();

window.CalnexPdfReportGenerator = CalnexPdfReportGenerator;
