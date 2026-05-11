(function () {
  const yearNode = document.getElementById("year");
  if (yearNode) {
    yearNode.textContent = new Date().getFullYear();
  }

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
            <article class="card tool-card">
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

  markActiveNav();
  renderRelatedTools();
  renderBlogIndex();
})();
