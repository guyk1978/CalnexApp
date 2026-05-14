(function () {
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

  const initThemeToggle = () => {
    const nav = document.querySelector(".site-header .nav");
    const brand = nav?.querySelector(".brand");
    if (!nav || !brand || document.getElementById("cn-theme-toggle")) return;

    const wrap = document.createElement("div");
    wrap.className = "cn-header-actions";

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

    brand.insertAdjacentElement("afterend", wrap);
    wrap.appendChild(btn);
    render();
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

  const renderRelatedTools = async () => {
    const holder = document.querySelector("[data-related-tools]");
    if (!holder) return;

    const currentSlug = holder.dataset.currentTool || "";
    try {
      const tools = await fetchJson("/data/tools.json");
      const related = tools.filter((tool) => tool.slug !== currentSlug).slice(0, 3);
      holder.innerHTML = `
        <h2>Related Tools</h2>
        <div class="related-tools-grid">
          ${related
            .map(
              (tool) => `
            <article class="card tool-card cn-card-interactive">
              <h3>${tool.name}</h3>
              <p class="muted">${tool.description}</p>
              <a class="btn btn-ghost" href="${tool.path}">Open Tool</a>
            </article>
          `
            )
            .join("")}
        </div>
      `;
    } catch (_error) {
      holder.innerHTML = "<p class='muted'>Related tools are unavailable right now.</p>";
    }
  };

  const renderBlogIndex = async () => {
    const blogList = document.getElementById("blogList");
    const featuredBlogList = document.getElementById("featuredBlogList");
    const filtersHolder = document.getElementById("blogCategoryFilters");
    const searchInput = document.getElementById("blogSearchInput");
    if (!blogList || !featuredBlogList || !filtersHolder || !searchInput) return;
    try {
      const posts = await fetchJson("/data/blog.json");
      const categories = ["All", ...new Set(posts.map((post) => post.category))];
      let activeCategory = "All";
      let activeQuery = "";

      const card = (post) => `
        <article class="card blog-card">
          <p class="blog-meta">${post.updatedDate} • ${post.readTime} • ${post.category}</p>
          <h3>${post.title}</h3>
          <p>${post.excerpt}</p>
          <a class="btn btn-ghost" href="/blog/${post.slug}/">Read Article</a>
        </article>
      `;

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
    const grid = document.getElementById("cn-tools-hub-grid");
    if (!grid) return;
    try {
      const tools = await fetchJson("/data/tools.json");
      grid.innerHTML = tools
        .map(
          (tool) => `
        <article class="card tool-card cn-tool-card-link cn-card-interactive">
          <h2>${tool.name}</h2>
          <p class="muted">${tool.description}</p>
          <a class="btn btn-primary" href="${tool.path}">Open</a>
        </article>
      `
        )
        .join("");
    } catch (_e) {
      grid.innerHTML = "<p class=\"muted\">Unable to load tools list.</p>";
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

  const shouldLoadCalculatorStack = () => {
    const page = document.body?.dataset?.page;
    return typeof page === "string" && page.length > 0;
  };

  const ensureScriptLoaded = (src) =>
    new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${src}"]`);
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
      script.src = src;
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

  initThemeToggle();
  markActiveNav();
  initMobileMenu();
  renderRelatedTools();
  renderBlogIndex();
  renderToolsHub();
  injectLegalDisclaimer();
  if (shouldLoadCalculatorStack()) {
    bootstrapGlobalLayers();
  }
})();
