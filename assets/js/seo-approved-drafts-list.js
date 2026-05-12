/**
 * Lists items with status === "approved" from drafts/pending-seo-pages.json
 * (same file the SEO approval dashboard + persist server use).
 *
 * Optional: window.__SEO_DRAFTS_JSON_URL__ = full URL (e.g. persist server) if /drafts/ is not on this origin.
 */
(function () {
  function resolveJsonUrl() {
    if (typeof window.__SEO_DRAFTS_JSON_URL__ === "string" && window.__SEO_DRAFTS_JSON_URL__) {
      return window.__SEO_DRAFTS_JSON_URL__.replace(/\?.*$/, "");
    }
    return "/drafts/pending-seo-pages.json";
  }

  function buildFetchUrl(base) {
    var sep = base.indexOf("?") === -1 ? "?" : "&";
    return base + sep + "ts=" + Date.now();
  }

  async function loadApproved() {
    var section = document.getElementById("seoApprovedSection");
    var listEl = document.getElementById("seoApprovedFromDrafts");
    if (!section || !listEl) return;

    var base = resolveJsonUrl();
    var url = buildFetchUrl(base);
    try {
      var res = await fetch(url, {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache"
        }
      });
      if (!res.ok) {
        section.hidden = true;
        return;
      }
      var raw = await res.text();
      var data = JSON.parse(raw);
      var items = Array.isArray(data.items) ? data.items : [];
      var approved = items.filter(function (i) {
        return i && i.status === "approved";
      });
      listEl.innerHTML = "";
      if (!approved.length) {
        section.hidden = true;
        return;
      }
      approved.forEach(function (item) {
        var slug = item.slug || "";
        var title = item.title || slug || "Untitled";
        var li = document.createElement("li");
        var a = document.createElement("a");
        a.href = "/blog/" + slug + "/";
        a.textContent = title;
        li.appendChild(a);
        listEl.appendChild(li);
      });
      section.hidden = false;
    } catch (e) {
      console.warn("[seo-approved-drafts-list]", e);
      section.hidden = true;
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadApproved);
  } else {
    loadApproved();
  }
})();
