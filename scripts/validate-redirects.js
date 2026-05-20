/**
 * Fail the build if _redirects contains Cloudflare Pages "Pretty URL" 200 loops
 * (e.g. /about/ /about/index.html 200) or identity 200 rewrites.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const REDIRECTS_PATH = path.join(ROOT, "_redirects");

function parseRedirectRule(text) {
  const parts = text.trim().split(/\s+/);
  if (parts.length < 2) return null;
  const from = parts[0];
  const to = parts[1];
  const status = /^\d{3}$/.test(parts[2] || "") ? parseInt(parts[2], 10) : 301;
  return { from, to, status };
}

/** 200 rewrite from a directory URL to its index.html (Pages already does this). */
function isPrettyUrlIndexLoop(rule) {
  if (!rule || rule.status !== 200) return false;
  const { from, to } = rule;
  if (!to.endsWith("/index.html") && to !== "/index.html") return false;

  const fromDir = from === "/" ? "/" : from.endsWith("/") ? from : `${from}/`;
  const expected =
    fromDir === "/" ? "/index.html" : `${fromDir}index.html`.replace(/\/+/g, "/");
  if (to === expected) return true;

  const alt = from.endsWith("/") ? `${from}index.html` : `${from}/index.html`;
  return to === alt.replace(/\/+/g, "/");
}

/** 200 rewrite to the same path (e.g. /sitemap.xml /sitemap.xml 200). */
function isIdentityRewrite(rule) {
  return rule && rule.status === 200 && rule.from === rule.to;
}

function loadActiveRules() {
  if (!fs.existsSync(REDIRECTS_PATH)) return [];
  return fs
    .readFileSync(REDIRECTS_PATH, "utf8")
    .split(/\r?\n/)
    .map((text, idx) => ({ line: idx + 1, text }))
    .filter((r) => r.text.trim() && !r.text.trim().startsWith("#"));
}

function findRedirectViolations(rows) {
  const violations = [];
  for (const row of rows) {
    const rule = parseRedirectRule(row.text);
    if (!rule) continue;
    if (isPrettyUrlIndexLoop(rule)) {
      violations.push({
        line: row.line,
        raw: row.text,
        reason: "200 rewrite to index.html (Cloudflare Pretty URL loop)"
      });
    } else if (isIdentityRewrite(rule)) {
      violations.push({
        line: row.line,
        raw: row.text,
        reason: "200 identity rewrite (unnecessary; can loop on Pages)"
      });
    }
  }
  return violations;
}

function run() {
  const violations = findRedirectViolations(loadActiveRules());

  if (violations.length === 0) {
    console.log("validate-redirects: OK — no Pretty URL 200 loops in _redirects");
    return;
  }

  console.error("validate-redirects: FAILED — forbidden rules in _redirects:\n");
  for (const v of violations) {
    console.error(`  line ${v.line}: ${v.raw}`);
    console.error(`    → ${v.reason}\n`);
  }
  console.error(
    "Fix: comment out or remove these lines. Cloudflare Pages serves index.html from folders automatically."
  );
  process.exit(1);
}

module.exports = {
  findRedirectViolations,
  isPrettyUrlIndexLoop,
  isIdentityRewrite,
  loadActiveRules,
  parseRedirectRule
};

if (require.main === module) {
  run();
}
