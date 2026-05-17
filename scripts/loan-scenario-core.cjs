/**
 * Loan scenario guide engine — calculations, variation, HTML render, quality gates.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const CONFIG_PATH = path.join(ROOT, "seo", "config", "loan-guides-config.json");

const loadConfig = () => JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));

const currency = (n) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(n);

const formatRate = (r) => String(r);

const toToolSlug = (principal, rate, years) => {
  const rateSlug = String(rate).replace(".", "-");
  return `${principal}-loan-at-${rateSlug}-percent-for-${years}-years`;
};

const toGuideSlug = (toolSlug) => `${toolSlug}-monthly-payment-calculator`;

const hashSeed = (str) => {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  return Math.abs(h);
};

const pick = (arr, seed, salt = 0) => arr[(seed + salt) % arr.length];

const monthlyPayment = (P, annualRate, years) => {
  const n = years * 12;
  const r = annualRate / 100 / 12;
  if (r === 0) return P / n;
  const f = (1 + r) ** n;
  return (P * r * f) / (f - 1);
};

const amortizeWithExtra = (P, annualRate, years, extraMonthly = 0) => {
  const r = annualRate / 100 / 12;
  const baseM = monthlyPayment(P, annualRate, years);
  let bal = P;
  let totalInt = 0;
  let m = 0;
  const schedule = [];
  while (bal > 0.01 && m < years * 12 + 120) {
    m++;
    const interest = bal * r;
    let principal = baseM - interest + extraMonthly;
    if (principal > bal) principal = bal;
    totalInt += interest;
    bal -= principal;
    schedule.push({ month: m, interest, principal, balance: Math.max(0, bal) });
  }
  return { months: m, totalInt, baseM, schedule };
};

const snapshotAtMonth = (schedule, month) =>
  schedule.find((x) => x.month === month) || schedule[schedule.length - 1];

const computeScenario = (entry, config) => {
  const P = Number(entry.loan_amount);
  const rate = Number(entry.interest_rate);
  const years = Number(entry.loan_term);
  const months = years * 12;
  const base = amortizeWithExtra(P, rate, years, 0);
  const M = base.baseM;
  const totalPaid = M * months;
  const totalInterest = totalPaid - P;

  const altYears = years === 15 ? 30 : 15;
  const altM = monthlyPayment(P, rate, altYears);
  const altTotalInt = altM * altYears * 12 - P;

  const extraCfg =
    config.extraPaymentByPrincipal.find((x) => P <= x.maxPrincipal) ||
    config.extraPaymentByPrincipal[config.extraPaymentByPrincipal.length - 1];
  const extra = extraCfg.extraMonthly;
  const withExtra = amortizeWithExtra(P, rate, years, extra);

  const shockRate = Math.min(rate + config.rateShockBumpPercent, 15);
  const shockM = monthlyPayment(P, shockRate, years);
  const shockInt = shockM * months - P;

  const toolSlug = toToolSlug(P, rate, years);
  const guideSlug = toGuideSlug(toolSlug);

  return {
    P,
    rate,
    years,
    months,
    M,
    totalInterest,
    totalPaid,
    toolSlug,
    guideSlug,
    altYears,
    altM,
    altTotalInt,
    extra,
    withExtra,
    shockRate,
    shockM,
    shockInt,
    snapshots: {
      s1: snapshotAtMonth(base.schedule, 1),
      sMid: snapshotAtMonth(base.schedule, Math.min(60, months)),
      sLast: snapshotAtMonth(base.schedule, months)
    },
    schedule: base.schedule,
    payDiffAlt: Math.abs(M - altM),
    intDiffAlt: Math.abs(totalInterest - altTotalInt)
  };
};

const parseGuideSlug = (slug) => {
  const clean = slug.replace(/-monthly-payment-calculator$/, "");
  const m = clean.match(/^(\d+)-loan-at-([\d-]+)-percent-for-(\d+)-years$/);
  if (!m) return null;
  return { loan_amount: Number(m[1]), interest_rate: Number(m[2].replace(/-/g, ".")), loan_term: Number(m[3]) };
};

const parseKeyword = (keyword) => {
  const n = keyword.toLowerCase().replace(/[^a-z0-9\s.]/g, " ");
  const m = n.match(/(\d{4,})\s*loan\s*at\s*([\d.\s]+)\s*percent\s*for\s*(\d+)\s*years/);
  if (!m) return null;
  let rateStr = m[2].replace(/\s+/g, "");
  if (!rateStr.includes(".") && rateStr.length > 1) {
    rateStr = rateStr.slice(0, -1) + "." + rateStr.slice(-1);
  }
  return { loan_amount: Number(m[1]), interest_rate: parseFloat(rateStr), loan_term: Number(m[3]) };
};

const th = 'style="text-align:left;border:1px solid var(--border);padding:0.5rem 0.6rem"';
const td = 'style="border:1px solid var(--border);padding:0.5rem 0.6rem"';

const buildBalanceChartSvg = (schedule, months) => {
  const points = [];
  const step = Math.max(1, Math.floor(months / 12));
  for (let m = 1; m <= months; m += step) {
    const row = schedule.find((x) => x.month === m);
    if (row) points.push({ m, bal: row.balance });
  }
  const last = schedule.find((x) => x.month === months);
  if (last && points[points.length - 1]?.m !== months) points.push({ m: months, bal: last.balance });
  const maxBal = schedule[0]?.balance || 1;
  const w = 380;
  const h = 120;
  const pad = 8;
  const coords = points
    .map((p, i) => {
      const x = pad + (i / Math.max(1, points.length - 1)) * (w - pad * 2);
      const y = pad + (1 - p.bal / maxBal) * (h - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return `<svg class="loan-scenario-chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="Remaining balance declining over the loan term"><polyline fill="none" stroke="var(--cn-success, #146c43)" stroke-width="2.5" points="${coords}"/><text x="${pad}" y="${h - 4}" font-size="10" fill="currentColor" opacity="0.6">Start</text><text x="${w - pad - 8}" y="${h - 4}" font-size="10" fill="currentColor" opacity="0.6" text-anchor="end">Month ${months}</text></svg>`;
};

const buildPIChartSvg = (s1, sMid, sLast) => {
  const bars = [
    { label: "Mo.1", p: s1.principal, i: s1.interest },
    { label: `M${sMid.month}`, p: sMid.principal, i: sMid.interest },
    { label: "End", p: sLast.principal, i: sLast.interest }
  ];
  const max = Math.max(...bars.map((b) => b.p + b.i), 1);
  const w = 380;
  const h = 120;
  const barW = 48;
  const gap = 36;
  let x = 24;
  const rects = bars
    .map((b) => {
      const scale = (h - 30) / max;
      const pH = b.p * scale;
      const iH = b.i * scale;
      const baseY = h - 18;
      const block = `<g><rect x="${x}" y="${baseY - pH - iH}" width="${barW}" height="${iH}" fill="color-mix(in srgb, var(--cn-warning, #d97706) 80%, transparent)" rx="2"/><rect x="${x}" y="${baseY - pH}" width="${barW}" height="${pH}" fill="var(--cn-accent, #2563eb)" rx="2"/><text x="${x + barW / 2}" y="${h - 4}" font-size="9" text-anchor="middle" fill="currentColor" opacity="0.65">${b.label}</text></g>`;
      x += barW + gap;
      return block;
    })
    .join("");
  return `<svg class="loan-scenario-chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="Principal versus interest share at three checkpoints">${rects}</svg>`;
};

const INTROS = [
  (s) =>
    `Fixed-rate math on <strong>${currency(s.P)}</strong> at <strong>${formatRate(s.rate)}%</strong> over <strong>${s.years} years</strong>: level payment <strong>${currency(s.M)}</strong>, about <strong>${currency(s.totalInterest)}</strong> in scheduled interest.`,
  (s) =>
    `Before you accept a <strong>${currency(s.P)}</strong> note at <strong>${formatRate(s.rate)}%</strong>, map the full <strong>${s.months}-month</strong> path—not just the <strong>${currency(s.M)}</strong> installment.`,
  (s) =>
    `This scenario locks principal, APR, and term so you can compare offers. Payment stays <strong>${currency(s.M)}</strong> while principal share rises each month.`
];

const CTA_VARIANTS = [
  { h: "Run your own loan scenario", p: "Change amount, rate, term, or extra payments.", btn: "Calculate your monthly payment" },
  { h: "Compare different loan terms", p: "Model prepays and alternate terms before you sign.", btn: "Open loan calculator" },
  { h: "Calculate your monthly payment", p: "Verify these figures and export amortization detail.", btn: "Customize this loan" }
];

const BORROWER_EXAMPLES = [
  (s) =>
    `<div class="borrower-example-card"><p><strong>Refinance scenario:</strong> You owe <strong>${currency(s.P)}</strong> at a higher legacy rate. A <strong>${formatRate(s.rate)}%</strong> / <strong>${s.years}-year</strong> offer at <strong>${currency(s.M)}</strong> only wins if closing costs divide into true monthly savings before you sell—see <a href="/blog/mortgage-refinance-break-even-months/">refinance break-even</a>.</p></motion>`,
  (s) =>
    `<div class="borrower-example-card"><p><strong>First-time buyer stretch:</strong> Underwriting may approve a <strong>${s.altYears}-year</strong> payment near <strong>${currency(s.altM)}</strong>, but you choose <strong>${s.years} years</strong> at <strong>${currency(s.M)}</strong> to cap lifetime interest near <strong>${currency(s.totalInterest)}</strong>.</p></motion>`,
  (s) =>
    `<div class="borrower-example-card"><p><strong>Prepay discipline:</strong> You keep the <strong>${currency(s.M)}</strong> minimum but send <strong>${currency(s.extra)}</strong> extra to principal. Scheduled interest drops toward <strong>${currency(s.withExtra.totalInt)}</strong> and payoff lands near month <strong>${s.withExtra.months}</strong>.</p></div>`
];

const buildMeta = (s, config) => {
  const title = `${currency(s.P)} Loan at ${formatRate(s.rate)}% for ${s.years} Years – Monthly Payment & Amortization | CalnexApp`;
  const h1 = `${currency(s.P)} loan at ${formatRate(s.rate)}% for ${s.years} years: monthly payment & amortization`;
  const description = `Fixed-rate payment ${currency(s.M)} on ${currency(s.P)} at ${formatRate(s.rate)}% over ${s.years} years. Total interest ${currency(s.totalInterest)}; compare ${s.altYears}-year term, extra principal, and rate shocks.`;
  const ogTitle = `Monthly payment on a $${s.P >= 1000 ? Math.round(s.P / 1000) + "k" : s.P} loan at ${formatRate(s.rate)}% for ${s.years} years`;
  const legacyUrl = `${config.siteUrl}${config.legacyBasePath}${s.guideSlug}/`;
  const futureUrl = `${config.siteUrl}${config.futureBasePath}${s.toolSlug}/`;
  return { title, h1, description, ogTitle, legacyUrl, futureUrl };
};

const buildSchemaGraph = (meta, s, config, faqs) => {
  const date = new Date().toISOString().slice(0, 10);
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        "@id": `${meta.legacyUrl}#article`,
        headline: meta.h1.replace(/&amp;/g, "&"),
        description: meta.description,
        url: meta.legacyUrl,
        datePublished: date,
        dateModified: date,
        author: { "@type": "Person", name: config.author.name, url: config.author.url },
        publisher: {
          "@type": "Organization",
          name: "CalnexApp",
          url: config.siteUrl + "/",
          logo: { "@type": "ImageObject", url: `${config.siteUrl}/og-loan-calculator.png` }
        },
        mainEntityOfPage: { "@type": "WebPage", "@id": meta.legacyUrl }
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${meta.legacyUrl}#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: `${config.siteUrl}/` },
          { "@type": "ListItem", position: 2, name: "Tools", item: `${config.siteUrl}/tools/` },
          { "@type": "ListItem", position: 3, name: meta.h1.slice(0, 60), item: meta.legacyUrl }
        ]
      },
      {
        "@type": "FAQPage",
        "@id": `${meta.legacyUrl}#faq`,
        mainEntity: faqs.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a }
        }))
      }
    ]
  };
};

const buildFaqs = (s) => [
  {
    q: `What is the monthly payment on ${currency(s.P)} at ${formatRate(s.rate)}% for ${s.years} years?`,
    a: `About ${currency(s.M)} per month in principal and interest for ${s.months} on-time payments (total repayment about ${currency(s.totalPaid)}).`
  },
  {
    q: `How much total interest will I pay?`,
    a: `Roughly ${currency(s.totalInterest)} over the full term if you do not prepay.`
  },
  {
    q: `How does ${s.years} years compare with ${s.altYears} years at the same rate?`,
    a: `At ${formatRate(s.rate)}%, the ${s.altYears}-year payment is about ${currency(s.altM)} versus ${currency(s.M)} on ${s.years} years—a ${currency(s.payDiffAlt)} monthly gap and about ${currency(s.intDiffAlt)} difference in scheduled interest if both run full term.`
  },
  {
    q: `What if I add ${currency(s.extra)} extra toward principal each month?`,
    a: `Payoff lands near month ${s.withExtra.months} with about ${currency(s.withExtra.totalInt)} in interest—savings versus minimum pay depend on servicer application rules.`
  },
  {
    q: `Where can I model my own numbers?`,
    a: `Use the CalnexApp loan calculator or the pre-filled scenario page for this loan structure.`
  }
];

const countWords = (html) =>
  html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean).length;

const validateQuality = (html, config) => {
  const words = countWords(html);
  const issues = [];
  if (words < config.qualityThreshold.minWordCount) issues.push(`word count ${words} < ${config.qualityThreshold.minWordCount}`);
  if (config.qualityThreshold.requireCharts && !html.includes("loan-scenario-chart")) issues.push("missing charts");
  if (config.qualityThreshold.requireFaq && !html.includes('class="card faq-list"')) issues.push("missing FAQ");
  if (!html.includes("application/ld+json")) issues.push("missing schema");
  return { pass: issues.length === 0, words, issues };
};

const renderGuidePage = (entry, options = {}) => {
  const config = loadConfig();
  const s = computeScenario(entry, config);
  const seed = hashSeed(s.guideSlug);
  const meta = buildMeta(s, config);
  const faqs = buildFaqs(s);
  const schema = buildSchemaGraph(meta, s, config, faqs);
  const cta = pick(CTA_VARIANTS, seed, 2);
  const intro = pick(INTROS, seed, 0)(s);
  const borrowerEx = pick(BORROWER_EXAMPLES, seed, 5)(s).replace(/<\/motion>/g, "</div>").replace(/<motion /g, "<motion ");

  const pctIntFirst = ((s.snapshots.s1.interest / s.M) * 100).toFixed(0);
  const pctPrinFirst = ((s.snapshots.s1.principal / s.M) * 100).toFixed(0);

  const uniqueBlock =
    s.years === 15
      ? `<h2>Scenario lens: ${formatRate(s.shockRate)}% rate and ${currency(s.extra)} extra principal</h2>
        <p>If your quote drifts to <strong>${formatRate(s.shockRate)}%</strong> on the same ${s.years}-year structure, payment rises to <strong>${currency(s.shockM)}</strong> (+${currency(s.shockM - s.M)}/mo) and lifetime interest approaches <strong>${currency(s.shockInt)}</strong>—about <strong>${currency(s.shockInt - s.totalInterest)}</strong> more than this ${formatRate(s.rate)}% baseline.</p>
        <p>Adding <strong>${currency(s.extra)}</strong>/month to principal (total outflow ~<strong>${currency(s.M + s.extra)}</strong>) targets payoff around month <strong>${s.withExtra.months}</strong> and cuts scheduled interest toward <strong>${currency(s.withExtra.totalInt)}</strong>.</p>`
      : `<h2>Scenario lens: shorter horizon trade-offs</h2>
        <p>Stretching the same ${currency(s.P)} to <strong>${s.altYears} years</strong> at ${formatRate(s.rate)}% drops the installment to about <strong>${currency(s.altM)}</strong> but adds roughly <strong>${currency(s.intDiffAlt)}</strong> in lifetime interest versus this ${s.years}-year note.</p>
        <p>At <strong>${formatRate(s.shockRate)}%</strong> instead of ${formatRate(s.rate)}%, expect about <strong>${currency(s.shockM)}</strong> per month and <strong>${currency(s.shockInt)}</strong> total interest.</p>`;

  const termSection =
    s.years !== s.altYears
      ? `<h2>${s.years}-year vs ${s.altYears}-year on ${currency(s.P)}</h2>
        <table style="width:100%;border-collapse:collapse;margin:1rem 0;font-size:0.95rem"><thead><tr>
          <th ${th}>Term</th><th ${th}>Monthly P&amp;I</th><th ${th}>Total interest</th><th ${th}>Total repaid</th>
        </tr></thead><tbody>
          <tr><td ${td}><strong>${s.years} yr</strong></td><td ${td}>${currency(s.M)}</td><td ${td}>${currency(s.totalInterest)}</td><td ${td}>${currency(s.totalPaid)}</td></tr>
          <tr><td ${td}>${s.altYears} yr</td><td ${td}>${currency(s.altM)}</td><td ${td}>${currency(s.altTotalInt)}</td><td ${td}>${currency(s.altM * s.altYears * 12)}</td></tr>
          <tr><td ${td}>Gap</td><td ${td}>${s.M > s.altM ? "+" : ""}${currency(s.M - s.altM)}/mo</td><td ${td}>${currency(s.intDiffAlt)}</td><td ${td}>—</td></tr>
        </tbody></table>
        <p>Read <a href="/blog/best-loan-term-15-vs-30-years/">15-year vs 30-year planning</a> for hybrid prepay patterns.</p>`
      : "";

  const sectionBlocks = {
    charts: `<section class="card"><h2>Amortization visuals</h2><p class="muted" style="margin-top:0">How balance and payment composition change on this note.</p>
      <div class="loan-chart-grid">
        <div class="loan-chart-card"><h3>Balance path</h3>${buildBalanceChartSvg(s.schedule, s.months)}<motion class="loan-chart-legend"><span class="legend-balance">Balance</span></div></div>
        <div class="loan-chart-card"><h3>Principal vs interest</h3>${buildPIChartSvg(s.snapshots.s1, s.snapshots.sMid, s.snapshots.sLast)}<div class="loan-chart-legend"><span class="legend-principal">Principal</span><span class="legend-interest">Interest</span></div></div>
      </motion></section>`.replace(/<motion /g, "<motion ").replace(/<motion class/g, "<div class").replace(/<\/motion>/g, "</motion>"),
    amort: `<h2>Principal and interest over time</h2>
      <p>Month-one interest is <strong>${currency(s.snapshots.s1.interest)}</strong> (~${pctIntFirst}% of payment); principal is <strong>${currency(s.snapshots.s1.principal)}</strong>. By month ${s.snapshots.sMid.month}, principal share is <strong>${currency(s.snapshots.sMid.principal)}</strong>.</p>
      <table style="width:100%;border-collapse:collapse;margin:1rem 0;font-size:0.95rem"><thead><tr><th ${th}>Checkpoint</th><th ${th}>Interest</th><th ${th}>Principal</th><th ${th}>Balance after</th></tr></thead><tbody>
        <tr><td ${td}>Month 1</td><td ${td}>${currency(s.snapshots.s1.interest)}</td><td ${td}>${currency(s.snapshots.s1.principal)}</td><td ${td}>${currency(s.snapshots.s1.balance)}</td></tr>
        <tr><td ${td}>Month ${s.snapshots.sMid.month}</td><td ${td}>${currency(s.snapshots.sMid.interest)}</td><td ${td}>${currency(s.snapshots.sMid.principal)}</td><td ${td}>${currency(s.snapshots.sMid.balance)}</td></tr>
        <tr><td ${td}>Month ${s.months}</td><td ${td}>${currency(s.snapshots.sLast.interest)}</td><td ${td}>${currency(s.snapshots.sLast.principal)}</td><td ${td}>$0</td></tr>
      </tbody></table>`,
    worth: `<h2>Is a ${s.years}-year loan worth it at ${formatRate(s.rate)}%?</h2>
      <p>Worth it when <strong>${currency(s.M)}</strong> fits net cash flow after reserves—not when it maxes out DTI. You trade ${currency(s.payDiffAlt)}/mo versus a ${s.altYears}-year schedule for about ${currency(s.intDiffAlt)} less lifetime interest.</p>`,
    unique: uniqueBlock,
    refi: `<h2>Refinancing and affordability</h2>
      <p>Refi only if break-even months fit your hold period (<a href="/blog/mortgage-refinance-break-even-months/">refinance break-even</a>). Affordability includes escrows and other debts—see <a href="/blog/debt-to-income-ratio-mortgage-qualification/">DTI qualification</a>.</p>`,
    risks: `<h2>Risks of a shorter amortization</h2>
      <p>Main risk is <strong>liquidity</strong>: extra principal is hard to access without borrowing again. Confirm prepayment rules on your note.</p>`,
    fits: `<h2>Who this fits</h2><ul>
      <li>Stable income households prioritizing total interest over minimum payment.</li>
      <li>Borrowers with a verified plan to stay past break-even after a refi.</li></ul>
      <p><strong>Pause if</strong> emergency savings are thin or high-APR unsecured debt should clear first.</p>`
  };

  sectionBlocks.charts = `<section class="card"><h2>Amortization visuals</h2><p class="muted" style="margin-top:0">How balance and payment composition change on this note.</p>
    <div class="loan-chart-grid">
      <div class="loan-chart-card"><h3>Balance path</h3>${buildBalanceChartSvg(s.schedule, s.months)}<div class="loan-chart-legend"><span class="legend-balance">Balance</span></div></div>
      <div class="loan-chart-card"><h3>Principal vs interest</h3>${buildPIChartSvg(s.snapshots.s1, s.snapshots.sMid, s.snapshots.sLast)}<motion class="loan-chart-legend"><span class="legend-principal">Principal</span><span class="legend-interest">Interest</span></div></div>
    </div></section>`.replace(/<motion class="loan-chart-legend">/, '<motion class="loan-chart-legend">').replace(
    /<motion class="loan-chart-legend">/,
    '<div class="loan-chart-legend">'
  );

  // Fix charts block properly
  sectionBlocks.charts = `<section class="card"><h2>Amortization visuals</h2><p class="muted" style="margin-top:0">How balance and payment composition change on this note.</p>
    <div class="loan-chart-grid">
      <div class="loan-chart-card"><h3>Balance path</h3>${buildBalanceChartSvg(s.schedule, s.months)}<div class="loan-chart-legend"><span class="legend-balance">Balance</span></div></div>
      <div class="loan-chart-card"><h3>Principal vs interest</h3>${buildPIChartSvg(s.snapshots.s1, s.snapshots.sMid, s.snapshots.sLast)}<div class="loan-chart-legend"><span class="legend-principal">Principal</span><span class="legend-interest">Interest</span></div></motion>
    </div></section>`.replace(/<\/motion>/, "</div>");

  const orderKeys = ["amort", "worth", "unique", "term", "refi", "fits", "risks"];
  if (seed % 2 === 0) orderKeys.reverse();
  const articleInner = orderKeys
    .filter((k) => k !== "term" || termSection)
    .map((k) => (k === "term" ? termSection : sectionBlocks[k] || ""))
    .join("\n");

  const qualityPreview = validateQuality("x".repeat(800), config);
  const noindex = options.forceNoindex || false;

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <script src="/assets/js/theme-init.js"></script>
  <title>${meta.title}</title>
  <meta name="description" content="${meta.description.replace(/"/g, "&quot;")}" />
  <link rel="canonical" href="${meta.legacyUrl}" />
  ${config.emitFutureUrls ? `<link rel="alternate" href="${meta.futureUrl}" title="Preferred URL (upcoming)" />` : ""}
  ${noindex ? '<meta name="robots" content="noindex,follow" />' : ""}
  <meta property="og:type" content="article" />
  <meta property="og:title" content="${meta.ogTitle.replace(/"/g, "&quot;")}" />
  <meta property="og:description" content="${meta.description.replace(/"/g, "&quot;")}" />
  <meta property="og:url" content="${meta.legacyUrl}" />
  <meta property="og:site_name" content="CalnexApp" />
  <link rel="stylesheet" href="/assets/css/style.css" />
  <link rel="stylesheet" href="/assets/css/loan-scenario-guide.css" />
  <script type="application/ld+json">${JSON.stringify(schema, null, 2)}</script>
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-MMLPFGBR27"></script>
  <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-MMLPFGBR27');</script>
</head>
<body>
  <header class="site-header"><div class="container nav">
    <a href="/" class="brand">CalnexApp</a>
    <nav class="menu"><a href="/" data-nav-link>Home</a><a href="/tools/" data-nav-link>Tools</a><a href="/blog/" data-nav-link>Blog</a><a href="/about/" data-nav-link>About</a><a href="/contact/" data-nav-link>Contact</a></nav>
  </div></header>
  <main class="container section-space article-layout">
    <section class="page-title">
      <p class="eyebrow">Loan guide</p>
      <h1>${meta.h1}</h1>
      <div class="article-meta">
        <span>By <a href="${config.author.url}">${config.author.name}</a></span>
        <span>Updated ${new Date().toISOString().slice(0, 10)}</span>
        <span>9 min read</span>
      </div>
      <p class="muted" style="margin-top:0.75rem">${intro}</p>
    </section>
    <section class="card savings-banner" style="margin-bottom:1.25rem">
      <h2 style="margin-top:0;font-size:1.1rem">Quick summary</h2>
      <dl class="result-grid" style="margin-bottom:0">
        <div><dt>Monthly P&amp;I</dt><dd><strong>${currency(s.M)}</strong></dd></div>
        <div><dt>Total interest</dt><dd><strong>${currency(s.totalInterest)}</strong></dd></div>
        <div><dt>Total repayment</dt><dd><strong>${currency(s.totalPaid)}</strong></dd></div>
        <div><dt>Payoff</dt><dd><strong>${s.years} years (${s.months} mo)</strong></dd></div>
      </dl>
    </section>
    <section class="card"><h2>Key takeaways</h2><ul>
      <li>First payment: ~${pctIntFirst}% interest (${currency(s.snapshots.s1.interest)}), ~${pctPrinFirst}% principal.</li>
      <li>${s.years}-year vs ${s.altYears}-year gap: ${currency(s.payDiffAlt)}/mo and ${currency(s.intDiffAlt)} interest delta at ${formatRate(s.rate)}%.</li>
      <li>+${currency(s.extra)}/mo principal → ~month ${s.withExtra.months} payoff, ~${currency(s.withExtra.totalInt)} interest.</li>
      <li>Rate shock to ${formatRate(s.shockRate)}%: ~${currency(s.shockM)}/mo payment.</li>
    </ul></section>
    <section class="card"><h2>Payment breakdown</h2>
      <dl class="result-grid">
        <div><dt>Principal</dt><dd>${currency(s.P)}</dd></div>
        <motion><dt>APR</dt><dd>${formatRate(s.rate)}%</dd></div>
        <div><dt>Term</dt><dd>${s.years} years</dd></div>
        <div><dt>Monthly P&amp;I</dt><dd>${currency(s.M)}</dd></div>
        <div><dt>Total interest</dt><dd>${currency(s.totalInterest)}</dd></div>
      </dl>
      <p style="margin-top:1rem">Formula walkthrough: <a href="/blog/how-to-calculate-loan-interest/">how to calculate loan interest</a>.</p>
    </section>
    <section class="card guide-cta-card">
      <h2 style="margin-top:0">${cta.h}</h2>
      <p>${cta.p}</p>
      <div class="hero-actions">
        <a class="btn btn-primary" href="/tools/loan-calculator/">${cta.btn}</a>
        <a class="btn btn-ghost" href="/tools/loan-calculator/${s.toolSlug}/">Open this scenario</a>
      </div>
    </section>
    ${sectionBlocks.charts}
    <article class="card article-body">
      ${articleInner}
      ${borrowerEx.replace(/<motion /g, "<div ").replace(/<\/motion>/g, "</motion>")}
      <p>Also compare on the <a href="/tools/mortgage-calculator/">mortgage calculator</a> or <a href="/tools/car-loan-calculator/">car loan calculator</a> when product type differs.</p>
    </article>
    <section class="card faq-list"><h2>Frequently asked questions</h2>
      ${faqs.map((f) => `<details><summary>${f.q}</summary><p>${f.a}</p></details>`).join("\n      ")}
    </section>
    <section class="card"><h2>Related scenarios</h2><ul class="toc-list">
      <li><a href="/tools/loan-calculator/${toToolSlug(s.P, s.rate, s.altYears)}/">${currency(s.P)} at ${formatRate(s.rate)}% for ${s.altYears} years</a></li>
      <li><a href="/blog/how-extra-payments-save-money/">How extra payments save interest</a></li>
      <li><a href="/blog/best-loan-term-15-vs-30-years/">15-year vs 30-year term planning</a></li>
    </ul></section>
  </main>
  <footer class="site-footer"><div class="container footer-content">
    <p>&copy; <span id="year"></span> CalnexApp.</p>
    <nav class="footer-links"><a href="/blog/">Blog</a><a href="/tools/">Tools</a></nav>
  </div></footer>
  <script src="/assets/js/app.js" defer></script>
</body>
</html>`;

  const fixedHtml = html
    .replace(/<motion>/g, "<div>")
    .replace(/<\/motion>/g, "</div>")
    .replace(/<motion /g, "<div ");

  const quality = validateQuality(fixedHtml, config);
  return { html: fixedHtml, meta, quality, s, shouldIndex: quality.pass && !noindex };
};

module.exports = {
  loadConfig,
  computeScenario,
  parseGuideSlug,
  parseKeyword,
  renderGuidePage,
  validateQuality,
  countWords,
  toToolSlug,
  toGuideSlug,
  currency
};
