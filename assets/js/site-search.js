/**
 * CalnexApp command-palette search (Fuse.js + modal UI).
 * Loaded by app.js after fuse.min.js is available.
 */
(function () {
  const asset = (path) => (typeof CalnexPath === "function" ? CalnexPath(path) : path);

  const CATEGORY_LABELS = {
    Tools: "Tools & Calculators",
    Blog: "Blog Articles",
    Pages: "Site Pages",
    Scenarios: "Loan Scenarios",
  };

  const CATEGORY_ORDER = ["Tools", "Blog", "Scenarios", "Pages"];

  const SEARCH_ICON =
    '<svg class="cn-search-trigger__icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>';

  const loadScript = (src) =>
    new Promise((resolve, reject) => {
      const resolved = asset(src);
      if (document.querySelector(`script[src="${resolved}"]`)) {
        resolve();
        return;
      }
      const script = document.createElement("script");
      script.src = resolved;
      script.defer = true;
      script.addEventListener("load", () => resolve(), { once: true });
      script.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)), { once: true });
      document.head.append(script);
    });

  const isMac = () => /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent);

  const modKeyLabel = () => (isMac() ? "⌘" : "Ctrl");

  const shortcutKbdHtml = () => {
    if (isMac()) {
      return '<kbd class="cn-kbd">⌘</kbd><kbd class="cn-kbd">K</kbd>';
    }
    return '<kbd class="cn-kbd">Ctrl</kbd><kbd class="cn-kbd">K</kbd>';
  };

  let searchInitLock = false;

  const initSiteSearch = async () => {
    if (document.getElementById("cn-site-search-trigger")) return;
    if (searchInitLock) return;
    const headerActions = document.querySelector(".cn-header-actions");
    if (!headerActions) return;
    searchInitLock = true;

    let index = [];
    let fuse = null;
    let isOpen = false;
    let activeIndex = -1;
    let flatResults = [];

    try {
      await loadScript(asset("/assets/js/vendor/fuse.min.js"));
      const response = await fetch(asset("/data/search-index.json"));
      if (!response.ok) throw new Error("search index unavailable");
      index = await response.json();
      if (typeof Fuse !== "undefined") {
        fuse = new Fuse(index, {
          keys: [
            { name: "title", weight: 0.5 },
            { name: "description", weight: 0.28 },
            { name: "keywords", weight: 0.22 },
            { name: "category", weight: 0.12 },
          ],
          threshold: 0.38,
          ignoreLocation: true,
          minMatchCharLength: 2,
          includeScore: true,
        });
      }
    } catch (err) {
      console.warn("[CalnexApp] Site search disabled:", err);
      searchInitLock = false;
      return;
    }

    const overlay = document.createElement("div");
    overlay.id = "cn-site-search";
    overlay.className = "cn-search-overlay";
    overlay.setAttribute("role", "presentation");
    overlay.hidden = true;
    overlay.innerHTML = `
      <div class="cn-search-modal" role="dialog" aria-modal="true" aria-labelledby="cn-search-dialog-title">
        <h2 id="cn-search-dialog-title" class="sr-only">Search CalnexApp</h2>
        <div class="cn-search-modal__input-wrap">
          <svg class="cn-search-modal__input-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
          <input
            type="search"
            class="cn-search-modal__input"
            id="cn-search-input"
            placeholder="Search tools, calculators, or articles..."
            autocomplete="off"
            autocorrect="off"
            spellcheck="false"
            aria-controls="cn-search-results"
            aria-activedescendant=""
          />
          <span class="cn-search-modal__shortcut" id="cn-search-modal-shortcut" aria-hidden="true"></span>
          <span class="cn-search-modal__hint" aria-hidden="true"><kbd class="cn-kbd">esc</kbd></span>
        </div>
        <div class="cn-search-results" id="cn-search-results" role="listbox" aria-label="Search results"></div>
        <div class="cn-search-footer" aria-hidden="true">
          <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
          <span><kbd>↵</kbd> open</span>
          <span><kbd>esc</kbd> close</span>
        </div>
      </div>
    `;
    document.body.append(overlay);

    const modal = overlay.querySelector(".cn-search-modal");
    const input = overlay.querySelector("#cn-search-input");
    const resultsEl = overlay.querySelector("#cn-search-results");
    const modalShortcut = overlay.querySelector("#cn-search-modal-shortcut");
    modalShortcut.innerHTML = shortcutKbdHtml();

    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.id = "cn-site-search-trigger";
    trigger.className = "cn-search-trigger";
    trigger.setAttribute("aria-label", "Search site");
    trigger.setAttribute("title", `Search (${modKeyLabel()}K)`);
    trigger.innerHTML = `${SEARCH_ICON}<span class="cn-search-trigger__kbd" aria-hidden="true">${shortcutKbdHtml()}</span>`;
    headerActions.insertBefore(trigger, headerActions.firstChild);

    const defaultItems = () => {
      const byCategory = {};
      index.forEach((item) => {
        if (!byCategory[item.category]) byCategory[item.category] = [];
        const cap = item.category === "Scenarios" ? 3 : 4;
        if (byCategory[item.category].length < cap) byCategory[item.category].push(item);
      });
      return CATEGORY_ORDER.flatMap((cat) => byCategory[cat] || []);
    };

    const search = (query) => {
      const q = query.trim();
      if (!q) return defaultItems();
      if (!fuse) {
        const lower = q.toLowerCase();
        return index
          .filter(
            (item) =>
              item.title.toLowerCase().includes(lower) ||
              item.description.toLowerCase().includes(lower)
          )
          .slice(0, 12);
      }
      return fuse.search(q, { limit: 20 }).map((r) => r.item);
    };

    const groupResults = (items) => {
      const groups = {};
      items.forEach((item) => {
        if (!groups[item.category]) groups[item.category] = [];
        groups[item.category].push(item);
      });
      return CATEGORY_ORDER.filter((cat) => groups[cat]?.length).map((cat) => ({
        category: cat,
        label: CATEGORY_LABELS[cat] || cat,
        items: groups[cat],
      }));
    };

    const navigateTo = (url) => {
      close();
      window.location.assign(url);
    };

    const setActive = (nextIndex) => {
      const buttons = resultsEl.querySelectorAll(".cn-search-result");
      if (!buttons.length) {
        activeIndex = -1;
        input.setAttribute("aria-activedescendant", "");
        return;
      }
      activeIndex = ((nextIndex % buttons.length) + buttons.length) % buttons.length;
      buttons.forEach((btn, i) => {
        const active = i === activeIndex;
        btn.classList.toggle("is-active", active);
        btn.setAttribute("aria-selected", active ? "true" : "false");
        if (active) {
          input.setAttribute("aria-activedescendant", btn.id);
          btn.scrollIntoView({ block: "nearest" });
        }
      });
    };

    const renderResults = (items) => {
      flatResults = items;
      activeIndex = items.length ? 0 : -1;

      if (!items.length) {
        resultsEl.classList.add("is-empty");
        resultsEl.innerHTML = '<p class="cn-search-empty">No matches. Try another keyword.</p>';
        input.setAttribute("aria-activedescendant", "");
        return;
      }

      resultsEl.classList.remove("is-empty");
      const grouped = groupResults(items);
      let globalIdx = 0;
      resultsEl.innerHTML = grouped
        .map(
          (group) => `
        <div class="cn-search-group" role="group" aria-label="${group.label}">
          <p class="cn-search-group__label">${group.label}</p>
          ${group.items
            .map((item) => {
              const id = `cn-search-result-${globalIdx}`;
              const idx = globalIdx;
              globalIdx += 1;
              const active = idx === 0 ? " is-active" : "";
              return `
            <button
              type="button"
              class="cn-search-result${active}"
              id="${id}"
              role="option"
              aria-selected="${idx === 0 ? "true" : "false"}"
              data-index="${idx}"
              data-url="${item.url}"
            >
              <span class="cn-search-result__title">${item.title}</span>
              <span class="cn-search-result__desc">${item.description}</span>
            </button>
          `;
            })
            .join("")}
        </div>
      `
        )
        .join("");

      if (activeIndex >= 0) {
        input.setAttribute("aria-activedescendant", `cn-search-result-${activeIndex}`);
      }
    };

    const open = () => {
      if (isOpen) return;
      isOpen = true;
      overlay.hidden = false;
      requestAnimationFrame(() => overlay.classList.add("is-open"));
      document.body.style.overflow = "hidden";
      input.value = "";
      renderResults(defaultItems());
      setTimeout(() => input.focus(), 0);
    };

    const close = () => {
      if (!isOpen) return;
      isOpen = false;
      overlay.classList.remove("is-open");
      document.body.style.overflow = "";
      input.setAttribute("aria-activedescendant", "");
      setTimeout(() => {
        overlay.hidden = true;
      }, 180);
    };

    trigger.addEventListener("click", open);

    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) close();
    });

    modal.addEventListener("click", (event) => event.stopPropagation());

    input.addEventListener("input", () => {
      renderResults(search(input.value));
    });

    resultsEl.addEventListener("click", (event) => {
      const btn = event.target.closest(".cn-search-result");
      if (!btn) return;
      navigateTo(btn.dataset.url);
    });

    resultsEl.addEventListener("mousemove", (event) => {
      const btn = event.target.closest(".cn-search-result");
      if (!btn) return;
      const idx = Number(btn.dataset.index);
      if (!Number.isNaN(idx)) setActive(idx);
    });

    document.addEventListener("keydown", (event) => {
      const mod = isMac() ? event.metaKey : event.ctrlKey;
      if (mod && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (isOpen) close();
        else open();
        return;
      }

      if (!isOpen) return;

      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActive(activeIndex + 1);
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActive(activeIndex - 1);
        return;
      }

      if (event.key === "Enter" && activeIndex >= 0 && flatResults[activeIndex]) {
        event.preventDefault();
        navigateTo(flatResults[activeIndex].url);
      }
    });
  };

  window.CalnexSiteSearch = { init: initSiteSearch };
})();
