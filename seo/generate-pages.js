const fs = require("fs");
const path = require("path");

const SITE_URL = "https://calnexapp.com";
const ROOT = path.resolve(__dirname, "..");
const TEMPLATE_PATH = path.join(__dirname, "templates", "loan-template.html");
const DATA_PATH = path.join(__dirname, "data", "loan-pages.json");
const GENERATED_ROOT = path.join(ROOT, "tools", "loan-calculator");
const SITEMAP_PATH = path.join(ROOT, "sitemap.xml");
const ROBOTS_PATH = path.join(ROOT, "robots.txt");
const TRACKING_ID = "G-MMLPFGBR27";
const GA_SNIPPET = `<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-MMLPFGBR27"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-MMLPFGBR27');
</script>`;

const ensureDir = (dirPath) => fs.mkdirSync(dirPath, { recursive: true });

const currency = (value) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2
  }).format(value);

const toSlug = (loanAmount, rate, term) => {
  const cleanedRate = Number(rate).toString().replace(".", "-");
  return `${loanAmount}-loan-at-${cleanedRate}-percent-for-${term}-years`;
};

const monthlyPayment = (principal, annualRate, years) => {
  const months = years * 12;
  const r = annualRate / 100 / 12;
  if (r === 0) return principal / months;
  const factor = (1 + r) ** months;
  return (principal * r * factor) / (factor - 1);
};

const createPage = (template, entry) => {
  const loanAmount = Number(entry.loan_amount);
  const interestRate = Number(entry.interest_rate);
  const term = Number(entry.loan_term);
  const monthly = monthlyPayment(loanAmount, interestRate, term);
  const totalPaid = monthly * term * 12;
  const totalInterest = totalPaid - loanAmount;

  const title = `Loan Calculator: ${currency(loanAmount)} at ${interestRate}% for ${term} years`;
  const description = `Estimate monthly payments for a ${currency(loanAmount)} loan at ${interestRate}% over ${term} years. Includes repayment and total interest breakdown.`;
  const slug = toSlug(loanAmount, interestRate, term);
  const canonicalUrl = `${SITE_URL}/tools/loan-calculator/${slug}/`;

  const htmlWithAnalytics = template.includes(TRACKING_ID)
    ? template
    : template.replace("</head>", `    ${GA_SNIPPET}\n  </head>`);

  return {
    slug,
    html: htmlWithAnalytics
      .replaceAll("{{loan_amount}}", currency(loanAmount))
      .replaceAll("{{interest_rate}}", String(interestRate))
      .replaceAll("{{loan_term}}", String(term))
      .replaceAll("{{monthly_payment}}", currency(monthly))
      .replaceAll("{{total_interest}}", currency(totalInterest))
      .replaceAll("{{title}}", title)
      .replaceAll("{{description}}", description)
      .replaceAll("{{canonical_url}}", canonicalUrl),
    canonicalUrl
  };
};

const writeSitemap = (urls) => {
  const staticUrls = [
    `${SITE_URL}/`,
    `${SITE_URL}/about/`,
    `${SITE_URL}/contact/`,
    `${SITE_URL}/blog/`,
    `${SITE_URL}/tools/loan-calculator/`,
    `${SITE_URL}/tools/mortgage-calculator/`,
    `${SITE_URL}/tools/car-loan-calculator/`,
    `${SITE_URL}/tools/interest-calculator/`
  ];
  const allUrls = [...staticUrls, ...urls];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls
  .map(
    (url) => `  <url>
    <loc>${url}</loc>
  </url>`
  )
  .join("\n")}
</urlset>
`;
  fs.writeFileSync(SITEMAP_PATH, xml, "utf8");
};

const writeRobots = () => {
  const content = `User-agent: *
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml
`;
  fs.writeFileSync(ROBOTS_PATH, content, "utf8");
};

const run = () => {
  const template = fs.readFileSync(TEMPLATE_PATH, "utf8");
  const entries = JSON.parse(fs.readFileSync(DATA_PATH, "utf8")).slice(0, 50);

  ensureDir(path.join(__dirname, "generated"));
  const generatedUrls = [];

  entries.forEach((entry, index) => {
    const page = createPage(template, entry);
    const targetDir = path.join(GENERATED_ROOT, page.slug);
    ensureDir(targetDir);
    fs.writeFileSync(path.join(targetDir, "index.html"), page.html, "utf8");
    fs.writeFileSync(
      path.join(__dirname, "generated", `${String(index + 1).padStart(2, "0")}-${page.slug}.json`),
      JSON.stringify(entry, null, 2),
      "utf8"
    );
    generatedUrls.push(page.canonicalUrl);
  });

  writeSitemap(generatedUrls);
  writeRobots();
  console.log(`Generated ${entries.length} SEO pages.`);
};

run();
