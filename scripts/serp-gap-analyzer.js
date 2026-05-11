const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const REGISTRY_PATH = path.join(ROOT, "data", "seo-registry.json");
const CLUSTERS_PATH = path.join(ROOT, "data", "keyword-clusters.json");
const OUTPUT_PATH = path.join(ROOT, "seo", "generated", "high-value-page-suggestions.json");

const normalize = (value) => String(value || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
const dedupe = (values) => [...new Set(values.map((value) => normalize(value)).filter(Boolean))];

const hasCoverage = (covered, phrase) => {
  const normalized = normalize(phrase);
  if (!normalized) return true;
  return covered.some((item) => item === normalized);
};

const buildSuggestions = (keywords, covered) => {
  const suggestionMap = new Map();
  const addSuggestion = (keyword, type, intent, reason, baseScore) => {
    const normalized = normalize(keyword);
    if (!normalized || hasCoverage(covered, normalized)) return;
    if (suggestionMap.has(normalized)) return;
    suggestionMap.set(normalized, {
      keyword: normalized,
      suggestion_type: type,
      recommended_intent: intent,
      reason,
      score: baseScore
    });
  };

  // Missing explanation opportunities.
  keywords.forEach((keyword) => {
    addSuggestion(`what is ${keyword}`, "missing_explanations", "informational", "No dedicated explanatory page detected.", 76);
    addSuggestion(`how does ${keyword} work`, "missing_explanations", "informational", "Intent gap for educational SERP coverage.", 78);
  });

  // Missing calculator opportunities.
  keywords.forEach((keyword) => {
    if (!keyword.includes("calculator")) {
      addSuggestion(`${keyword} calculator`, "missing_calculators", "transactional", "Calculator intent keyword is not fully covered.", 84);
    }
  });

  // Missing comparison opportunities.
  for (let i = 0; i < keywords.length; i += 1) {
    for (let j = i + 1; j < keywords.length; j += 1) {
      const left = keywords[i];
      const right = keywords[j];
      if (left === right) continue;
      addSuggestion(`${left} vs ${right}`, "missing_comparisons", "commercial", "Comparison query cluster opportunity.", 88);
    }
  }

  return Array.from(suggestionMap.values())
    .sort((a, b) => b.score - a.score || a.keyword.localeCompare(b.keyword))
    .slice(0, 120);
};

const run = () => {
  const registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, "utf8"));
  const clusters = JSON.parse(fs.readFileSync(CLUSTERS_PATH, "utf8"));
  const covered = dedupe([
    ...registry.map((entry) => entry.title || ""),
    ...registry.flatMap((entry) => entry.keywords || [])
  ]);

  const rawKeywords = dedupe(clusters.flatMap((cluster) => cluster.supporting_keywords || []))
    .filter((keyword) => keyword.length > 2)
    .slice(0, 16);
  const suggestions = buildSuggestions(rawKeywords, covered);
  const byType = {
    missing_comparisons: suggestions.filter((item) => item.suggestion_type === "missing_comparisons").slice(0, 20),
    missing_explanations: suggestions.filter((item) => item.suggestion_type === "missing_explanations").slice(0, 20),
    missing_calculators: suggestions.filter((item) => item.suggestion_type === "missing_calculators").slice(0, 20)
  };

  const payload = {
    generated_at: new Date().toISOString(),
    basis: {
      covered_keywords_count: covered.length,
      analyzed_seed_keywords_count: rawKeywords.length
    },
    high_value_page_suggestions: suggestions.slice(0, 60),
    grouped: byType
  };

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(payload, null, 2), "utf8");
  console.log(`SERP gap analyzer complete. Suggestions: ${payload.high_value_page_suggestions.length}`);
};

run();
