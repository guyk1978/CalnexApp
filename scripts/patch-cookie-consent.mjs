/**
 * Remove inline gtag/GA snippets and inject consent-config + cookie-consent scripts.
 * Run: node scripts/patch-cookie-consent.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  ".next",
  "out",
  "coverage",
  "dist",
  "drafts",
]);

const GTAG_BLOCK_RE =
  /<!--\s*Google tag \(gtag\.js\)\s*-->[\s\S]*?<script[^>]*googletagmanager\.com\/gtag\/js[\s\S]*?<\/script>\s*<script>[\s\S]*?gtag\s*\([\s\S]*?<\/script>\s*/gi;

const GTAG_PAIR_RE =
  /<script\s+async\s+src="https:\/\/www\.googletagmanager\.com\/gtag\/js\?id=[^"]*"><\/script>\s*<script>[\s\S]*?gtag\s*\(\s*["']config["'][\s\S]*?<\/script>\s*/gi;

const CONSENT_CSS_HREF = "/assets/css/cookie-consent.css?v=3";
const CONSENT_CSS_TAG = `    <link rel="stylesheet" href="${CONSENT_CSS_HREF}" />\n`;
const CONSENT_CSS_ANY_RE =
  /<link\s+rel="stylesheet"\s+href="\/assets\/css\/cookie-consent\.css\?v=[^"]*"\s*\/?>\s*/gi;
const CONSENT_CONFIG_TAG = '    <script src="/assets/js/consent-config.js"></script>\n';
const CONSENT_CONFIG_ANY_RE =
  /<script\s+src="\/assets\/js\/consent-config\.js"><\/script>\s*/gi;
const CONSENT_BOOT_TAG = '    <script src="/assets/js/cookie-consent.js" defer></script>\n';
const CONSENT_BOOT_ANY_RE =
  /<script\s+src="\/assets\/js\/cookie-consent\.js"\s+defer><\/script>\s*/gi;

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(name.name)) continue;
    const full = path.join(dir, name.name);
    if (name.isDirectory()) walk(full, out);
    else if (name.name.endsWith(".html")) out.push(full);
  }
  return out;
}

function stripGtag(html) {
  let next = html.replace(GTAG_BLOCK_RE, "");
  let prev = "";
  while (prev !== next) {
    prev = next;
    next = next.replace(GTAG_PAIR_RE, "");
  }
  return next;
}

function dedupeConsentHead(html) {
  let next = html.replace(CONSENT_CSS_ANY_RE, "");
  next = next.replace(CONSENT_CONFIG_ANY_RE, "");
  return next.replace("</head>", `${CONSENT_CSS_TAG}${CONSENT_CONFIG_TAG}  </head>`);
}

function dedupeConsentBody(html) {
  let next = html.replace(CONSENT_BOOT_ANY_RE, "");
  if (!next.includes("cookie-consent.js")) {
    next = next.replace("</body>", `${CONSENT_BOOT_TAG}  </body>`);
  }
  return next;
}

function ensureConsentAssets(html) {
  let next = html;
  if (next.includes("cookie-consent.css") || next.includes("consent-config.js")) {
    next = dedupeConsentHead(next);
  } else {
    next = next.replace("</head>", `${CONSENT_CSS_TAG}${CONSENT_CONFIG_TAG}  </head>`);
  }
  return dedupeConsentBody(next);
}

let updated = 0;
for (const file of walk(ROOT)) {
  const raw = fs.readFileSync(file, "utf8");
  let next = stripGtag(raw);
  next = ensureConsentAssets(next);
  if (next !== raw) {
    fs.writeFileSync(file, next, "utf8");
    updated += 1;
  }
}

console.log(`patch-cookie-consent: updated ${updated} HTML files`);
