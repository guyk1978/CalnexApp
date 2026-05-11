const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SITE_URL = "https://calnexapp.com";
const REGISTRY_PATH = path.join(ROOT, "data", "seo-registry.json");

const normalizeUrl = (url) => {
  if (!url.startsWith("/")) return `/${url}`;
  return url.endsWith("/") ? url : `${url}/`;
};

const urlToFilePath = (url) => {
  const clean = normalizeUrl(url);
  if (clean === "/") return path.join(ROOT, "index.html");
  return path.join(ROOT, clean.slice(1), "index.html");
};

const ensureDir = (dir) => fs.mkdirSync(dir, { recursive: true });

const injectByMarkers = (html, start, end, block, before = "</main>") => {
  const startIdx = html.indexOf(start);
  const endIdx = html.indexOf(end);
  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    return `${html.slice(0, startIdx)}${block}${html.slice(endIdx + end.length)}`;
  }
  const insertIdx = html.indexOf(before);
  if (insertIdx === -1) return html;
  return `${html.slice(0, insertIdx)}${block}\n${html.slice(insertIdx)}`;
};

const renderLinks = (items) =>
  items.map((item) => `<li><a href="${item.url}">${item.title}</a> <span class="muted">(${item.lastmod})</span></li>`).join("");

const buildLatestPage = (title, description, items, type) => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    <meta name="description" content="${description}" />
    <link rel="canonical" href="${SITE_URL}/${type}/latest/" />
    <link rel="stylesheet" href="/assets/css/style.css" />
  </head>
  <body>
    <header class="site-header">
      <div class="container nav">
        <a href="/" class="brand">CalnexApp</a>
        <nav class="menu">
          <a href="/" data-nav-link>Home</a>
          <a href="/tools/" data-nav-link>Tools</a>
          <a href="/blog/" data-nav-link>Blog</a>
          <a href="/about/" data-nav-link>About</a>
          <a href="/contact/" data-nav-link>Contact</a>
        </nav>
      </div>
    </header>
    <main class="container section-space">
      <section class="page-title">
        <p class="eyebrow">Recently Updated</p>
        <h1>${title}</h1>
        <p>${description}</p>
      </section>
      <section class="card">
        <ol class="toc-list">
          ${renderLinks(items)}
        </ol>
      </section>
    </main>
    <footer class="site-footer">
      <div class="container footer-content">
        <p>&copy; <span id="year"></span> CalnexApp. All rights reserved.</p>
      </div>
    </footer>
    <script src="/assets/js/app.js" defer></script>
  </body>
</html>
`;

const run = () => {
  const registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, "utf8"))
    .map((entry) => {
      const pagePath = urlToFilePath(entry.url);
      if (!fs.existsSync(pagePath)) return null;
      return {
        ...entry,
        url: normalizeUrl(entry.url),
        pagePath,
        lastmod: fs.statSync(pagePath).mtime.toISOString().slice(0, 10),
        mtime: fs.statSync(pagePath).mtime.getTime()
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.mtime - a.mtime);

  const latestTools = registry.filter((item) => item.type === "tool").slice(0, 10);
  const latestBlogs = registry.filter((item) => item.type === "blog").slice(0, 10);
  const latestSeo = registry.filter((item) => item.type === "seo").slice(0, 10);
  const latestOverall = [...latestTools.slice(0, 4), ...latestBlogs.slice(0, 3), ...latestSeo.slice(0, 3)];

  // Ensure /tools/index.html exists and is kept fresh.
  const toolsIndexPath = path.join(ROOT, "tools", "index.html");
  if (!fs.existsSync(toolsIndexPath)) {
    ensureDir(path.dirname(toolsIndexPath));
    fs.writeFileSync(
      toolsIndexPath,
      `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>CalnexApp Tools</title>
    <meta name="description" content="Browse all CalnexApp financial tools and latest calculator updates." />
    <link rel="canonical" href="${SITE_URL}/tools/" />
    <link rel="stylesheet" href="/assets/css/style.css" />
  </head>
  <body>
    <header class="site-header"><div class="container nav"><a href="/" class="brand">CalnexApp</a></div></header>
    <main class="container section-space">
      <section class="page-title"><p class="eyebrow">Tools</p><h1>All Financial Tools</h1><p>Explore calculators and latest updates.</p></section>
    </main>
    <footer class="site-footer"><div class="container footer-content"><p>&copy; <span id="year"></span> CalnexApp. All rights reserved.</p></div></footer>
    <script src="/assets/js/app.js" defer></script>
  </body>
</html>`,
      "utf8"
    );
  }

  const homePath = path.join(ROOT, "index.html");
  let homeHtml = fs.readFileSync(homePath, "utf8");
  const homeRecentBlock = `
      <!-- ILB_HOME_RECENT_START -->
      <section class="container section-space card">
        <h2>Recently updated</h2>
        <ul class="toc-list">
          ${renderLinks(latestOverall)}
        </ul>
      </section>
      <!-- ILB_HOME_RECENT_END -->`;
  homeHtml = injectByMarkers(homeHtml, "<!-- ILB_HOME_RECENT_START -->", "<!-- ILB_HOME_RECENT_END -->", homeRecentBlock, "</main>");
  fs.writeFileSync(homePath, homeHtml, "utf8");

  let toolsHtml = fs.readFileSync(toolsIndexPath, "utf8");
  const toolsLatestBlock = `
      <!-- ILB_TOOLS_LATEST_START -->
      <section class="card">
        <h2>Latest Tools</h2>
        <ul class="toc-list">
          ${renderLinks(latestTools)}
        </ul>
      </section>
      <section class="card">
        <h2>Latest SEO Scenarios</h2>
        <ul class="toc-list">
          ${renderLinks(latestSeo)}
        </ul>
      </section>
      <!-- ILB_TOOLS_LATEST_END -->`;
  toolsHtml = injectByMarkers(toolsHtml, "<!-- ILB_TOOLS_LATEST_START -->", "<!-- ILB_TOOLS_LATEST_END -->", toolsLatestBlock);
  fs.writeFileSync(toolsIndexPath, toolsHtml, "utf8");

  const blogPath = path.join(ROOT, "blog", "index.html");
  let blogHtml = fs.readFileSync(blogPath, "utf8");
  const blogLatestBlock = `
      <!-- ILB_BLOG_LATEST_START -->
      <section class="card">
        <h2>Recently updated</h2>
        <ul class="toc-list">
          ${renderLinks(latestBlogs)}
        </ul>
      </section>
      <!-- ILB_BLOG_LATEST_END -->`;
  blogHtml = injectByMarkers(blogHtml, "<!-- ILB_BLOG_LATEST_START -->", "<!-- ILB_BLOG_LATEST_END -->", blogLatestBlock);
  fs.writeFileSync(blogPath, blogHtml, "utf8");

  ensureDir(path.join(ROOT, "tools", "latest"));
  ensureDir(path.join(ROOT, "blog", "latest"));
  ensureDir(path.join(ROOT, "seo", "latest"));
  fs.writeFileSync(
    path.join(ROOT, "tools", "latest", "index.html"),
    buildLatestPage("Latest Tool Updates", "Newest tools and calculator scenarios added to CalnexApp.", [...latestTools, ...latestSeo].slice(0, 10), "tools"),
    "utf8"
  );
  fs.writeFileSync(
    path.join(ROOT, "blog", "latest", "index.html"),
    buildLatestPage("Latest Blog Updates", "Newest finance guides and educational content from CalnexApp.", latestBlogs, "blog"),
    "utf8"
  );
  fs.writeFileSync(
    path.join(ROOT, "seo", "latest", "index.html"),
    buildLatestPage("Latest SEO Pages", "Newest programmatic SEO pages generated by CalnexApp.", latestSeo, "seo"),
    "utf8"
  );

  console.log(
    `Internal link booster complete. Linked ${latestOverall.length} recent pages and generated latest hub pages.`
  );
};

run();
