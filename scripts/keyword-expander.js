const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const REGISTRY_PATH = path.join(ROOT, "data", "seo-registry.json");
const CLUSTERS_PATH = path.join(ROOT, "data", "keyword-clusters.json");
const OPPORTUNITIES_PATH = path.join(ROOT, "seo", "generated", "keyword-opportunities.json");

const ensureDir = (dirPath) => fs.mkdirSync(dirPath, { recursive: true });

const dedupe = (values) => [...new Set(values.map((value) => value.toLowerCase().trim()))].filter(Boolean);

const titleFromUrl = (url) =>
  url
    .split("/")
    .filter(Boolean)
    .slice(-1)[0]
    .replaceAll("-", " ")
    .trim();

const getMainTopic = (entry) => {
  if (entry.type === "tool") return "Loan Calculators";
  if (entry.type === "blog") return "Loan Education";
  return "Programmatic Loan Scenarios";
};

const getIntent = (entry) => (entry.type === "tool" ? "transactional" : "informational");

const expandLongTail = (keyword, entry) => {
  const clean = keyword.toLowerCase();
  const base = [
    `${clean} calculator`,
    `${clean} with extra payments`,
    `${clean} for beginners`
  ];
  if (entry.url.includes("loan-calculator") && /\d/.test(entry.url)) {
    const scenario = titleFromUrl(entry.url);
    base.push(`how much interest on ${scenario}`);
    base.push(`${scenario} monthly payment calculator`);
  }
  return base;
};

const expandQuestions = (keyword) => {
  const clean = keyword.toLowerCase();
  return [
    `how does ${clean} work`,
    `is ${clean} worth it`,
    `how to reduce ${clean}`
  ];
};

const expandComparisons = (registry) => {
  const existing = registry.map((entry) => entry.title.toLowerCase());
  const comparisons = ["loan vs mortgage", "fixed vs variable interest", "15 vs 30 year loan"];
  return comparisons.filter((item) => !existing.some((title) => title.includes(item)));
};

const buildClusters = (registry) => {
  const clusterMap = new Map();
  const keywordPool = [];

  registry.forEach((entry) => {
    const topic = getMainTopic(entry);
    if (!clusterMap.has(topic)) {
      clusterMap.set(topic, {
        main_topic: topic,
        supporting_keywords: [],
        related_pages: [],
        search_intent: getIntent(entry)
      });
    }

    const cluster = clusterMap.get(topic);
    cluster.related_pages.push(entry.url);
    (entry.keywords || []).forEach((keyword) => {
      cluster.supporting_keywords.push(keyword);
      keywordPool.push(keyword);
      expandLongTail(keyword, entry).forEach((item) => keywordPool.push(item));
      expandQuestions(keyword).forEach((item) => keywordPool.push(item));
    });
  });

  expandComparisons(registry).forEach((item) => keywordPool.push(item));

  const clusters = Array.from(clusterMap.values()).map((cluster) => ({
    ...cluster,
    supporting_keywords: dedupe(cluster.supporting_keywords).slice(0, 40),
    related_pages: dedupe(cluster.related_pages)
  }));

  return {
    clusters,
    opportunities: dedupe(keywordPool).sort()
  };
};

const run = () => {
  const registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, "utf8"));
  const { clusters, opportunities } = buildClusters(registry);

  fs.writeFileSync(CLUSTERS_PATH, JSON.stringify(clusters, null, 2), "utf8");
  ensureDir(path.dirname(OPPORTUNITIES_PATH));
  fs.writeFileSync(
    OPPORTUNITIES_PATH,
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        keywords: opportunities
      },
      null,
      2
    ),
    "utf8"
  );

  console.log(`Keyword expansion complete. Clusters: ${clusters.length}, keywords: ${opportunities.length}`);
};

run();
