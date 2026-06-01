/**
 * CSV download for calculator pages — register per data-page or export from a table.
 */
const CalnexCsvExport = (() => {
  const providers = new Map();

  const escapeCell = (value) => {
    const s = String(value ?? "").replace(/"/g, '""');
    return /[",\n\r]/.test(s) ? `"${s}"` : s;
  };

  const toCsvLine = (cells) => cells.map(escapeCell).join(",");

  const download = (filename, csvText) => {
    const blob = new Blob([csvText], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename || "calnexapp-export.csv";
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const tableToCsv = (tableEl) => {
    if (!tableEl) return "";
    const lines = [];
    const thead = tableEl.querySelector("thead");
    if (thead) {
      thead.querySelectorAll("tr").forEach((tr) => {
        const cells = Array.from(tr.querySelectorAll("th,td")).map((c) => c.textContent.trim());
        if (cells.length) lines.push(toCsvLine(cells));
      });
    }
    const body = tableEl.tBodies?.[0] || tableEl.querySelector("tbody");
    if (body) {
      body.querySelectorAll("tr").forEach((tr) => {
        const cells = Array.from(tr.querySelectorAll("th,td")).map((c) => c.textContent.trim());
        if (cells.length) lines.push(toCsvLine(cells));
      });
    }
    return lines.join("\n");
  };

  const register = (pageKey, provider) => {
    if (!pageKey || typeof provider !== "function") return;
    providers.set(pageKey, provider);
  };

  const exportForPage = (pageKey, triggerEl) => {
    const tableSel = triggerEl?.getAttribute?.("data-cn-csv-table");
    if (tableSel) {
      const table = document.querySelector(tableSel);
      const csv = tableToCsv(table);
      if (!csv.trim()) return false;
      const name =
        triggerEl.getAttribute("data-cn-csv-filename") ||
        `${pageKey || "calculator"}-export.csv`;
      download(name, csv);
      return true;
    }

    const provider = providers.get(pageKey);
    if (!provider) return false;
    const result = provider();
    if (!result?.csv) return false;
    download(result.filename || `${pageKey}-export.csv`, result.csv);
    return true;
  };

  return { register, download, tableToCsv, toCsvLine, escapeCell, exportForPage };
})();

window.CalnexCsvExport = CalnexCsvExport;
