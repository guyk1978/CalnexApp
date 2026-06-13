/**
 * Renders /site-inventory/ from data/site-inventory.json
 */
(() => {
  const els = {
    search: document.getElementById("invSearch"),
    typeFilter: document.getElementById("invTypeFilter"),
    tableBody: document.getElementById("invTableBody"),
    conflicts: document.getElementById("invConflicts"),
    counts: document.getElementById("invCounts"),
    updated: document.getElementById("invUpdated")
  };

  let inventory = null;

  const escapeHtml = (s) =>
    String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const renderCounts = (data) => {
    if (!els.counts) return;
    const c = data.counts;
    els.counts.innerHTML = `
      <span><strong>${c.total}</strong> URLs</span>
      <span><strong>${c.calculators}</strong> calculators</span>
      <span><strong>${c.blog}</strong> blog</span>
      <span><strong>${c.loanScenarios}</strong> loan scenarios</span>
      <span class="cn-inv-warn"><strong>${c.keywordConflicts}</strong> keyword overlaps</span>
    `;
    if (els.updated) {
      els.updated.textContent = `Updated ${new Date(data.generatedAt).toLocaleString()}`;
    }
  };

  const renderConflicts = (data) => {
    if (!els.conflicts) return;
    if (!data.conflicts?.length) {
      els.conflicts.innerHTML = "<p class=\"muted\">No shared target keywords detected across pages.</p>";
      return;
    }
    els.conflicts.innerHTML = data.conflicts
      .slice(0, 40)
      .map(
        (row) => `
        <article class="cn-inv-conflict">
          <h3><code>${escapeHtml(row.keyword)}</code> <span class="muted">(${row.urls.length} pages)</span></h3>
          <ul>${row.urls.map((u) => `<li><a href="${escapeHtml(u)}">${escapeHtml(u)}</a></li>`).join("")}</ul>
        </article>`
      )
      .join("");
  };

  const renderTable = () => {
    if (!inventory || !els.tableBody) return;
    const q = (els.search?.value || "").toLowerCase().trim();
    const type = els.typeFilter?.value || "all";

    const rows = inventory.items.filter((item) => {
      if (type !== "all" && item.type !== type) return false;
      if (!q) return true;
      const hay = [item.title, item.url, item.slug, item.category, ...(item.keywords || []), item.primary_keyword]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });

    els.tableBody.innerHTML = rows
      .map((item) => {
        const kws = [...(item.keywords || [])];
        if (item.primary_keyword && !kws.includes(item.primary_keyword)) {
          kws.unshift(item.primary_keyword);
        }
        const kwText = kws.length ? kws.join(", ") : "—";
        return `<tr>
          <td><span class="cn-inv-badge cn-inv-badge--${escapeHtml(item.type)}">${escapeHtml(item.type)}</span></td>
          <td><a href="${escapeHtml(item.url)}">${escapeHtml(item.title)}</a></td>
          <td><code class="cn-inv-url">${escapeHtml(item.url)}</code></td>
          <td>${escapeHtml(item.category || "")}</td>
          <td class="cn-inv-kw">${escapeHtml(kwText)}</td>
        </tr>`;
      })
      .join("");
  };

  const bindFilters = () => {
    els.search?.addEventListener("input", renderTable);
    els.typeFilter?.addEventListener("change", renderTable);
  };

  const loadInventory = async () => {
    const asset = (path) => (typeof CalnexPath === "function" ? CalnexPath(path) : path);
    if (window.__SITE_INVENTORY__) return window.__SITE_INVENTORY__;
    const embedded = document.getElementById("site-inventory-data");
    if (embedded?.textContent?.trim()) {
      return JSON.parse(embedded.textContent);
    }
    const paths = [asset("/data/site-inventory.json"), asset("/public/data/site-inventory.json")];
    for (const url of paths) {
      try {
        const res = await fetch(`${url}?ts=${Date.now()}`);
        if (res.ok) return await res.json();
      } catch (_) {
        /* try next */
      }
    }
    throw new Error(
      "Inventory data not found. Run: npm run build:site-inventory (then hard-refresh this page)."
    );
  };

  const init = async () => {
    try {
      inventory = await loadInventory();
      renderCounts(inventory);
      renderConflicts(inventory);
      renderTable();
      bindFilters();
    } catch (err) {
      if (els.counts) els.counts.innerHTML = "";
      if (els.conflicts) {
        els.conflicts.innerHTML = `<p class="cn-inv-warn">${escapeHtml(err.message)}</p>`;
      }
      if (els.tableBody) {
        els.tableBody.innerHTML = `<tr><td colspan="5">${escapeHtml(err.message)}</td></tr>`;
      }
    }
  };

  document.addEventListener("DOMContentLoaded", init);
})();
