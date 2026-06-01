/**
 * Build data/site-inventory.json — master list for cannibalization checks.
 * Run: node scripts/build-site-inventory.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function copyFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function readJson(rel) {
  const p = path.join(ROOT, rel);
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function listLoanScenarios() {
  const base = path.join(ROOT, "tools", "loan-calculator");
  if (!fs.existsSync(base)) return [];
  return fs
    .readdirSync(base, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name !== "index.html")
    .filter((d) => fs.existsSync(path.join(base, d.name, "index.html")))
    .map((d) => ({
      type: "loan-scenario",
      slug: d.name,
      title: d.name.replace(/-/g, " "),
      url: `/tools/loan-calculator/${d.name}/`,
      keywords: [],
      category: "Loan scenarios"
    }))
    .sort((a, b) => a.slug.localeCompare(b.slug));
}

function normalizeKeyword(k) {
  return String(k || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

function collectKeywordMap(items) {
  const map = new Map();
  for (const item of items) {
    const keys = [...(item.keywords || [])];
    if (item.primary_keyword) keys.push(item.primary_keyword);
    for (const raw of keys) {
      const k = normalizeKeyword(raw);
      if (!k || k.length < 3) continue;
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(item.url);
    }
  }
  return map;
}

function main() {
  const tools = readJson("data/tools.json");
  const blog = readJson("data/blog.json");
  const registry = readJson("data/seo-registry.json");
  const scenarios = listLoanScenarios();

  const items = [];

  for (const t of tools) {
    items.push({
      type: "core-calculator",
      slug: t.slug,
      title: t.name,
      url: t.path,
      category: t.navGroup || "tools",
      keywords: t.keywords || [],
      description: t.hubDescription || t.description || ""
    });
  }

  for (const b of blog) {
    items.push({
      type: "blog",
      slug: b.slug,
      title: b.title,
      url: `/blog/${b.slug}/`,
      category: b.category || "Blog",
      keywords: b.primary_keyword ? [b.primary_keyword] : [],
      primary_keyword: b.primary_keyword || "",
      featured: Boolean(b.featured),
      description: b.excerpt || ""
    });
  }

  items.push(...scenarios);

  const knownUrls = new Set(items.map((i) => i.url.replace(/\/$/, "")));
  for (const row of registry) {
    const url = row.url.startsWith("/") ? row.url : `/${row.url}`;
    const norm = url.replace(/\/$/, "");
    if (knownUrls.has(norm)) continue;
    items.push({
      type: row.type || "seo",
      slug: norm.split("/").filter(Boolean).pop() || norm,
      title: row.title,
      url: url.endsWith("/") ? url : `${url}/`,
      category: row.category || row.type || "seo",
      keywords: row.keywords || [],
      description: ""
    });
  }

  const keywordMap = collectKeywordMap(items);
  const conflicts = [];
  for (const [keyword, urls] of keywordMap) {
    if (urls.length > 1) {
      conflicts.push({ keyword, urls: [...new Set(urls)].sort() });
    }
  }
  conflicts.sort((a, b) => b.urls.length - a.urls.length);

  const payload = {
    generatedAt: new Date().toISOString(),
    counts: {
      total: items.length,
      calculators: items.filter((i) => i.type === "core-calculator").length,
      blog: items.filter((i) => i.type === "blog").length,
      loanScenarios: items.filter((i) => i.type === "loan-scenario").length,
      other: items.filter((i) => !["core-calculator", "blog", "loan-scenario"].includes(i.type)).length,
      keywordConflicts: conflicts.length
    },
    conflicts,
    items: items.sort((a, b) => a.title.localeCompare(b.title))
  };

  const json = JSON.stringify(payload, null, 2);
  const dataPaths = [
    path.join(ROOT, "data", "site-inventory.json"),
    path.join(ROOT, "public", "data", "site-inventory.json")
  ];
  for (const p of dataPaths) {
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, json, "utf8");
  }

  const dataJs = `window.__SITE_INVENTORY__=${JSON.stringify(payload)};\n`;
  const dataJsPublic = path.join(ROOT, "public", "assets", "js", "site-inventory-data.js");
  const dataJsAssets = path.join(ROOT, "assets", "js", "site-inventory-data.js");
  fs.mkdirSync(path.dirname(dataJsPublic), { recursive: true });
  fs.writeFileSync(dataJsPublic, dataJs, "utf8");
  fs.writeFileSync(dataJsAssets, dataJs, "utf8");

  const uiJs = path.join(ROOT, "public", "assets", "js", "site-inventory.js");
  if (fs.existsSync(uiJs)) {
    copyFile(uiJs, path.join(ROOT, "assets", "js", "site-inventory.js"));
  }

  const v = payload.generatedAt.replace(/[:.]/g, "").slice(0, 15);
  const htmlPath = path.join(ROOT, "site-inventory", "index.html");
  let html = fs.readFileSync(htmlPath, "utf8");
  html = html.replace(
    /src="\/assets\/js\/site-inventory-data\.js[^"]*"/,
    `src="/assets/js/site-inventory-data.js?v=${v}"`
  );
  html = html.replace(
    /src="\/assets\/js\/site-inventory\.js[^"]*"/,
    `src="/assets/js/site-inventory.js?v=${v}"`
  );
  if (!html.includes("site-inventory-data.js")) {
    html = html.replace(
      '<script src="/assets/js/site-inventory.js',
      '<script src="/assets/js/site-inventory-data.js"></script>\n    <script src="/assets/js/site-inventory.js'
    );
  }
  fs.writeFileSync(htmlPath, html, "utf8");

  console.log(
    `build-site-inventory: ${payload.counts.total} URLs (${payload.counts.calculators} calculators, ${payload.counts.blog} blog, ${payload.counts.loanScenarios} scenarios) — ${payload.counts.keywordConflicts} keyword overlaps`
  );
}

main();
