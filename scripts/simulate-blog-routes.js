/**
 * =============================================================================
 * Local routing simulator (Cloudflare Pages)
 * =============================================================================
 *
 * Reproduces Cloudflare Pages' resolution precedence on disk, without needing
 * `wrangler pages dev`. For every URL we walk the exact production order:
 *
 *   1. Pages Functions in /functions
 *        - functions/blog/[slug].js → matches /blog/{single-segment}[/]
 *      We invoke a JS-level model of the function (KV is treated as empty in
 *      this simulator; the function then delegates to env.ASSETS.fetch which
 *      maps to a static file lookup, exactly like production with no KV row).
 *   2. Static files
 *        - /foo/         → blog/foo/index.html if present
 *        - /foo/index.html, /foo.html → direct lookup
 *   3. `_redirects` rules (in file order, supports `:placeholder` and `*`)
 *
 * The intent is to confirm:
 *   - /blog/{slug}/   → 200 from blog/{slug}/index.html
 *   - /blog/{slug}    → 200 from blog/{slug}/index.html (Function strips slash)
 *   - /tools/*        → unchanged routing
 *   - /                → unchanged
 *   - /blog/missing-* → 404 (correct)
 *
 * Usage:
 *   node scripts/simulate-blog-routes.js
 *   node scripts/simulate-blog-routes.js /blog/how-to-calculate-loan-interest/ /tools/loan-calculator/
 *   node scripts/simulate-blog-routes.js --all      # every manifest slug, both forms
 *
 * Exit code: 0 if every URL resolves to 2xx/3xx as expected, 1 otherwise.
 * Dependencies: Node.js core only.
 * =============================================================================
 */

"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const REDIRECTS_PATH = path.join(ROOT, "_redirects");
const BLOG_JSON_PATH = path.join(ROOT, "data", "blog.json");

const argv = process.argv.slice(2);
const FLAG_ALL = argv.includes("--all");
const explicitUrls = argv.filter((a) => a.startsWith("/"));

// ---------------------------------------------------------------------------
// Pretty
// ---------------------------------------------------------------------------

const C = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  bold: "\x1b[1m"
};
const paint = (c, s) => `${c}${s}${C.reset}`;

// ---------------------------------------------------------------------------
// Loaders
// ---------------------------------------------------------------------------

function loadRedirectRules() {
  if (!fs.existsSync(REDIRECTS_PATH)) return [];
  return fs
    .readFileSync(REDIRECTS_PATH, "utf8")
    .split(/\r?\n/)
    .map((text, i) => ({ line: i + 1, text }))
    .filter((r) => r.text.trim() && !r.text.trim().startsWith("#"))
    .map((r) => {
      const parts = r.text.trim().split(/\s+/);
      if (parts.length < 2) return null;
      return {
        line: r.line,
        from: parts[0],
        to: parts[1],
        status: /^\d{3}$/.test(parts[2] || "") ? parseInt(parts[2], 10) : 301
      };
    })
    .filter(Boolean);
}

function fromToRegex(from) {
  let src = from.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
  src = src.replace(/:[A-Za-z_][A-Za-z0-9_]*/g, "([^/]+)");
  src = src.replace(/\*/g, "(.*)");
  return new RegExp(`^${src}$`);
}

function applyRedirect(rule, urlPath) {
  // Resolve :placeholder and :splat substitutions in the `to` field.
  const re = fromToRegex(rule.from);
  const m = re.exec(urlPath);
  if (!m) return null;
  const captures = m.slice(1);

  let to = rule.to;
  // :placeholder substitution (use the first capture; CF substitutes by name,
  // but for our purposes captures are positional and unambiguous in practice).
  const nameRefs = (rule.from.match(/:[A-Za-z_][A-Za-z0-9_]*/g) || []).map((n) => n.slice(1));
  nameRefs.forEach((name, i) => {
    to = to.replace(new RegExp(`:${name}\\b`, "g"), captures[i] || "");
  });
  // :splat → entire wildcard capture
  if (rule.from.includes("*")) {
    const splat = captures[captures.length - 1] || "";
    to = to.replace(/:splat\b/g, splat);
  }
  return { to, status: rule.status, line: rule.line, ruleFrom: rule.from, ruleTo: rule.to };
}

function loadManifestSlugs() {
  if (!fs.existsSync(BLOG_JSON_PATH)) return [];
  return JSON.parse(fs.readFileSync(BLOG_JSON_PATH, "utf8"))
    .map((p) => (p && p.slug ? String(p.slug).toLowerCase() : null))
    .filter(Boolean);
}

// ---------------------------------------------------------------------------
// Routing simulators
// ---------------------------------------------------------------------------

/**
 * Static file resolver (mirrors Cloudflare Pages asset behavior).
 *   /foo/        → foo/index.html
 *   /foo/bar     → foo/bar.html OR foo/bar/index.html (Pages tries both)
 *   /foo/bar.ext → foo/bar.ext
 */
function resolveStatic(urlPath) {
  const trimmed = urlPath.replace(/^\/+/, "");
  if (urlPath.endsWith("/")) {
    const p = path.join(ROOT, trimmed, "index.html");
    if (fs.existsSync(p)) return { kind: "static", file: p, status: 200 };
    return null;
  }
  // exact file
  if (/\.[a-z0-9]+$/i.test(urlPath)) {
    const p = path.join(ROOT, trimmed);
    if (fs.existsSync(p)) return { kind: "static", file: p, status: 200 };
    return null;
  }
  // foo/bar (no slash, no extension) → try .html then /index.html
  const html = path.join(ROOT, trimmed + ".html");
  if (fs.existsSync(html)) return { kind: "static", file: html, status: 200 };
  const dirIndex = path.join(ROOT, trimmed, "index.html");
  if (fs.existsSync(dirIndex)) {
    // CF Pages issues a 308/301 to add the trailing slash before serving.
    return { kind: "static-redirect-to-slash", to: urlPath + "/", status: 308 };
  }
  return null;
}

/**
 * Pages Function dispatcher.
 * The only Function in this project that affects blog routing is
 *   functions/blog/[slug].js  → matches /blog/{single-segment}[/]
 * (We deliberately exclude /blog/ itself so the static index keeps working.)
 *
 * The function's logic:
 *   1. normalize slug (strip trailing slashes, alphanumeric+hyphens)
 *   2. KV.get(blog:html:{slug}) — assumed empty in local sim
 *   3. env.ASSETS.fetch(request)  → modeled here as resolveStatic on the
 *      canonical /blog/{slug}/ form (which matches blog/{slug}/index.html)
 *   4. fallback: 404
 */
function dispatchFunction(urlPath) {
  // functions/blog/[slug].js handles /blog/{single}[/]
  const m = urlPath.match(/^\/blog\/([^/]+)\/?$/);
  if (!m) return null;
  const slug = m[1].toLowerCase().replace(/[^a-z0-9-]/g, "");
  if (!slug) return { kind: "function", name: "blog/[slug]", status: 404 };

  // Step 1 — KV is empty in local simulator. Skip.
  // Step 2 — env.ASSETS.fetch(request) on the SAME urlPath.
  // We simulate the asset binding by serving the static file at /blog/{slug}/.
  const canonical = `/blog/${slug}/`;
  const stat = resolveStatic(canonical);
  if (stat && stat.kind === "static") {
    return { kind: "function:assets", name: "blog/[slug]", served: stat.file, status: 200 };
  }
  return { kind: "function:404", name: "blog/[slug]", status: 404 };
}

/**
 * Full Cloudflare Pages precedence for a single GET URL.
 */
function resolve(urlPath) {
  const trail = [];

  // 1. Pages Function
  const fn = dispatchFunction(urlPath);
  if (fn) {
    trail.push({ step: "function", detail: fn });
    return { final: fn.status, trail, hit: fn };
  }

  // 2. Static asset
  const stat = resolveStatic(urlPath);
  if (stat) {
    trail.push({ step: "static", detail: stat });
    return { final: stat.status, trail, hit: stat };
  }

  // 3. Redirects (file order)
  for (const rule of REDIRECTS) {
    const out = applyRedirect(rule, urlPath);
    if (out) {
      trail.push({ step: "redirect", detail: out });
      // For 200 rewrites we should follow to the destination (one hop).
      if (out.status === 200) {
        const dest = resolveStatic(out.to);
        if (dest) {
          trail.push({ step: "static-after-rewrite", detail: dest });
          return { final: 200, trail, hit: dest };
        }
        return { final: 404, trail, hit: { kind: "rewrite-target-missing", to: out.to } };
      }
      return { final: out.status, trail, hit: out };
    }
  }

  // 4. Nothing matched
  return { final: 404, trail, hit: { kind: "not-found" } };
}

// ---------------------------------------------------------------------------
// Driver
// ---------------------------------------------------------------------------

const REDIRECTS = loadRedirectRules();
const manifestSlugs = loadManifestSlugs();

function buildUrlList() {
  if (explicitUrls.length) return explicitUrls;
  if (FLAG_ALL) {
    const urls = [];
    for (const s of manifestSlugs) {
      urls.push(`/blog/${s}/`);
      urls.push(`/blog/${s}`);
    }
    return urls;
  }
  const random = (a) => a[Math.floor(Math.random() * a.length)];
  const picks = new Set();
  while (picks.size < Math.min(3, manifestSlugs.length)) picks.add(random(manifestSlugs));
  const sample = [...picks];
  return [
    "/",
    "/blog/",
    ...sample.map((s) => `/blog/${s}/`),
    ...sample.map((s) => `/blog/${s}`),
    "/blog/does-not-exist/",
    "/tools/loan-calculator/",
    "/tools/loan-calculator",
    "/about/",
    "/sitemap.xml"
  ];
}

const URLS = buildUrlList();

console.log(paint(C.bold, "Cloudflare Pages local routing simulator"));
console.log(`  repo:   ${ROOT}`);
console.log(`  rules:  ${REDIRECTS.length} active in _redirects`);
console.log(`  test set: ${URLS.length} URL${URLS.length === 1 ? "" : "s"}`);
console.log("");

let failures = 0;
const widths = { url: Math.min(50, Math.max(...URLS.map((u) => u.length))), code: 5 };

for (const url of URLS) {
  const out = resolve(url);
  const code = out.final;

  // Decide expected outcome
  let expected = "2xx/3xx";
  let label = paint(C.green, "OK ");
  if (url === "/blog/does-not-exist/" || url === "/blog/does-not-exist") {
    expected = "404";
    if (code !== 404) {
      label = paint(C.red, "FAIL");
      failures++;
    }
  } else if (code < 200 || code >= 400) {
    label = paint(C.red, "FAIL");
    failures++;
  }

  const sourceTxt = (() => {
    const last = out.trail[out.trail.length - 1];
    if (!last) return "—";
    if (last.step.startsWith("function")) {
      return `${C.cyan}Function${C.reset} ${last.detail.name}${last.detail.served ? " → " + path.relative(ROOT, last.detail.served).replace(/\\/g, "/") : ""}`;
    }
    if (last.step.startsWith("static")) {
      return `${C.cyan}static${C.reset} ${last.detail.file ? path.relative(ROOT, last.detail.file).replace(/\\/g, "/") : "(unknown)"}`;
    }
    if (last.step === "redirect") {
      return `${C.yellow}redirect${C.reset} → ${last.detail.to} (_redirects:${last.detail.line})`;
    }
    return last.step;
  })();

  console.log(
    `  ${label}  ${url.padEnd(widths.url)} ${String(code).padStart(widths.code)}   ${sourceTxt}`
  );
}

console.log("");
console.log(paint(C.bold, "─── Summary ───"));
console.log(`  total tested: ${URLS.length}`);
console.log(`  failures:     ${paint(failures ? C.red : C.green, failures)}`);

process.exit(failures ? 1 : 0);
