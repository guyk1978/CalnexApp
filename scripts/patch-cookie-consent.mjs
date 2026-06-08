/**
 * Global cookie consent for static HTML pages.
 * - Strips inline gtag snippets
 * - Injects consent-config + cookie-consent.js once in <head>
 * - Marks static pages with data-cn-static-layout (Next layout uses data-cn-next-layout)
 * - Removes any legacy inline cookie banner markup
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

const CONSENT_CSS_HREF = "/assets/css/cookie-consent.css?v=4";
const CONSENT_CSS_TAG = `    <link rel="stylesheet" href="${CONSENT_CSS_HREF}" />\n`;
const CONSENT_CSS_ANY_RE =
  /<link\s+rel="stylesheet"\s+href="\/assets\/css\/cookie-consent\.css\?v=[^"]*"\s*\/?>\s*/gi;
const CONSENT_CONFIG_TAG = '    <script src="/assets/js/consent-config.js"></script>\n';
const CONSENT_CONFIG_ANY_RE =
  /<script\s+src="\/assets\/js\/consent-config\.js"><\/script>\s*/gi;
const CONSENT_BOOT_TAG = '    <script src="/assets/js/cookie-consent.js" defer></script>\n';
const CONSENT_BOOT_ANY_RE =
  /<script\s+src="\/assets\/js\/cookie-consent\.js"\s+defer><\/script>\s*/gi;

/** Legacy inline banner fragments (footer bleed). */
const LEGACY_COOKIE_MARKUP_RE =
  /<div[^>]*(?:id=["']cn-cookie-consent-root["']|class=["'][^"']*cn-cookie-consent)[^>]*>[\s\S]*?<\/div>\s*/gi;

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

function stripLegacyCookieMarkup(html) {
  return html.replace(LEGACY_COOKIE_MARKUP_RE, "");
}

function tagStaticBody(html) {
  if (html.includes("data-cn-next-layout")) return html;
  if (/<body[^>]*data-cn-static-layout/i.test(html)) return html;
  return html.replace(/<body([^>]*)>/i, '<body$1 data-cn-static-layout="true">');
}

function ensureConsentHead(html) {
  let next = html.replace(CONSENT_CSS_ANY_RE, "");
  next = next.replace(CONSENT_CONFIG_ANY_RE, "");
  next = next.replace(CONSENT_BOOT_ANY_RE, "");
  return next.replace(
    "</head>",
    `${CONSENT_CSS_TAG}${CONSENT_CONFIG_TAG}${CONSENT_BOOT_TAG}  </head>`
  );
}

let updated = 0;
for (const file of walk(ROOT)) {
  const raw = fs.readFileSync(file, "utf8");
  let next = stripGtag(raw);
  next = stripLegacyCookieMarkup(next);
  next = tagStaticBody(next);
  next = ensureConsentHead(next);
  if (next !== raw) {
    fs.writeFileSync(file, next, "utf8");
    updated += 1;
  }
}

console.log(`patch-cookie-consent: updated ${updated} HTML files`);
