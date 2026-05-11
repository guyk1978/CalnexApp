const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const REGISTRY_PATH = path.join(ROOT, "data", "seo-registry.json");
const INTENTS_PATH = path.join(ROOT, "seo", "generated", "keyword-intents.json");
const GAPS_PATH = path.join(ROOT, "seo", "generated", "high-value-page-suggestions.json");
const REPORT_PATH = path.join(ROOT, "seo", "ranking-report.json");

const normalizeUrl = (url) => {
  if (!url.startsWith("/")) return `/${url}`;
  return url.endsWith("/") ? url : `${url}/`;
};

const urlToFilePath = (url) => {
  const clean = normalizeUrl(url);
  if (clean === "/") return path.join(ROOT, "index.html");
  return path.join(ROOT, clean.slice(1), "index.html");
};

const injectSection = (html, markerStart, markerEnd, sectionHtml, beforeTag = "</main>") => {
  const start = html.indexOf(markerStart);
  const end = html.indexOf(markerEnd);
  if (start !== -1 && end !== -1 && end > start) {
    return `${html.slice(0, start)}${sectionHtml}${html.slice(end + markerEnd.length)}`;
  }
  const insertAt = html.indexOf(beforeTag);
  if (insertAt === -1) return html;
  return `${html.slice(0, insertAt)}${sectionHtml}\n${html.slice(insertAt)}`;
};

const injectHeadSection = (html, markerStart, markerEnd, sectionHtml) => {
  const start = html.indexOf(markerStart);
  const end = html.indexOf(markerEnd);
  if (start !== -1 && end !== -1 && end > start) {
    return `${html.slice(0, start)}${sectionHtml}${html.slice(end + markerEnd.length)}`;
  }
  return html.replace("</head>", `${sectionHtml}\n  </head>`);
};

const countInternalLinks = (html) => (html.match(/href="\/(?!\/)/g) || []).length;
const countWords = (html) =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean).length;

const expectedIntentByType = {
  tool: "transactional",
  blog: "informational",
  seo: "commercial"
};

const loadIntentMap = () => {
  if (!fs.existsSync(INTENTS_PATH)) return new Map();
  const intentData = JSON.parse(fs.readFileSync(INTENTS_PATH, "utf8"));
  const map = new Map();
  (intentData.classified_keywords || []).forEach((item) => map.set(String(item.keyword).toLowerCase(), item.intent));
  return map;
};

const buildRelatedByType = (entries, type, currentUrl, count = 3) =>
  entries.filter((entry) => entry.type === type && entry.url !== currentUrl).slice(0, count);

const run = () => {
  const registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, "utf8")).map((entry) => ({
    ...entry,
    url: normalizeUrl(entry.url)
  }));
  const intentMap = loadIntentMap();
  const reportRows = [];

  registry.forEach((entry) => {
    const filePath = urlToFilePath(entry.url);
    if (!fs.existsSync(filePath)) return;
    let html = fs.readFileSync(filePath, "utf8");

    const relatedTools = buildRelatedByType(registry, "tool", entry.url, 3);
    const relatedBlogs = buildRelatedByType(registry, "blog", entry.url, 3);

    if (entry.type === "tool") {
      const faqBlock = `
      <!-- RANK_TOOL_FAQ_START -->
      <section class="card">
        <h2>Loan Tool FAQ</h2>
        <details><summary>How should I compare calculator outputs?</summary><p>Compare monthly payment, total interest, and payoff speed together.</p></details>
        <details><summary>Can this tool help with planning extra payments?</summary><p>Yes. Test baseline and accelerated scenarios to estimate savings.</p></details>
      </section>
      <!-- RANK_TOOL_FAQ_END -->`;
      const comparisonBlock = `
      <!-- RANK_TOOL_COMPARISON_START -->
      <section class="card">
        <h2>Comparison section</h2>
        <p class="muted">Compare this calculator with related tools for different borrowing scenarios.</p>
        <ul class="toc-list">
          ${relatedTools.slice(0, 2).map((item) => `<li><a href="${item.url}">${item.title}</a></li>`).join("")}
        </ul>
      </section>
      <!-- RANK_TOOL_COMPARISON_END -->`;
      html = injectSection(html, "<!-- RANK_TOOL_FAQ_START -->", "<!-- RANK_TOOL_FAQ_END -->", faqBlock);
      html = injectSection(
        html,
        "<!-- RANK_TOOL_COMPARISON_START -->",
        "<!-- RANK_TOOL_COMPARISON_END -->",
        comparisonBlock
      );
    }

    if (entry.type === "blog") {
      const ctaBlock = `
      <!-- RANK_BLOG_CTA_START -->
      <section class="card">
        <h2>Next step: run a live scenario</h2>
        <p class="muted">Apply this guide directly in the calculator to test your assumptions.</p>
        <a class="btn btn-primary" href="/tools/loan-calculator/">Open Loan Calculator</a>
      </section>
      <!-- RANK_BLOG_CTA_END -->`;
      const linksBlock = `
      <!-- RANK_BLOG_TOOLS_START -->
      <section class="card">
        <h2>Recommended calculators</h2>
        <ul class="toc-list">
          ${relatedTools.map((item) => `<li><a href="${item.url}">${item.title}</a></li>`).join("")}
        </ul>
      </section>
      <!-- RANK_BLOG_TOOLS_END -->`;
      const faqSchema = `
    <!-- RANK_BLOG_FAQ_SCHEMA_START -->
    <script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "How can I use this guide to improve loan decisions?",
      "acceptedAnswer": { "@type": "Answer", "text": "Use the guide with calculator scenarios and compare total interest outcomes." }
    },
    {
      "@type": "Question",
      "name": "Should I compare this topic across loan types?",
      "acceptedAnswer": { "@type": "Answer", "text": "Yes. Cross-compare mortgage, personal, and auto loan assumptions." }
    }
  ]
}
    </script>
    <!-- RANK_BLOG_FAQ_SCHEMA_END -->`;
      html = injectSection(html, "<!-- RANK_BLOG_CTA_START -->", "<!-- RANK_BLOG_CTA_END -->", ctaBlock);
      html = injectSection(html, "<!-- RANK_BLOG_TOOLS_START -->", "<!-- RANK_BLOG_TOOLS_END -->", linksBlock);
      html = injectHeadSection(html, "<!-- RANK_BLOG_FAQ_SCHEMA_START -->", "<!-- RANK_BLOG_FAQ_SCHEMA_END -->", faqSchema);
    }

    if (entry.type === "seo") {
      const seoBlock = `
      <!-- RANK_SEO_BLOCK_START -->
      <section class="card">
        <h2>Try this scenario in the calculator</h2>
        <a class="btn btn-primary" href="/tools/loan-calculator/">Open calculator</a>
      </section>
      <section class="card">
        <h2>Explanation</h2>
        <p>This page is part of CalnexApp scenario planning. Compare rates, term length, and total interest before choosing an offer.</p>
      </section>
      <section class="card">
        <h2>Related blog guides</h2>
        <ul class="toc-list">
          ${relatedBlogs.map((item) => `<li><a href="${item.url}">${item.title}</a></li>`).join("")}
        </ul>
      </section>
      <!-- RANK_SEO_BLOCK_END -->`;
      html = injectSection(html, "<!-- RANK_SEO_BLOCK_START -->", "<!-- RANK_SEO_BLOCK_END -->", seoBlock);
    }

    fs.writeFileSync(filePath, html, "utf8");

    const internalLinks = countInternalLinks(html);
    const words = countWords(html);
    const keywordHits = (entry.keywords || []).filter((kw) => html.toLowerCase().includes(String(kw).toLowerCase())).length;
    const keywordCoverage = entry.keywords && entry.keywords.length > 0 ? Math.round((keywordHits / entry.keywords.length) * 100) : 50;
    const linkScore = Math.min(100, internalLinks * 8);
    const depthScore = Math.min(100, Math.round((words / 900) * 100));
    const detectedIntent = intentMap.get(String((entry.keywords || [entry.title])[0] || "").toLowerCase()) || "commercial";
    const intentMatch = detectedIntent === expectedIntentByType[entry.type] ? 100 : 65;
    const rankingScore = Math.round(keywordCoverage * 0.3 + linkScore * 0.25 + depthScore * 0.25 + intentMatch * 0.2);

    reportRows.push({
      url: entry.url,
      type: entry.type,
      title: entry.title,
      metrics: {
        keyword_coverage: keywordCoverage,
        internal_links_count: internalLinks,
        content_depth_words: words,
        intent_match_score: intentMatch
      },
      ranking_score: rankingScore
    });
  });

  const topPages = [...reportRows].sort((a, b) => b.ranking_score - a.ranking_score).slice(0, 6);
  const homePath = path.join(ROOT, "index.html");
  if (fs.existsSync(homePath)) {
    let homeHtml = fs.readFileSync(homePath, "utf8");
    const featured = `
      <!-- RANK_FEATURED_START -->
      <section class="container section-space card">
        <h2>Featured pages</h2>
        <ul class="toc-list">
          ${topPages.map((item) => `<li><a href="${item.url}">${item.title}</a></li>`).join("")}
        </ul>
      </section>
      <!-- RANK_FEATURED_END -->`;
    homeHtml = injectSection(homeHtml, "<!-- RANK_FEATURED_START -->", "<!-- RANK_FEATURED_END -->", featured, "</main>");
    fs.writeFileSync(homePath, homeHtml, "utf8");
  }

  const gaps = fs.existsSync(GAPS_PATH) ? JSON.parse(fs.readFileSync(GAPS_PATH, "utf8")) : { high_value_page_suggestions: [] };
  const pagesNeedingImprovement = reportRows.filter((row) => row.ranking_score < 65).sort((a, b) => a.ranking_score - b.ranking_score);
  const highPotential = reportRows.filter((row) => row.ranking_score >= 65 && row.ranking_score < 85);
  const topPerforming = reportRows.filter((row) => row.ranking_score >= 85);

  const report = {
    generated_at: new Date().toISOString(),
    summary: {
      total_pages: reportRows.length,
      pages_need_improvement: pagesNeedingImprovement.length,
      pages_high_potential: highPotential.length,
      top_performing_pages: topPerforming.length
    },
    pages_need_improvement: pagesNeedingImprovement.slice(0, 30),
    pages_high_potential: highPotential.slice(0, 30),
    top_performing_pages: topPerforming.slice(0, 30),
    ranking_scores: reportRows.sort((a, b) => b.ranking_score - a.ranking_score),
    missing_keyword_opportunities: (gaps.high_value_page_suggestions || []).slice(0, 30)
  };

  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), "utf8");
  console.log(`Ranking optimization complete. Scored pages: ${reportRows.length}`);
};

run();
