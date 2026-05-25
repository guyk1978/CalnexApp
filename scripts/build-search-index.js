/**
 * Build /data/search-index.json from tools.json, blog.json, loan-pages.json, and core site pages.
 * Run: node scripts/build-search-index.js
 */
const fs = require("fs");
const path = require("path");
const { computeScenario, currency, loadConfig } = require("./loan-scenario-core.cjs");

const ROOT = path.resolve(__dirname, "..");
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));

const staticPages = [
  {
    title: "Home",
    category: "Pages",
    description: "CalnexApp financial calculator platform — loan, mortgage, and repayment tools.",
    url: "/",
  },
  {
    title: "Tools Hub",
    category: "Pages",
    description: "Browse all CalnexApp calculators and financial tools.",
    url: "/tools/",
  },
  {
    title: "Blog",
    category: "Pages",
    description: "Guides on loans, mortgages, interest rates, and repayment strategy.",
    url: "/blog/",
  },
  {
    title: "About",
    category: "Pages",
    description: "Learn about CalnexApp and our approach to borrower-friendly calculators.",
    url: "/about/",
  },
  {
    title: "Contact",
    category: "Pages",
    description: "Get in touch with the CalnexApp team.",
    url: "/contact/",
  },
];

const tools = readJson("data/tools.json").map((tool) => ({
  title: tool.name,
  category: "Tools",
  description: tool.description,
  url: tool.path,
}));

const blog = readJson("data/blog.json").map((post) => ({
  title: post.title,
  category: "Blog",
  description: post.excerpt,
  url: `/blog/${post.slug}/`,
}));

const loanGuideConfig = loadConfig();
const loanScenarios = readJson("seo/data/loan-pages.json").map((entry) => {
  const s = computeScenario(entry, loanGuideConfig);
  const rateLabel = String(s.rate);
  return {
    title: `${currency(s.P)} loan at ${rateLabel}% for ${s.years} years`,
    category: "Scenarios",
    description: `Monthly payment ${currency(s.M)} on ${currency(s.P)} at ${rateLabel}% over ${s.years} years — ${currency(s.totalInterest)} total interest.`,
    url: `/seo/generated/${s.guideSlug}/`,
  };
});

const CATEGORY_SORT = { Pages: 0, Tools: 1, Blog: 2, Scenarios: 3 };

const index = [...staticPages, ...tools, ...blog, ...loanScenarios].sort((a, b) => {
  const diff = (CATEGORY_SORT[a.category] ?? 9) - (CATEGORY_SORT[b.category] ?? 9);
  if (diff !== 0) return diff;
  return a.title.localeCompare(b.title);
});

const outPath = path.join(ROOT, "data", "search-index.json");
fs.writeFileSync(outPath, `${JSON.stringify(index, null, 2)}\n`, "utf8");
console.log(
  `build-search-index: wrote ${index.length} items (${loanScenarios.length} loan scenarios) to data/search-index.json`
);
