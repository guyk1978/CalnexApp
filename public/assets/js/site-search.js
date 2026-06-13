/**
 * CalnexApp — header search trigger + minimal dropdown input.
 */
(function () {
  const asset = (path) => (typeof CalnexPath === "function" ? CalnexPath(path) : path);

  const TRIGGER_ICON =
    '<svg class="cn-header-search-trigger__icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>';

  const FIELD_ICON =
    '<svg class="cn-header-search__icon-svg" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>';

  const escapeHtml = (value) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

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

  let searchInitLock = false;
  let searchIndex = [];
  let searchFuse = null;
  let searchReady = false;

  const filterResults = (items, query, limit = 8) => {
    const q = String(query ?? "").trim().toLowerCase();
    if (!q) return [];

    const filteredResults = items.filter((item) => {
      const title = String(item.title ?? "").toLowerCase();
      const description = String(item.description ?? "").toLowerCase();
      const keywords = String(item.keywords ?? "").toLowerCase();
      return title.includes(q) || description.includes(q) || keywords.includes(q);
    });

    console.log("[CalnexApp] filteredResults", filteredResults);
    return filteredResults.slice(0, limit);
  };

  const runSearch = (query) => {
    const q = String(query ?? "").trim();
    if (!q) return [];

    if (searchFuse && searchIndex.length) {
      const fuseResults = searchFuse.search(q, { limit: 8 }).map((r) => r.item);
      console.log("[CalnexApp] filteredResults", fuseResults);
      if (fuseResults.length) return fuseResults;
    }

    return filterResults(searchIndex, q, 8);
  };

  const ensureMount = () => {
    const nav = document.querySelector(".site-header .nav");
    if (!nav) return null;

    let actions = nav.querySelector(".cn-header-actions");
    if (!actions) {
      actions = document.createElement("div");
      actions.className = "cn-header-actions";
      nav.appendChild(actions);
    }

    let mount = document.getElementById("cn-site-search-mount");
    if (!mount) {
      mount = actions.querySelector("#cn-site-search-mount");
    }
    if (!mount) {
      mount = document.createElement("div");
      mount.id = "cn-site-search-mount";
      mount.className = "cn-header-search-mount";
      actions.insertBefore(mount, actions.firstChild);
    } else if (mount.parentElement !== actions) {
      actions.insertBefore(mount, actions.firstChild);
    }
    mount.removeAttribute("aria-hidden");
    return mount;
  };

  const ensureShell = (mount) => {
    let wrap = mount.querySelector(".cn-header-search-wrap");
    if (!wrap) {
      wrap = document.createElement("div");
      wrap.className = "cn-header-search-wrap";
      mount.appendChild(wrap);
    }

    let trigger = document.getElementById("cn-header-search-trigger");
    if (!trigger) {
      trigger = document.createElement("button");
      trigger.type = "button";
      trigger.id = "cn-header-search-trigger";
      trigger.className = "cn-header-search-trigger";
      trigger.setAttribute("aria-label", "Search");
      trigger.setAttribute("aria-expanded", "false");
      trigger.setAttribute("aria-controls", "cn-header-search");
      trigger.innerHTML = TRIGGER_ICON;
      wrap.appendChild(trigger);
    }

    let widget = document.getElementById("cn-header-search");
    if (!widget) {
      widget = document.createElement("div");
      widget.id = "cn-header-search";
      widget.className = "cn-header-search";
      widget.hidden = true;
      widget.innerHTML = `
        <label class="sr-only" for="cn-header-search-input">Search</label>
        <div class="cn-header-search__field">
          <span class="cn-header-search__icon" aria-hidden="true">${FIELD_ICON}</span>
          <input
            type="search"
            id="cn-header-search-input"
            class="cn-header-search__input"
            placeholder="Search"
            autocomplete="off"
            autocorrect="off"
            spellcheck="false"
            role="combobox"
            aria-expanded="false"
            aria-controls="cn-header-search-list"
            aria-autocomplete="list"
          />
        </div>
        <div class="cn-header-search__dropdown" id="cn-header-search-dropdown" hidden>
          <div class="cn-header-search__list" id="cn-header-search-list" role="listbox"></div>
        </div>
      `;
      wrap.appendChild(widget);
    }

    return { wrap, trigger, widget };
  };

  const loadSearchIndex = async () => {
    if (searchReady && searchIndex.length) return;

    try {
      await loadScript(asset("/assets/js/vendor/fuse.min.js"));
      const response = await fetch(asset("/data/search-index.json"));
      if (!response.ok) throw new Error("search index unavailable");
      const data = await response.json();
      if (!Array.isArray(data)) throw new Error("search index invalid");

      searchIndex = data;
      if (typeof Fuse !== "undefined") {
        searchFuse = new Fuse(searchIndex, {
          keys: [
            { name: "title", weight: 0.55 },
            { name: "description", weight: 0.25 },
            { name: "keywords", weight: 0.2 },
          ],
          threshold: 0.42,
          ignoreLocation: true,
          minMatchCharLength: 1,
          includeScore: true,
        });
      }
      searchReady = true;
      console.log("[CalnexApp] Site search index loaded", searchIndex.length, "items");
    } catch (err) {
      console.warn("[CalnexApp] Site search index failed:", err);
      searchReady = false;
    }
  };

  const initSiteSearch = async () => {
    if (document.querySelector("[data-cn-react-header]") || document.querySelector("[data-cn-react-search]")) {
      return;
    }
    if (document.getElementById("cn-header-search-trigger")?.dataset.cnSearchBound === "true") return;
    if (searchInitLock) return;

    const mount = ensureMount() || document.querySelector(".cn-header-actions");
    if (!mount) return;
    searchInitLock = true;

    let wrap;
    let trigger;
    let widget;
    let input;
    let dropdown;
    let list;

    try {
      ({ wrap, trigger, widget } = ensureShell(mount));
      input = widget.querySelector("#cn-header-search-input");
      dropdown = widget.querySelector("#cn-header-search-dropdown");
      list = widget.querySelector("#cn-header-search-list");
      if (!input || !dropdown || !list) {
        throw new Error("search shell incomplete");
      }

      let activeIndex = -1;
      let flatResults = [];
      let dropdownOpen = false;
      let panelOpen = false;

      const closeDropdown = () => {
        dropdownOpen = false;
        dropdown.hidden = true;
        input.setAttribute("aria-expanded", "false");
        activeIndex = -1;
        flatResults = [];
      };

      const openDropdown = () => {
        dropdownOpen = true;
        dropdown.hidden = false;
        input.setAttribute("aria-expanded", "true");
      };

      const closePanel = () => {
        panelOpen = false;
        wrap.classList.remove("is-open");
        widget.hidden = true;
        trigger.setAttribute("aria-expanded", "false");
        closeDropdown();
        list.innerHTML = "";
      };

      const openPanel = () => {
        panelOpen = true;
        wrap.classList.add("is-open");
        widget.hidden = false;
        trigger.setAttribute("aria-expanded", "true");
        window.requestAnimationFrame(() => input.focus());
      };

      const navigateTo = (url) => {
        closePanel();
        input.value = "";
        window.location.assign(url);
      };

      const setActive = (nextIndex) => {
        const links = list.querySelectorAll(".cn-header-search__item");
        if (!links.length) {
          activeIndex = -1;
          return;
        }
        activeIndex = ((nextIndex % links.length) + links.length) % links.length;
        links.forEach((link, i) => {
          link.classList.toggle("is-active", i === activeIndex);
        });
      };

      const renderResults = (items) => {
        flatResults = items;
        activeIndex = items.length ? 0 : -1;

        if (!input.value.trim()) {
          closeDropdown();
          list.innerHTML = "";
          return;
        }

        openDropdown();

        if (!items.length) {
          list.innerHTML = '<p class="cn-header-search__empty">No results found</p>';
          return;
        }

        list.innerHTML = items
          .map(
            (item, idx) =>
              `<a href="${escapeHtml(item.url)}" class="cn-header-search__item${idx === 0 ? " is-active" : ""}" role="option">${escapeHtml(item.title)}</a>`
          )
          .join("");
      };

      const handleQuery = () => {
        if (!searchReady) {
          void loadSearchIndex().then(() => {
            if (input.value.trim()) renderResults(runSearch(input.value));
          });
          return;
        }
        renderResults(runSearch(input.value));
      };

      trigger.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (panelOpen) {
          closePanel();
          input.value = "";
          return;
        }
        openPanel();
        void loadSearchIndex();
      });

      input.addEventListener("input", handleQuery);

      input.addEventListener("focus", () => {
        if (input.value.trim()) handleQuery();
      });

      input.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          closePanel();
          input.value = "";
          trigger.focus();
          return;
        }

        if (!dropdownOpen) return;

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

      list.addEventListener("mousemove", (event) => {
        const item = event.target.closest(".cn-header-search__item");
        if (!item) return;
        const links = [...list.querySelectorAll(".cn-header-search__item")];
        const idx = links.indexOf(item);
        if (idx >= 0) setActive(idx);
      });

      document.addEventListener("pointerdown", (event) => {
        if (!wrap.contains(event.target)) {
          if (panelOpen) {
            closePanel();
            input.value = "";
          } else {
            closeDropdown();
          }
        }
      });

      trigger.dataset.cnSearchBound = "true";

      await loadSearchIndex();
      if (input.value.trim()) {
        renderResults(runSearch(input.value));
      }
    } catch (err) {
      console.warn("[CalnexApp] Site search wiring failed:", err);
      return;
    } finally {
      searchInitLock = false;
    }
  };

  window.CalnexSiteSearch = { init: initSiteSearch };

  const bootSearch = () => {
    void initSiteSearch();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootSearch);
  } else {
    bootSearch();
  }

  document.addEventListener("cn-header:updated", () => {
    if (document.getElementById("cn-header-search-trigger")?.dataset.cnSearchBound !== "true") {
      void initSiteSearch();
    }
  });
})();
