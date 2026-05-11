const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const CLUSTERS_PATH = path.join(ROOT, "data", "keyword-clusters.json");
const OPPORTUNITIES_PATH = path.join(ROOT, "seo", "generated", "keyword-opportunities.json");
const OUTPUT_PATH = path.join(ROOT, "seo", "generated", "keyword-intents.json");

const informationalSignals = ["how", "what", "why", "guide", "explained", "explain", "work", "apr"];
const commercialSignals = ["best", "vs", "compare", "comparison", "review", "top", "difference"];
const transactionalSignals = ["calculator", "online", "tool", "estimate", "quote", "apply"];

const normalize = (value) => String(value || "").toLowerCase().trim();
const dedupe = (values) => [...new Set(values.map((value) => normalize(value)).filter(Boolean))];

const scoreSignals = (keyword, signals) => signals.reduce((sum, signal) => sum + (keyword.includes(signal) ? 1 : 0), 0);

const classifyKeyword = (keyword) => {
  const value = normalize(keyword);
  const infoScore = scoreSignals(value, informationalSignals);
  const commercialScore = scoreSignals(value, commercialSignals);
  const transactionalScore = scoreSignals(value, transactionalSignals);

  if (transactionalScore >= commercialScore && transactionalScore >= infoScore && transactionalScore > 0) {
    return "transactional";
  }
  if (commercialScore >= infoScore && commercialScore > 0) {
    return "commercial";
  }
  if (infoScore > 0) {
    return "informational";
  }
  return "commercial";
};

const loadKeywords = () => {
  const clusters = JSON.parse(fs.readFileSync(CLUSTERS_PATH, "utf8"));
  const fromClusters = clusters.flatMap((cluster) => cluster.supporting_keywords || []);
  const opportunities = fs.existsSync(OPPORTUNITIES_PATH)
    ? JSON.parse(fs.readFileSync(OPPORTUNITIES_PATH, "utf8")).keywords || []
    : [];
  return dedupe([...fromClusters, ...opportunities]);
};

const run = () => {
  const keywords = loadKeywords();
  const byIntent = { informational: [], commercial: [], transactional: [] };
  const classified = keywords.map((keyword) => {
    const intent = classifyKeyword(keyword);
    byIntent[intent].push(keyword);
    return { keyword, intent };
  });

  const payload = {
    generated_at: new Date().toISOString(),
    totals: {
      keywords: classified.length,
      informational: byIntent.informational.length,
      commercial: byIntent.commercial.length,
      transactional: byIntent.transactional.length
    },
    samples: {
      informational: byIntent.informational.slice(0, 10),
      commercial: byIntent.commercial.slice(0, 10),
      transactional: byIntent.transactional.slice(0, 10)
    },
    classified_keywords: classified
  };

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(payload, null, 2), "utf8");
  console.log(`Intent classification complete. Keywords classified: ${classified.length}`);
};

run();
