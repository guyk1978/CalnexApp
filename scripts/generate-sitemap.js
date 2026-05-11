const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SITE_URL = "https://calnexapp.com";
const OUTPUT_SITEMAP = path.join(ROOT, "sitemap.xml");
const OUTPUT_ROBOTS = path.join(ROOT, "robots.txt");

const toPosix = (value) => value.replaceAll("\\", "/");
const normalizeDirUrl = (relativeDir) => {
  if (!relativeDir || relativeDir === ".") return "/";
  return `/${toPosix(relativeDir).replace(/^\/+/, "").replace(/\/+$/, "")}/`;
};

const collectIndexPages = (baseRelativeDir) => {
  const baseAbsDir = path.join(ROOT, baseRelativeDir);
  if (!fs.existsSync(baseAbsDir)) return [];

  const found = [];
  const walk = (currentAbs) => {
    for (const entry of fs.readdirSync(currentAbs, { withFileTypes: true })) {
      const entryAbs = path.join(currentAbs, entry.name);
      if (entry.isDirectory()) {
        walk(entryAbs);
      } else if (entry.isFile() && entry.name === "index.html") {
        const relativeFile = path.relative(ROOT, entryAbs);
        const relativeDir = path.dirname(relativeFile);
        found.push({
          relativeDir,
          absPath: entryAbs,
          lastmod: fs.statSync(entryAbs).mtime.toISOString().slice(0, 10)
        });
      }
    }
  };
  walk(baseAbsDir);
  return found;
};

const uniqueBy = (list, getKey) => {
  const seen = new Set();
  return list.filter((item) => {
    const key = getKey(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const buildEntries = () => {
  const staticPages = [
    { relativeDir: ".", file: path.join(ROOT, "index.html"), priority: "1.0", changefreq: "weekly" },
    { relativeDir: "about", file: path.join(ROOT, "about", "index.html"), priority: "0.7", changefreq: "monthly" },
    { relativeDir: "contact", file: path.join(ROOT, "contact", "index.html"), priority: "0.6", changefreq: "yearly" }
  ]
    .filter((page) => fs.existsSync(page.file))
    .map((page) => ({
      path: normalizeDirUrl(page.relativeDir),
      lastmod: fs.statSync(page.file).mtime.toISOString().slice(0, 10),
      priority: page.priority,
      changefreq: page.changefreq
    }));

  const toolPages = collectIndexPages("tools").map((page) => ({
    path: normalizeDirUrl(page.relativeDir),
    lastmod: page.lastmod,
    priority: page.relativeDir === "tools/loan-calculator" ? "0.9" : "0.8",
    changefreq: "weekly"
  }));

  const blogPages = collectIndexPages("blog").map((page) => ({
    path: normalizeDirUrl(page.relativeDir),
    lastmod: page.lastmod,
    priority: page.relativeDir === "blog" ? "0.85" : "0.75",
    changefreq: page.relativeDir === "blog" ? "weekly" : "monthly"
  }));

  const seoGeneratedPages = collectIndexPages(path.join("seo", "generated")).map((page) => ({
    path: normalizeDirUrl(page.relativeDir),
    lastmod: page.lastmod,
    priority: "0.65",
    changefreq: "monthly"
  }));

  const all = uniqueBy([...staticPages, ...toolPages, ...blogPages, ...seoGeneratedPages], (item) => item.path);
  return all.sort((a, b) => a.path.localeCompare(b.path));
};

const buildSitemapXml = (entries) => {
  const body = entries
    .map(
      (entry) => `  <url>
    <loc>${SITE_URL}${entry.path}</loc>
    <lastmod>${entry.lastmod}</lastmod>
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority}</priority>
  </url>`
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`;
};

const writeRobots = () => {
  const robots = `User-agent: *
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml
`;
  fs.writeFileSync(OUTPUT_ROBOTS, robots, "utf8");
};

const run = () => {
  const entries = buildEntries();
  fs.writeFileSync(OUTPUT_SITEMAP, buildSitemapXml(entries), "utf8");
  writeRobots();
  console.log(`Sitemap generated with ${entries.length} URLs.`);
};

run();
