(function () {
  const asset = (path) => (typeof CalnexPath === "function" ? CalnexPath(path) : path);

  const yearNode = document.getElementById("year");
  if (yearNode) {
    yearNode.textContent = new Date().getFullYear();
  }

  const THEME_KEY = "cn_theme";

  const getStoredTheme = () => {
    try {
      return localStorage.getItem(THEME_KEY);
    } catch (_e) {
      return null;
    }
  };

  const resolveTheme = (stored) => {
    if (stored === "light") return "light";
    if (stored === "system") {
      return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
    }
    return "dark";
  };

  const applyTheme = (resolved) => {
    document.documentElement.setAttribute("data-theme", resolved);
    document.documentElement.style.colorScheme = resolved === "light" ? "light" : "dark";
    document.dispatchEvent(new CustomEvent("cn-themechange", { detail: { theme: resolved } }));
  };

  const cycleTheme = (currentStored) => {
    if (currentStored === "dark" || currentStored === null || currentStored === "") return "light";
    if (currentStored === "light") return "system";
    return "dark";
  };

  const themeLabel = (stored) => {
    if (stored === "system") return "System theme";
    if (stored === "light") return "Light theme";
    return "Dark theme";
  };

  const svgIcon = (stored) => {
    if (stored === "light") {
      return '<svg class="cn-theme-toggle__icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>';
    }
    if (stored === "system") {
      return '<svg class="cn-theme-toggle__icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/><path d="M19 3v4M21 5h-4"/></svg>';
    }
    return '<svg class="cn-theme-toggle__icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
  };

  const initHeaderChart = () => {
    document.querySelectorAll(".site-header .brand").forEach((brand) => {
      if (brand.querySelector(".header-chart-mini")) return;
      const chart = document.createElement("span");
      chart.className = "header-chart-mini";
      chart.setAttribute("aria-hidden", "true");
      chart.title = "CalnexApp Analytics";
      chart.innerHTML = `
        <span class="header-chart-mini__bar"></span>
        <span class="header-chart-mini__bar"></span>
        <span class="header-chart-mini__bar"></span>
        <span class="header-chart-mini__bar"></span>
      `;
      brand.appendChild(chart);
    });
  };

  const hasReactHeader = () => Boolean(document.querySelector("[data-cn-react-header]"));

  const initThemeToggle = () => {
    if (hasReactHeader()) return;
    const nav = document.querySelector(".site-header .nav");
    if (!nav || document.getElementById("cn-theme-toggle")) return;

    const ctx = window.CalnexHeaderToolbar?.ensure?.() || {};
    const actions = ctx.actions || nav.querySelector(".cn-header-actions");
    if (!actions) return;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.id = "cn-theme-toggle";
    btn.className = "cn-theme-toggle";

    const render = () => {
      const stored = getStoredTheme();
      const effectiveStored = stored === "light" || stored === "system" ? stored : "dark";
      btn.setAttribute("aria-label", themeLabel(effectiveStored));
      btn.setAttribute("title", themeLabel(effectiveStored));
      btn.innerHTML = svgIcon(effectiveStored);
    };

    btn.addEventListener("click", () => {
      const stored = getStoredTheme();
      const nextStored = cycleTheme(stored);
      try {
        localStorage.setItem(THEME_KEY, nextStored);
      } catch (_e) {
        /* ignore */
      }
      applyTheme(resolveTheme(nextStored));
      render();
    });

    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const onOs = () => {
      if (getStoredTheme() === "system") {
        applyTheme(resolveTheme("system"));
        render();
      }
    };
    if (mq.addEventListener) mq.addEventListener("change", onOs);
    else mq.addListener(onOs);

    actions.appendChild(btn);
    render();
    document.dispatchEvent(new CustomEvent("cn-header:updated"));
  };

  const markActiveNav = () => {
    const path = window.location.pathname.endsWith("/")
      ? window.location.pathname
      : `${window.location.pathname}/`;
    document.querySelectorAll("[data-nav-link]").forEach((link) => {
      const href = link.getAttribute("href");
      if (href && (path === href || (href !== "/" && path.startsWith(href)))) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  };

  const initToolsNavDropdown = () => {
    document.querySelectorAll(".cn-nav-dropdown").forEach((dropdown) => {
      if (dropdown.dataset.cnNavBound === "true") return;
      dropdown.dataset.cnNavBound = "true";
      const trigger = dropdown.querySelector(".cn-nav-dropdown__trigger");
      const panel = dropdown.querySelector(".cn-nav-dropdown__panel");
      if (!trigger || !panel) return;

      const setOpen = (open) => {
        dropdown.classList.toggle("is-open", open);
        trigger.setAttribute("aria-expanded", open ? "true" : "false");
      };

      trigger.addEventListener("click", (event) => {
        if (window.innerWidth <= 768) {
          event.preventDefault();
          setOpen(!dropdown.classList.contains("is-open"));
        }
      });

      dropdown.addEventListener("focusout", (event) => {
        if (window.innerWidth > 768) return;
        if (!dropdown.contains(event.relatedTarget)) setOpen(false);
      });

      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") setOpen(false);
      });
    });
  };

  const initMobileMenu = () => {
    const nav = document.querySelector(".site-header .nav");
    const menu = nav?.querySelector(".menu");
    if (!nav || !menu || nav.querySelector(".mobile-menu-toggle")) return;
    if (!menu.id) menu.id = "siteMenu";
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "mobile-menu-toggle";
    toggle.setAttribute("aria-controls", menu.id);
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Toggle navigation menu");
    toggle.innerHTML = "<span></span><span></span><span></span>";
    nav.insertBefore(toggle, menu);

    const closeMenu = () => {
      nav.classList.remove("is-mobile-open");
      toggle.setAttribute("aria-expanded", "false");
    };
    const openMenu = () => {
      nav.classList.add("is-mobile-open");
      toggle.setAttribute("aria-expanded", "true");
    };

    toggle.addEventListener("click", () => {
      if (nav.classList.contains("is-mobile-open")) closeMenu();
      else openMenu();
    });

    menu.addEventListener("click", (event) => {
      const link = event.target.closest("a");
      if (link) closeMenu();
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth > 768) closeMenu();
    });
  };

  const fetchJson = async (url) => {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Unable to load ${url}`);
    }
    return response.json();
  };

  const RELATED_ACCENT_EMOJI = {
    housing: "🏠",
    lending: "💳",
    auto: "🚗",
    growth: "📊",
    planning: "🧭"
  };

  const RELATED_MINI_ICON_CLASS = {
    housing:
      "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-lg text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400",
    lending:
      "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-lg text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400",
    auto: "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-lg text-amber-600 dark:bg-amber-950/50 dark:text-amber-400",
    growth:
      "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-50 text-lg text-purple-600 dark:bg-purple-950/50 dark:text-purple-400",
    planning:
      "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-lg text-teal-600 dark:bg-teal-950/50 dark:text-teal-400"
  };

  const toolAccentFromSlug = (slug = "") => {
    const key = slug.replace(/-calculator$/, "").replace(/^rent-vs-buy.*$/, "rent-vs-buy");
    const map = {
      "mortgage-calculator": "housing",
      "rent-vs-buy": "housing",
      "rent-vs-buy-calculator": "housing",
      "loan-calculator": "lending",
      "debt-payoff": "lending",
      "loan-comparison": "lending",
      "car-loan-calculator": "auto",
      "interest-calculator": "growth",
      "retirement-calculator": "planning"
    };
    return map[key] || map[slug] || "lending";
  };

  const RELATED_SECTION_WRAP_CLASS =
    "py-12 border-t border-slate-100 dark:border-slate-800/60 mt-16 space-y-6";
  const RELATED_GRID_CLASS =
    "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 my-6";
  const RELATED_LINK_CLASS =
    "flex items-center gap-3 p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800/80 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all group no-underline";
  const RELATED_TITLE_CLASS =
    "text-sm font-bold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 transition-colors";

  const renderRelatedToolLink = (tool) => {
    const accent = toolAccentFromSlug(tool.slug || "");
    const emoji = RELATED_ACCENT_EMOJI[accent] || "📊";
    const iconClass = RELATED_MINI_ICON_CLASS[accent] || RELATED_MINI_ICON_CLASS.lending;
    const path = tool.path || `/tools/${tool.slug}/`;
    return `<a href="${path}" class="${RELATED_LINK_CLASS}">
      <div class="${iconClass}" aria-hidden="true">${emoji}</div>
      <span class="${RELATED_TITLE_CLASS}">${tool.name}</span>
    </a>`;
  };

  const renderRelatedTools = async () => {
    const holder = document.querySelector("[data-related-tools]");
    if (!holder) return;

    const currentSlug = holder.dataset.currentTool || "";
    try {
      const tools = await fetchJson(asset("/data/tools.json"));
      const related = tools.filter((tool) => tool.slug !== currentSlug).slice(0, 8);
      holder.className = RELATED_SECTION_WRAP_CLASS;
      holder.innerHTML = `
        <h2 class="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Related Tools</h2>
        <div class="${RELATED_GRID_CLASS}">
          ${related.map((tool) => renderRelatedToolLink(tool)).join("")}
        </div>
      `;
    } catch (_error) {
      holder.innerHTML = "<p class='muted'>Related tools are unavailable right now.</p>";
    }
  };

  const classifyBlogCategory = (category = "") => {
    const c = String(category).toLowerCase();
    if (c.includes("auto") || c.includes("car")) return "auto";
    if (c.includes("retirement") || c.includes("401")) return "planning";
    if (
      c.includes("mortgage") ||
      c.includes("home equity") ||
      c.includes("housing") ||
      c.includes("rent") ||
      c.includes("pmi")
    ) {
      return "housing";
    }
    if (c.includes("interest") || c.includes("growth") || c.includes("invest")) return "growth";
    return "lending";
  };

  const BLOG_TILE_CLASS = {
    housing:
      "group block rounded-xl border-2 border-t-4 border-emerald-200 border-t-emerald-500 bg-emerald-50/60 p-4 no-underline transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-emerald-800 dark:bg-emerald-950/30",
    lending:
      "group block rounded-xl border-2 border-t-4 border-indigo-200 border-t-indigo-500 bg-indigo-50/60 p-4 no-underline transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-indigo-800 dark:bg-indigo-950/30",
    auto: "group block rounded-xl border-2 border-t-4 border-amber-200 border-t-amber-500 bg-amber-50/60 p-4 no-underline transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-amber-800 dark:bg-amber-950/30",
    growth:
      "group block rounded-xl border-2 border-t-4 border-purple-200 border-t-purple-500 bg-purple-50/60 p-4 no-underline transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-purple-800 dark:bg-purple-950/30",
    planning:
      "group block rounded-xl border-2 border-t-4 border-teal-200 border-t-teal-500 bg-teal-50/60 p-4 no-underline transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-teal-800 dark:bg-teal-950/30"
  };

  const BLOG_PILL_CLASS = {
    housing:
      "mb-3 inline-flex rounded-md bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200",
    lending:
      "mb-3 inline-flex rounded-md bg-indigo-100 px-2.5 py-1 text-xs font-semibold text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-200",
    auto: "mb-3 inline-flex rounded-md bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-900/60 dark:text-amber-200",
    growth:
      "mb-3 inline-flex rounded-md bg-purple-100 px-2.5 py-1 text-xs font-semibold text-purple-800 dark:bg-purple-900/60 dark:text-purple-200",
    planning:
      "mb-3 inline-flex rounded-md bg-teal-100 px-2.5 py-1 text-xs font-semibold text-teal-800 dark:bg-teal-900/60 dark:text-teal-200"
  };

  const blogTile = (post) => {
    const accent = classifyBlogCategory(post.category);
    const category = post.category || "Blog";
    return `
        <a href="/blog/${post.slug}/" class="${BLOG_TILE_CLASS[accent] || BLOG_TILE_CLASS.lending}">
          <span class="${BLOG_PILL_CLASS[accent] || BLOG_PILL_CLASS.lending}">${category}</span>
          <h3 class="mb-2 text-xl font-extrabold tracking-tight text-slate-900 transition-colors group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400">${post.title}</h3>
        </a>`;
  };

  const renderBlogIndex = async () => {
    const blogList = document.getElementById("blogList");
    const featuredBlogList = document.getElementById("featuredBlogList");
    const filtersHolder = document.getElementById("blogCategoryFilters");
    const searchInput = document.getElementById("blogSearchInput");
    if (!blogList || !featuredBlogList || !filtersHolder || !searchInput) return;
    try {
      const embedded = document.getElementById("calnex-blog-manifest");
      let posts = [];
      if (embedded && embedded.textContent.trim()) {
        posts = JSON.parse(embedded.textContent);
      } else {
        posts = await fetchJson(asset("/data/blog.json"));
      }
      const categories = ["All", ...new Set(posts.map((post) => post.category))];
      let activeCategory = "All";
      let activeQuery = "";

      const card = blogTile;

      const renderFilters = () => {
        filtersHolder.innerHTML = categories
          .map(
            (category) =>
              `<button class="filter-chip ${category === activeCategory ? "is-active" : ""}" data-category="${category}" type="button">${category}</button>`
          )
          .join("");
      };

      const renderCards = () => {
        const filtered = posts.filter((post) => {
          const categoryMatch = activeCategory === "All" || post.category === activeCategory;
          const queryText = `${post.title} ${post.excerpt} ${post.category}`.toLowerCase();
          const queryMatch = !activeQuery || queryText.includes(activeQuery);
          return categoryMatch && queryMatch;
        });
        const featured = filtered.filter((post) => post.featured);
        const nonFeatured = filtered.filter((post) => !post.featured);

        featuredBlogList.innerHTML = featured.length
          ? featured.map(card).join("")
          : "<p class='muted'>No featured articles match the current filter.</p>";
        blogList.innerHTML = nonFeatured.length
          ? nonFeatured.map(card).join("")
          : "<p class='muted'>No articles match your search.</p>";
      };

      renderFilters();
      renderCards();

      filtersHolder.addEventListener("click", (event) => {
        const button = event.target.closest("[data-category]");
        if (!button) return;
        activeCategory = button.dataset.category;
        renderFilters();
        renderCards();
      });

      searchInput.addEventListener("input", () => {
        activeQuery = searchInput.value.trim().toLowerCase();
        renderCards();
      });
    } catch (_error) {
      blogList.innerHTML = "<p class='muted'>Unable to load blog posts at this time.</p>";
      featuredBlogList.innerHTML = "";
    }
  };

  const renderToolsHub = async () => {
    const catalog = document.getElementById("cn-tools-catalog");
    if (!catalog) return;
    const hasStaticCards = catalog.querySelector("a.cn-dashboard-micro-card");
    if (hasStaticCards) return;
    try {
      const tools = await fetchJson(asset("/data/tools.json"));
      const ACCENT_EMOJI = { housing: "🏠", lending: "💳", auto: "🚗", growth: "📊", planning: "🧭" };
      const toolAccent = (slug = "", navGroup = "") => {
        if (navGroup) return navGroup;
        if (slug.includes("mortgage") || slug.includes("rent")) return "housing";
        if (slug.includes("car")) return "auto";
        if (slug.includes("retirement")) return "planning";
        if (slug.includes("interest")) return "growth";
        return "lending";
      };
      const iconClass = {
        housing: "w-10 h-10 shrink-0 rounded-lg flex items-center justify-center bg-emerald-50 text-lg text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400",
        lending: "w-10 h-10 shrink-0 rounded-lg flex items-center justify-center bg-indigo-50 text-lg text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400",
        auto: "w-10 h-10 shrink-0 rounded-lg flex items-center justify-center bg-amber-50 text-lg text-amber-600 dark:bg-amber-950/40 dark:text-amber-400",
        growth: "w-10 h-10 shrink-0 rounded-lg flex items-center justify-center bg-purple-50 text-lg text-purple-600 dark:bg-purple-950/40 dark:text-purple-400",
        planning: "w-10 h-10 shrink-0 rounded-lg flex items-center justify-center bg-teal-50 text-lg text-teal-600 dark:bg-teal-950/40 dark:text-teal-400"
      };
      const linkClass = RELATED_LINK_CLASS;
      const titleClass = RELATED_TITLE_CLASS;
      const catalogGridClass = RELATED_GRID_CLASS;
      const GROUPS = [
        { key: "housing", label: "Housing" },
        { key: "lending", label: "Loans & credit" },
        { key: "auto", label: "Auto" },
        { key: "growth", label: "Interest & growth" },
        { key: "planning", label: "Retirement & planning" }
      ];
      const buckets = Object.fromEntries(GROUPS.map((g) => [g.key, []]));
      tools.forEach((tool) => {
        const key = toolAccent(tool.slug, tool.navGroup);
        (buckets[key] || buckets.lending).push(tool);
      });
      const card = (tool) => {
        const accent = toolAccent(tool.slug, tool.navGroup);
        return `<a href="${tool.path}" class="cn-dashboard-micro-card ${linkClass}"><div class="${iconClass[accent]}" aria-hidden="true">${ACCENT_EMOJI[accent]}</div><span class="${titleClass}">${tool.name}</span></a>`;
      };
      catalog.className = `cn-tools-dashboard ${RELATED_SECTION_WRAP_CLASS} px-4 sm:px-6 max-w-7xl mx-auto`;
      catalog.innerHTML = `<h2 class="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">All calculators</h2>${GROUPS.filter((g) => buckets[g.key].length)
        .map(
          (g) => `<section class="cn-tools-dashboard__category"><h3 class="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2"><span aria-hidden="true">${ACCENT_EMOJI[g.key]}</span><span>${g.label} calculators</span></h3><div class="${catalogGridClass}">${buckets[g.key].map(card).join("")}</div></section>`
        )
        .join("")}`;
    } catch (_e) {
      if (!hasStaticCards) {
        catalog.innerHTML = "<p class=\"muted\">Unable to load tools list.</p>";
      }
    }
  };

  const injectLegalDisclaimer = () => {
    const footer = document.querySelector(".site-footer .footer-content");
    if (!footer || footer.querySelector(".legal-disclaimer")) return;
    const disclaimer = document.createElement("p");
    disclaimer.className = "legal-disclaimer";
    disclaimer.textContent =
      "CalnexApp provides financial estimation tools for informational purposes only. We are not responsible for financial decisions made based on these calculations. Always consult a licensed financial advisor before making financial commitments.";
    footer.append(disclaimer);
  };

  const resolvePageId = () =>
    document.body?.dataset?.page ||
    document.querySelector("main[data-page]")?.dataset?.page ||
    "";

  const shouldLoadCalculatorStack = () => {
    const page = resolvePageId();
    if (typeof page === "string" && page.length > 0) {
      if (!document.body.dataset.page) {
        document.body.dataset.page = page;
      }
      return true;
    }
    return false;
  };

  const ensureScriptLoaded = (src) =>
    new Promise((resolve, reject) => {
      const resolved = asset(src);
      const existing = document.querySelector(`script[src="${resolved}"]`);
      if (existing) {
        if (existing.dataset.loaded === "true") {
          resolve();
          return;
        }
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)), { once: true });
        return;
      }
      const script = document.createElement("script");
      script.src = resolved;
      script.defer = true;
      script.dataset.globalLayer = "true";
      script.addEventListener("load", () => {
        script.dataset.loaded = "true";
        resolve();
      });
      script.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)));
      document.head.append(script);
    });

  const bootstrapGlobalLayers = async () => {
    try {
      await ensureScriptLoaded("/assets/js/parse-utils.js");
      await ensureScriptLoaded("/engine/financial-core.js");
      await ensureScriptLoaded("/engine/financial-validator.js");
      await ensureScriptLoaded("/assets/js/geo-finance.js");
      await ensureScriptLoaded("/assets/js/currency.js");
      await ensureScriptLoaded("/assets/js/geo-currency-sync.js");
      await ensureScriptLoaded("/assets/js/ui-renderer.js");
      await ensureScriptLoaded("/assets/js/app-render.js");
      await ensureScriptLoaded("/assets/js/app-engine.js");
      await ensureScriptLoaded("/assets/js/input-sync.js");
      if (window.GeoFinance?.init) {
        window.GeoFinance.init();
      }
      if (window.CurrencyLayer?.init) {
        window.CurrencyLayer.init();
      }
      if (window.UiRenderer?.init) {
        window.UiRenderer.init();
      }
      if (window.InputSyncLayer?.init) {
        window.InputSyncLayer.init();
      }
    } catch (error) {
      console.warn("[CalnexApp] Global layer bootstrap failed", error);
    }
  };

  const initSiteSearch = async () => {
    if (hasReactHeader()) return;
    try {
      await ensureScriptLoaded("/assets/js/site-search.js");
      if (window.CalnexSiteSearch?.init) {
        await window.CalnexSiteSearch.init();
      }
    } catch (err) {
      console.warn("[CalnexApp] Site search init failed", err);
    }
  };

  window.CalnexSiteChrome = {
    refreshHeader() {
      if (hasReactHeader()) {
        if (window.CurrencyLayer?.syncCurrencySymbols) {
          window.CurrencyLayer.syncCurrencySymbols();
        }
        return;
      }
      initThemeToggle();
      initSiteSearch();
      if (window.GeoFinance?.init) {
        window.GeoFinance.init();
      }
      if (window.CurrencyLayer?.init) {
        window.CurrencyLayer.init();
      }
      window.CalnexHeaderToolbar?.consolidate?.();
      window.CalnexGeoCurrency?.reconcile?.();
    },
  };

  ensureScriptLoaded("/assets/js/ui-enhancements.js").catch(() => {});

  const initGeoCurrencySync = async () => {
    try {
      await ensureScriptLoaded("/assets/js/geo-finance.js");
      await ensureScriptLoaded("/assets/js/currency.js");
      await ensureScriptLoaded("/assets/js/geo-currency-sync.js");
    } catch (_) {
      /* header scripts may load later on Next pages */
    }
  };
  initGeoCurrencySync();

  initHeaderChart();
  initThemeToggle();
  initSiteSearch();
  markActiveNav();
  initToolsNavDropdown();
  initMobileMenu();
  renderRelatedTools();
  renderBlogIndex();
  renderToolsHub();
  injectLegalDisclaimer();
  if (shouldLoadCalculatorStack()) {
    bootstrapGlobalLayers();
  }
})();
