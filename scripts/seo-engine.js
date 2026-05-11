const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SITE_URL = "https://calnexapp.com";
const REGISTRY_PATH = path.join(ROOT, "data", "seo-registry.json");
const SITEMAP_PATH = path.join(ROOT, "sitemap.xml");
const ROBOTS_PATH = path.join(ROOT, "robots.txt");

const TYPE_PRIORITY = {
  tool: "1.0",
  blog: "0.8",
  seo: "0.7"
};

const TYPE_SCHEMA = {
  tool: "WebApplication",
  blog: "Article",
  seo: "WebPage"
};

const normalizeUrl = (url) => {
  if (!url.startsWith("/")) return `/${url.replace(/^\/+/, "")}`;
  return url.endsWith("/") ? url : `${url}/`;
};

const urlToFilePath = (url) => {
  const clean = normalizeUrl(url);
  if (clean === "/") {
    return path.join(ROOT, "index.html");
  }
  return path.join(ROOT, clean.slice(1), "index.html");
};

const buildBreadcrumbSchema = (url, title) => {
  const segments = normalizeUrl(url).split("/").filter(Boolean);
  const items = [
    {
      "@type": "ListItem",
      position: 1,
      name: "Home",
      item: `${SITE_URL}/`
    }
  ];
  let acc = "";
  segments.forEach((segment, index) => {
    acc += `/${segment}`;
    items.push({
      "@type": "ListItem",
      position: index + 2,
      name: index === segments.length - 1 ? title : segment.replaceAll("-", " "),
      item: `${SITE_URL}${acc}/`
    });
  });
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items
  };
};

const buildPageSchema = (entry, pagePath) => {
  const stat = fs.statSync(pagePath);
  const dateModified = stat.mtime.toISOString();
  return {
    "@context": "https://schema.org",
    "@type": TYPE_SCHEMA[entry.type] || "WebPage",
    name: entry.title,
    description: entry.description || `${entry.title} - CalnexApp`,
    url: `${SITE_URL}${normalizeUrl(entry.url)}`,
    dateModified,
    breadcrumb: buildBreadcrumbSchema(entry.url, entry.title)
  };
};

const getRelatedEntries = (entries, current) => {
  const currentKeywords = new Set((current.keywords || []).map((value) => value.toLowerCase()));
  const scored = entries
    .filter((entry) => entry.url !== current.url)
    .map((entry) => {
      const score = (entry.keywords || []).reduce((sum, keyword) => {
        return sum + (currentKeywords.has(String(keyword).toLowerCase()) ? 1 : 0);
      }, 0);
      return { entry, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((item) => item.entry);
  return scored;
};

const injectSection = (html, markerStart, markerEnd, sectionHtml, beforeTag = "</main>") => {
  const startIndex = html.indexOf(markerStart);
  const endIndex = html.indexOf(markerEnd);
  if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
    return `${html.slice(0, startIndex)}${sectionHtml}${html.slice(endIndex + markerEnd.length)}`;
  }
  const insertIndex = html.indexOf(beforeTag);
  if (insertIndex === -1) return html;
  return `${html.slice(0, insertIndex)}${sectionHtml}\n${html.slice(insertIndex)}`;
};

const updatePage = (entry, entries) => {
  const pagePath = urlToFilePath(entry.url);
  if (!fs.existsSync(pagePath)) {
    return;
  }

  let html = fs.readFileSync(pagePath, "utf8");
  const related = getRelatedEntries(entries, entry);
  const relatedTitle = entry.type === "blog" ? "Related articles" : "Related tools/articles";
  const relatedSection = `
      <!-- SEO_ENGINE_RELATED_START -->
      <section class="card seo-related-block">
        <h2>${relatedTitle}</h2>
        <ul class="toc-list">
          ${related
            .map((item) => `<li><a href="${normalizeUrl(item.url)}">${item.title}</a></li>`)
            .join("")}
        </ul>
      </section>
      <!-- SEO_ENGINE_RELATED_END -->`;
  html = injectSection(
    html,
    "<!-- SEO_ENGINE_RELATED_START -->",
    "<!-- SEO_ENGINE_RELATED_END -->",
    relatedSection
  );

  const schemaJson = JSON.stringify(buildPageSchema(entry, pagePath), null, 2);
  const schemaBlock = `
    <!-- SEO_ENGINE_SCHEMA_START -->
    <script type="application/ld+json">
${schemaJson}
    </script>
    <!-- SEO_ENGINE_SCHEMA_END -->`;
  const schemaStart = html.indexOf("<!-- SEO_ENGINE_SCHEMA_START -->");
  const schemaEnd = html.indexOf("<!-- SEO_ENGINE_SCHEMA_END -->");
  if (schemaStart !== -1 && schemaEnd !== -1 && schemaEnd > schemaStart) {
    html = `${html.slice(0, schemaStart)}${schemaBlock}${html.slice(schemaEnd + "<!-- SEO_ENGINE_SCHEMA_END -->".length)}`;
  } else if (!html.includes("<script type=\"application/ld+json\">")) {
    html = html.replace("</head>", `${schemaBlock}\n  </head>`);
  } else {
    html = html.replace("</head>", `\n${schemaBlock}\n  </head>`);
  }

  fs.writeFileSync(pagePath, html, "utf8");
};

const generateSitemap = (entries) => {
  const urls = entries
    .map((entry) => {
      const pagePath = urlToFilePath(entry.url);
      if (!fs.existsSync(pagePath)) return null;
      const lastmod = fs.statSync(pagePath).mtime.toISOString().slice(0, 10);
      const priority = TYPE_PRIORITY[entry.type] || "0.6";
      return `  <url>
    <loc>${SITE_URL}${normalizeUrl(entry.url)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${priority}</priority>
  </url>`;
    })
    .filter(Boolean)
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
  fs.writeFileSync(SITEMAP_PATH, xml, "utf8");
};

const updateRobots = () => {
  const content = `User-agent: *
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml
`;
  fs.writeFileSync(ROBOTS_PATH, content, "utf8");
};

const run = () => {
  const entries = JSON.parse(fs.readFileSync(REGISTRY_PATH, "utf8")).map((entry) => ({
    ...entry,
    url: normalizeUrl(entry.url)
  }));
  entries.forEach((entry) => updatePage(entry, entries));
  generateSitemap(entries);
  updateRobots();
  console.log(`SEO engine complete. Processed ${entries.length} registry pages.`);
};

run();
