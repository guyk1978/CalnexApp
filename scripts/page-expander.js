const fs = require("fs");
const path = require("path");
const { renderGuidePage, parseKeyword, parseGuideSlug, toGuideSlug, toToolSlug } = require("./loan-scenario-core.cjs");

const ROOT = path.resolve(__dirname, "..");
const REGISTRY_PATH = path.join(ROOT, "data", "seo-registry.json");
const CLUSTERS_PATH = path.join(ROOT, "data", "keyword-clusters.json");
const OPPORTUNITIES_PATH = path.join(ROOT, "seo", "generated", "keyword-opportunities.json");
const GENERATED_ROOT = path.join(ROOT, "seo", "generated");
const REPORT_JSON_PATH = path.join(GENERATED_ROOT, "seo-opportunities-report.json");
const REPORT_MD_PATH = path.join(GENERATED_ROOT, "seo-opportunities-report.md");

const ensureDir = (dirPath) => fs.mkdirSync(dirPath, { recursive: true });
const dedupe = (values) => [...new Set(values.map((value) => value.toLowerCase().trim()))].filter(Boolean);

const slugify = (text) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

const inferIntent = (keyword) => {
  if (keyword.includes("calculator") || keyword.includes("monthly payment")) return "transactional";
  return "informational";
};

const scoreKeyword = (keyword, relatedPages, intent, trafficSignal = 0) => {
  const words = keyword.split(" ").filter(Boolean).length;
  const searchPotential = Math.min(100, 40 + words * 9 + (intent === "transactional" ? 15 : 5));
  const competition = Math.max(10, 80 - words * 8);
  const internalLinkStrength = Math.min(100, relatedPages.length * 18);
  const existingTraffic = trafficSignal || 0;
  const finalScore =
    searchPotential * 0.4 + (100 - competition) * 0.2 + internalLinkStrength * 0.3 + existingTraffic * 0.1;
  return {
    searchPotential,
    competition,
    internalLinkStrength,
    existingTraffic,
    finalScore: Number(finalScore.toFixed(2))
  };
};

const buildHtmlPage = (candidate) => {
  const relatedLinks = candidate.internalLinks
    .map((link) => `<li><a href="${link.url}">${link.title}</a></li>`)
    .join("");
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${candidate.title}</title>
    <meta name="description" content="${candidate.description}" />
    <link rel="canonical" href="https://calnexapp.com${candidate.url}" />
    <link rel="stylesheet" href="/assets/css/style.css" />
  </head>
  <body>
    <main class="container section-space">
      <section class="page-title">
        <p class="eyebrow">SEO Opportunity</p>
        <h1>${candidate.title}</h1>
        <p>${candidate.description}</p>
      </section>
      <section class="card">
        <h2>Target Keywords</h2>
        <p>${candidate.targetKeywords.join(", ")}</p>
      </section>
      <section class="card">
        <h2>Related tools/articles</h2>
        <ul class="toc-list">
          ${relatedLinks}
        </ul>
      </section>
      <section class="card">
        <a class="btn btn-primary" href="/tools/loan-calculator/">Customize this loan</a>
      </section>
    </main>
  </body>
</html>
`;
};

const run = () => {
  const registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, "utf8"));
  const clusters = JSON.parse(fs.readFileSync(CLUSTERS_PATH, "utf8"));
  const opportunityKeywords = JSON.parse(fs.readFileSync(OPPORTUNITIES_PATH, "utf8")).keywords || [];
  const covered = new Set(
    dedupe(registry.flatMap((entry) => [entry.title, ...(entry.keywords || [])])).map((value) => value.toLowerCase())
  );

  const candidates = [];
  opportunityKeywords.forEach((keyword) => {
    const normalized = keyword.toLowerCase();
    if (covered.has(normalized)) {
      return;
    }
    const matchingCluster = clusters.find((cluster) =>
      cluster.supporting_keywords.some((item) => normalized.includes(item.toLowerCase().split(" ")[0]))
    );
    if (!matchingCluster) return;

    const slug = slugify(keyword);
    const url = `/seo/generated/${slug}/`;
    const internalLinks = registry
      .filter((entry) =>
        (entry.keywords || []).some((item) => normalized.includes(String(item).toLowerCase().split(" ")[0]))
      )
      .slice(0, 3)
      .map((entry) => ({ url: entry.url, title: entry.title }));
    const intent = inferIntent(keyword);
    const score = scoreKeyword(keyword, internalLinks, intent, matchingCluster.traffic || 0);

    candidates.push({
      keyword,
      url,
      title: `${keyword.replace(/\b\w/g, (c) => c.toUpperCase())} | CalnexApp`,
      description: `Explore ${keyword} with practical scenarios, repayment planning guidance, and calculator support from CalnexApp.`,
      targetKeywords: [keyword, ...matchingCluster.supporting_keywords.slice(0, 2)],
      internalLinks,
      intent,
      score
    });
  });

  const topCandidates = candidates.sort((a, b) => b.score.finalScore - a.score.finalScore).slice(0, 30);
  ensureDir(GENERATED_ROOT);
  topCandidates.forEach((candidate) => {
    const folder = path.join(ROOT, candidate.url.slice(1));
    ensureDir(folder);

    const slugFromUrl = candidate.url.replace(/^\/seo\/generated\//, "").replace(/\/$/, "");
    let entry = parseKeyword(candidate.keyword) || parseGuideSlug(slugFromUrl);
    if (entry) {
      const guideSlug = toGuideSlug(toToolSlug(entry.loan_amount, entry.interest_rate, entry.loan_term));
      const out = renderGuidePage(entry, { forceNoindex: false });
      if (out.quality.pass) {
        fs.writeFileSync(path.join(folder, "index.html"), out.html, "utf8");
        return;
      }
    }
    // Non-loan keywords: thin stub with noindex to avoid polluting index
    const thin = buildHtmlPage(candidate).replace(
      "</head>",
      '    <meta name="robots" content="noindex,follow" />\n  </head>'
    );
    fs.writeFileSync(path.join(folder, "index.html"), thin, "utf8");
  });

  const report = {
    generated_at: new Date().toISOString(),
    total_candidates: candidates.length,
    selected_candidates: topCandidates.length,
    opportunities: topCandidates
  };
  fs.writeFileSync(REPORT_JSON_PATH, JSON.stringify(report, null, 2), "utf8");

  const reportMd = `# SEO Opportunities Report

- Generated at: ${report.generated_at}
- Total candidates evaluated: ${report.total_candidates}
- Selected pages: ${report.selected_candidates}

## Suggested New Pages

${topCandidates
  .map(
    (item, index) =>
      `${index + 1}. **${item.keyword}**\n   - URL: \`${item.url}\`\n   - Intent: ${item.intent}\n   - Score: ${item.score.finalScore}\n   - Internal links: ${item.internalLinks.map((link) => link.url).join(", ")}`
  )
  .join("\n\n")}
`;
  fs.writeFileSync(REPORT_MD_PATH, reportMd, "utf8");

  console.log(`Page expansion complete. Suggested pages: ${topCandidates.length}`);
};

run();
