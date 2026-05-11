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
    if (!blogList) return;
    try {
      const posts = await fetchJson("/data/blog.json");
      blogList.innerHTML = posts
        .map(
          (post) => `
          <article class="card blog-card">
            <p class="blog-meta">${post.date} • ${post.readTime}</p>
            <h2>${post.title}</h2>
            <p>${post.excerpt}</p>
            <a class="btn btn-ghost" href="/contact/">Request Full Article</a>
          </article>
        `
        )
        .join("");
    } catch (_error) {
      blogList.innerHTML = "<p class='muted'>Unable to load blog posts at this time.</p>";
    }
  };

  markActiveNav();
  renderRelatedTools();
  renderBlogIndex();
})();
