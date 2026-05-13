/**
 * =============================================================================
 * Production Blog Integrity Validator (CalnexApp)
 * =============================================================================
 *
 * Validates real production routing/deployment behavior of the blog, NOT
 * SEO content quality. Three independent checks:
 *
 *   1. FILE SYSTEM vs SLUG MAPPING
 *      Every slug in data/blog.json must have blog/{slug}/index.html on disk
 *      (Cloudflare Pages deploys repo root, so disk == deploy artifact).
 *
 *   2. URL RESOLUTION TEST
 *      Two layers:
 *        a) Static analysis of `_redirects` — detect any rule that would
 *           intercept `/blog/<slug>` or `/blog/<slug>/` before it reaches a
 *           static file or a Pages Function.
 *        b) Optional live HTTP probe (`--probe`) against a production origin
 *           that fetches both `/blog/{slug}` and `/blog/{slug}/`, reports
 *           status codes, redirect chains, and flags any mismatch between
 *           the two forms.
 *
 *   3. DEPLOYMENT CONSISTENCY CHECK
 *      Cross-checks four signals:
 *        - data/blog.json    (manifest)
 *        - blog/*\/index.html (file system / deploy artifact)
 *        - sitemap.xml       (deployed URL list)
 *        - _redirects rules  (routing surface)
 *      Flags any slug that is missing from one source but present in another.
 *
 * Usage:
 *   node scripts/validate-blog-integrity.js
 *   node scripts/validate-blog-integrity.js --probe
 *   node scripts/validate-blog-integrity.js --probe --origin https://calnexapp.com
 *   node scripts/validate-blog-integrity.js --json
 *   node scripts/validate-blog-integrity.js --verbose
 *
 * Exit codes:
 *   0  all checks passed
 *   1  one or more errors detected (file missing, routing failure, mismatch)
 *   2  fatal: required input file (data/blog.json) is missing or unreadable
 *
 * Dependencies: Node.js core only (fs, path, https, url).
 * =============================================================================
 */

"use strict";

const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");
const { URL } = require("url");

// ---------------------------------------------------------------------------
// CLI args & constants
// ---------------------------------------------------------------------------

const ARGS = process.argv.slice(2);
const FLAG_PROBE = ARGS.includes("--probe");
const FLAG_JSON = ARGS.includes("--json");
const FLAG_VERBOSE = ARGS.includes("--verbose") || ARGS.includes("-v");

function readArg(name, fallback) {
  const i = ARGS.indexOf(name);
  if (i >= 0 && i + 1 < ARGS.length) return ARGS[i + 1];
  return fallback;
}
const ORIGIN = (readArg("--origin", "https://calnexapp.com") || "").replace(/\/+$/, "");

const ROOT = path.resolve(__dirname, "..");
const BLOG_JSON_PATH = path.join(ROOT, "data", "blog.json");
const REDIRECTS_PATH = path.join(ROOT, "_redirects");
const SITEMAP_PATH = path.join(ROOT, "sitemap.xml");
const BLOG_DIR = path.join(ROOT, "blog");

// Slugs that legitimately live under /blog/ but are NOT individual posts.
const NON_POST_SLUGS = new Set(["latest"]);

// ---------------------------------------------------------------------------
// Pretty printing
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
function paint(color, str) {
  return FLAG_JSON ? String(str) : `${color}${str}${C.reset}`;
}
function log(...args) {
  if (!FLAG_JSON) console.log(...args);
}
function header(t) {
  log("");
  log(paint(C.bold + C.cyan, `── ${t} ──`));
}

// ---------------------------------------------------------------------------
// Loaders
// ---------------------------------------------------------------------------

function loadManifest() {
  if (!fs.existsSync(BLOG_JSON_PATH)) {
    console.error(`FATAL: ${path.relative(ROOT, BLOG_JSON_PATH)} not found`);
    process.exit(2);
  }
  try {
    const raw = fs.readFileSync(BLOG_JSON_PATH, "utf8");
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) {
      console.error("FATAL: data/blog.json is not an array");
      process.exit(2);
    }
    return data;
  } catch (e) {
    console.error("FATAL: cannot parse data/blog.json:", e.message);
    process.exit(2);
  }
}

function loadRedirects() {
  if (!fs.existsSync(REDIRECTS_PATH)) return [];
  const raw = fs.readFileSync(REDIRECTS_PATH, "utf8");
  return raw
    .split(/\r?\n/)
    .map((line, idx) => ({ line: idx + 1, text: line }))
    .filter((r) => r.text.trim() && !r.text.trim().startsWith("#"));
}

function loadSitemapBlogUrls() {
  if (!fs.existsSync(SITEMAP_PATH)) return new Set();
  const xml = fs.readFileSync(SITEMAP_PATH, "utf8");
  const out = new Set();
  const re = /<loc>\s*([^<\s]+)\s*<\/loc>/g;
  let m;
  while ((m = re.exec(xml))) {
    const u = m[1].trim();
    if (/\/blog\/[^/]+\/?$/i.test(u) && !/\/blog\/$/i.test(u) && !/\/blog\/latest\//i.test(u)) {
      out.add(u);
    }
  }
  return out;
}

function listDiskSlugs() {
  if (!fs.existsSync(BLOG_DIR)) return [];
  return fs
    .readdirSync(BLOG_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .filter((name) => !NON_POST_SLUGS.has(name))
    .filter((name) => fs.existsSync(path.join(BLOG_DIR, name, "index.html")));
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normSlug(s) {
  return String(s == null ? "" : s).trim().toLowerCase();
}

function relPath(p) {
  return path.relative(ROOT, p).replace(/\\/g, "/");
}

/**
 * Convert a Cloudflare `_redirects` "from" pattern into a JS regex.
 * Supports the `:placeholder` syntax (matches a single path segment, no /),
 * and `*` wildcards (greedy). Anchored to start & end.
 */
function redirectFromToRegex(from) {
  let src = from;
  src = src.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
  src = src.replace(/:[A-Za-z_][A-Za-z0-9_]*/g, "[^/]+");
  src = src.replace(/\*/g, ".*");
  return new RegExp(`^${src}$`);
}

function parseRedirectRule(text) {
  const parts = text.trim().split(/\s+/);
  if (parts.length < 2) return null;
  const from = parts[0];
  const to = parts[1];
  const status = /^\d{3}$/.test(parts[2] || "") ? parseInt(parts[2], 10) : 301;
  return { from, to, status };
}

// ---------------------------------------------------------------------------
// HTTP probe (no redirect following — we want the raw chain)
// ---------------------------------------------------------------------------

function probeUrl(absoluteUrl, maxHops) {
  return new Promise((resolve) => {
    const hops = [];
    let hopsLeft = maxHops == null ? 6 : maxHops;
    function go(u) {
      let parsed;
      try {
        parsed = new URL(u);
      } catch {
        resolve({ ok: false, error: "invalid URL", chain: hops });
        return;
      }
      const mod = parsed.protocol === "http:" ? http : https;
      const req = mod.request(
        {
          method: "GET",
          hostname: parsed.hostname,
          port: parsed.port || (parsed.protocol === "https:" ? 443 : 80),
          path: parsed.pathname + parsed.search,
          headers: {
            "user-agent": "CalnexApp-IntegrityValidator/1.0",
            accept: "text/html,*/*;q=0.5",
            "accept-encoding": "identity"
          },
          timeout: 8000
        },
        (res) => {
          const status = res.statusCode || 0;
          const loc = res.headers && res.headers.location ? String(res.headers.location) : null;
          hops.push({ url: u, status, location: loc });
          res.resume();
          if (status >= 300 && status < 400 && loc && hopsLeft > 0) {
            hopsLeft--;
            const next = new URL(loc, u).toString();
            go(next);
          } else {
            resolve({ ok: status >= 200 && status < 400, chain: hops, finalStatus: status });
          }
        }
      );
      req.on("error", (e) => {
        hops.push({ url: u, status: 0, error: e.code || e.message });
        resolve({ ok: false, chain: hops, error: e.code || e.message });
      });
      req.on("timeout", () => {
        req.destroy(new Error("timeout"));
      });
      req.end();
    }
    go(absoluteUrl);
  });
}

// ---------------------------------------------------------------------------
// CHECK 1 — file system vs slug mapping
// ---------------------------------------------------------------------------

function check1_filesystem(manifest) {
  header("CHECK 1: filesystem vs slug mapping");
  const errors = [];
  const ok = [];

  for (const entry of manifest) {
    const slug = normSlug(entry && entry.slug);
    if (!slug) {
      errors.push({
        type: "manifest-empty-slug",
        message: `manifest entry has empty/invalid slug: ${JSON.stringify(entry).slice(0, 120)}`
      });
      continue;
    }
    const expected = path.join(BLOG_DIR, slug, "index.html");
    if (!fs.existsSync(expected)) {
      errors.push({
        type: "missing-build-output",
        slug,
        expectedPath: relPath(expected),
        message: `Missing build output for slug "${slug}"`,
        fix: `Run \`node scripts/rebuild-blog-from-drafts.js\` (or \`npm run publish-approved-blog\`) so ${relPath(expected)} is generated, then commit + redeploy.`
      });
    } else {
      ok.push({ slug, path: relPath(expected) });
    }
  }

  log(`  manifest entries scanned: ${manifest.length}`);
  log(`  build outputs present:    ${paint(C.green, ok.length)}`);
  log(`  missing build outputs:    ${paint(errors.length ? C.red : C.green, errors.length)}`);

  if (FLAG_VERBOSE) {
    for (const r of ok) log(`    OK  ${r.slug.padEnd(54)} ${C.dim}${r.path}${C.reset}`);
  }
  for (const e of errors) {
    log(`    ${paint(C.red, "ERR")} ${e.message}`);
    if (e.expectedPath) log(`        expected: ${e.expectedPath}`);
    if (e.fix) log(`        fix:      ${e.fix}`);
  }

  return { errors, ok };
}

// ---------------------------------------------------------------------------
// CHECK 2 — URL resolution (static analysis of _redirects + optional probe)
// ---------------------------------------------------------------------------

/**
 * Find redirect rules in `_redirects` whose `from` pattern would match the
 * given URL path. Returns ordered matches (file order = Cloudflare priority).
 */
function findMatchingRedirects(urlPath, rawRules) {
  const matches = [];
  for (const raw of rawRules) {
    const rule = parseRedirectRule(raw.text);
    if (!rule) continue;
    let re;
    try {
      re = redirectFromToRegex(rule.from);
    } catch {
      continue;
    }
    if (re.test(urlPath)) {
      matches.push({ line: raw.line, rule, raw: raw.text });
    }
  }
  return matches;
}

async function check2_routing(manifest, rawRules) {
  header("CHECK 2: URL resolution");
  const errors = [];

  // --- 2a. Static analysis of `_redirects` ---
  log("  2a. Static analysis of _redirects");

  const slugs = manifest
    .map((e) => normSlug(e && e.slug))
    .filter((s) => s && !NON_POST_SLUGS.has(s));

  // Sample one slug (first manifest entry) to probe rules — the goal is to
  // detect parametric rules like `/blog/:slug …` that affect every post.
  const sampleSlug = slugs[0] || "sample-slug";
  const samplePaths = [`/blog/${sampleSlug}`, `/blog/${sampleSlug}/`];

  for (const p of samplePaths) {
    const matches = findMatchingRedirects(p, rawRules);
    // A "good" rule for `/blog/<slug>` is either:
    //   - the canonical `/blog/{slug}/ /blog/{slug}/index.html 200` (none exists for posts;
    //     Pages auto-serves index.html), OR
    //   - no redirect at all (Pages then serves the static file / Function).
    // Any rule that takes the request away from the post is a routing failure.
    const harmful = matches.filter((m) => {
      const to = m.rule.to;
      // Allowed: same-path 200 rewrites to the same /blog/<slug>/ tree.
      if (m.rule.status === 200 && to.startsWith(p)) return false;
      // Allowed: trailing-slash normalization (e.g. /blog/foo -> /blog/foo/ 301).
      if (m.rule.status >= 300 && m.rule.status < 400 && to === p + "/") return false;
      if (m.rule.status >= 300 && m.rule.status < 400 && to === p.replace(/\/$/, "")) return false;
      return true;
    });

    if (harmful.length > 0) {
      for (const h of harmful) {
        errors.push({
          type: "routing-intercept",
          urlPath: p,
          line: h.line,
          rule: `${h.rule.from} ${h.rule.to} ${h.rule.status}`,
          message: `routing failure: rule on _redirects:${h.line} intercepts ${p} → ${h.rule.to} (${h.rule.status})`,
          fix:
            h.rule.from.includes(":") || h.rule.from.includes("*")
              ? `Remove or scope the parametric/wildcard rule on _redirects:${h.line}. Pages Functions + static files already handle /blog/{slug}/; this redirect short-circuits them.`
              : `Remove the rule on _redirects:${h.line} or restrict it to a non-blog path.`
        });
        log(`    ${paint(C.red, "ERR")} ${p}  ← _redirects:${h.line}  "${h.raw}"  (${h.rule.status})`);
        log(`        fix: ${errors[errors.length - 1].fix}`);
      }
    } else if (FLAG_VERBOSE) {
      log(`    ${paint(C.green, "OK ")} ${p}  no harmful redirects`);
    }
  }

  // Trailing-slash policy detection: do `/blog/x` and `/blog/x/` resolve the same?
  const noTrailMatches = findMatchingRedirects(`/blog/${sampleSlug}`, rawRules);
  const trailMatches = findMatchingRedirects(`/blog/${sampleSlug}/`, rawRules);
  const noTrailFinal = noTrailMatches.length ? noTrailMatches[0].rule.status : "(static/function)";
  const trailFinal = trailMatches.length ? trailMatches[0].rule.status : "(static/function)";
  if (
    noTrailMatches.length === 0 &&
    trailMatches.length === 0 &&
    !FLAG_PROBE
  ) {
    log(`  ${paint(C.dim, "trailing-slash:")} no redirect rules; live behavior depends on Pages Functions ([slug].js handles both)`);
  } else {
    log(`  ${paint(C.dim, "trailing-slash:")} /blog/${sampleSlug} → ${noTrailFinal}   |   /blog/${sampleSlug}/ → ${trailFinal}`);
  }

  // --- 2b. Optional live probe ---
  if (FLAG_PROBE) {
    log(`  2b. Live probe → ${ORIGIN}`);
    for (const slug of slugs) {
      const noTrail = `${ORIGIN}/blog/${slug}`;
      const trail = `${ORIGIN}/blog/${slug}/`;
      const [a, b] = await Promise.all([probeUrl(noTrail), probeUrl(trail)]);

      const aStatus = a.finalStatus || (a.chain.slice(-1)[0] || {}).status || 0;
      const bStatus = b.finalStatus || (b.chain.slice(-1)[0] || {}).status || 0;

      const aOk = aStatus >= 200 && aStatus < 400;
      const bOk = bStatus >= 200 && bStatus < 400;

      if (!aOk || !bOk || aStatus !== bStatus) {
        errors.push({
          type: "live-routing-failure",
          slug,
          noTrail: { url: noTrail, status: aStatus, chain: a.chain },
          trail: { url: trail, status: bStatus, chain: b.chain },
          message:
            !aOk && !bOk
              ? `Both /blog/${slug} (${aStatus}) and /blog/${slug}/ (${bStatus}) failed`
              : !aOk
                ? `Routing failure: /blog/${slug} returns ${aStatus} (with-slash OK at ${bStatus})`
                : !bOk
                  ? `Routing failure: /blog/${slug}/ returns ${bStatus} (no-slash OK at ${aStatus})`
                  : `Trailing-slash mismatch: /blog/${slug} (${aStatus}) vs /blog/${slug}/ (${bStatus})`,
          fix:
            "Ensure functions/blog/[slug].js + static file or `_redirects` produce the same final 200 for both forms. See CHECK 2a output for the offending rule, if any."
        });
        log(`    ${paint(C.red, "ERR")} ${slug}`);
        log(`        no-trail: ${aStatus}   chain: ${a.chain.map((h) => `${h.status}→${h.location || ""}`).join(" ")}`);
        log(`        trail:    ${bStatus}   chain: ${b.chain.map((h) => `${h.status}→${h.location || ""}`).join(" ")}`);
      } else if (FLAG_VERBOSE) {
        log(`    ${paint(C.green, "OK ")} ${slug}  both forms → ${aStatus}`);
      }
    }
  }

  return { errors };
}

// ---------------------------------------------------------------------------
// CHECK 3 — deployment consistency
// ---------------------------------------------------------------------------

function check3_consistency(manifest, redirects, sitemapUrls) {
  header("CHECK 3: deployment consistency");
  const errors = [];

  const manifestSlugs = new Set(
    manifest.map((e) => normSlug(e && e.slug)).filter((s) => s && !NON_POST_SLUGS.has(s))
  );
  const diskSlugs = new Set(listDiskSlugs().map(normSlug));
  const sitemapSlugs = new Set();
  for (const u of sitemapUrls) {
    const m = u.match(/\/blog\/([^/]+)\/?$/i);
    if (m) sitemapSlugs.add(normSlug(m[1]));
  }

  function diff(a, b) {
    const out = [];
    for (const x of a) if (!b.has(x)) out.push(x);
    return out;
  }

  const inManifestNotOnDisk = diff(manifestSlugs, diskSlugs);
  const onDiskNotInManifest = diff(diskSlugs, manifestSlugs);
  const inManifestNotInSitemap = diff(manifestSlugs, sitemapSlugs);
  const inSitemapNotInManifest = diff(sitemapSlugs, manifestSlugs);

  log(`  sources: manifest=${manifestSlugs.size}, disk=${diskSlugs.size}, sitemap=${sitemapSlugs.size}`);

  for (const slug of inManifestNotOnDisk) {
    errors.push({
      type: "manifest-without-build",
      slug,
      message: `Slug "${slug}" is in data/blog.json but has no blog/${slug}/index.html`,
      fix: `Generate the file or remove it from data/blog.json.`
    });
    log(`    ${paint(C.red, "ERR")} manifest ⊄ disk: ${slug}`);
  }
  for (const slug of onDiskNotInManifest) {
    errors.push({
      type: "build-without-manifest",
      slug,
      message: `blog/${slug}/index.html exists but slug "${slug}" is not in data/blog.json`,
      fix: `Add the slug to data/blog.json (or delete the orphan folder).`
    });
    log(`    ${paint(C.yellow, "WRN")} disk ⊄ manifest: ${slug}  ${C.dim}(deployed but unlinked)${C.reset}`);
  }
  for (const slug of inManifestNotInSitemap) {
    errors.push({
      type: "missing-from-sitemap",
      slug,
      message: `Slug "${slug}" is in data/blog.json but missing from sitemap.xml`,
      fix: `Run \`npm run generate-sitemap\` and redeploy.`
    });
    log(`    ${paint(C.yellow, "WRN")} manifest ⊄ sitemap: ${slug}`);
  }
  for (const slug of inSitemapNotInManifest) {
    errors.push({
      type: "stale-sitemap-entry",
      slug,
      message: `Sitemap lists /blog/${slug}/ but slug is not in data/blog.json`,
      fix: `Regenerate sitemap or restore the manifest entry.`
    });
    log(`    ${paint(C.yellow, "WRN")} sitemap ⊄ manifest: ${slug}`);
  }

  // Detect `_redirects` rules whose target path no longer exists on disk.
  for (const r of redirects) {
    const rule = parseRedirectRule(r.text);
    if (!rule) continue;
    const m = rule.to.match(/^\/blog\/([^/]+)\/?(?:index\.html)?$/i);
    if (!m) continue;
    const targetSlug = normSlug(m[1]);
    if (NON_POST_SLUGS.has(targetSlug)) continue;
    // Skip target paths that are not real slugs (the bare blog index serves
    // /blog/index.html through `_redirects` line 14 — that's not a dead slug).
    if (targetSlug === "index.html" || targetSlug.endsWith(".html") || targetSlug.endsWith(".xml")) continue;
    if (!diskSlugs.has(targetSlug) && !manifestSlugs.has(targetSlug)) {
      errors.push({
        type: "dead-redirect-target",
        line: r.line,
        rule: `${rule.from} ${rule.to} ${rule.status}`,
        message: `_redirects:${r.line} points at /blog/${targetSlug}/ which no longer exists`,
        fix: `Update or remove that rule.`
      });
      log(`    ${paint(C.red, "ERR")} _redirects:${r.line} → dead target /blog/${targetSlug}/`);
    }
  }

  if (errors.length === 0) {
    log(`    ${paint(C.green, "OK ")} manifest, disk, sitemap, and _redirects are consistent`);
  }

  return { errors };
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

async function main() {
  log(paint(C.bold, "Production Blog Integrity Validator"));
  log(`  repo:    ${ROOT}`);
  if (FLAG_PROBE) log(`  origin:  ${ORIGIN}`);
  log(`  manifest: ${relPath(BLOG_JSON_PATH)}`);
  log(`  redirect: ${relPath(REDIRECTS_PATH)}`);
  log(`  sitemap:  ${relPath(SITEMAP_PATH)}`);

  const manifest = loadManifest();
  const rawRedirects = loadRedirects();
  const sitemapUrls = loadSitemapBlogUrls();

  const r1 = check1_filesystem(manifest);
  const r2 = await check2_routing(manifest, rawRedirects);
  const r3 = check3_consistency(manifest, rawRedirects, sitemapUrls);

  const allErrors = [...r1.errors, ...r2.errors, ...r3.errors];

  // Summary
  if (FLAG_JSON) {
    const out = {
      ok: allErrors.length === 0,
      counts: {
        manifest: manifest.length,
        errors: allErrors.length,
        check1: r1.errors.length,
        check2: r2.errors.length,
        check3: r3.errors.length
      },
      errors: allErrors
    };
    process.stdout.write(JSON.stringify(out, null, 2) + "\n");
  } else {
    log("");
    log(paint(C.bold, "─── Summary ───"));
    log(`  total errors: ${paint(allErrors.length ? C.red : C.green, allErrors.length)}`);
    log(`    file system  : ${r1.errors.length}`);
    log(`    url routing  : ${r2.errors.length}`);
    log(`    consistency  : ${r3.errors.length}`);

    if (allErrors.length) {
      log("");
      log(paint(C.bold, "─── Suggested fixes ───"));
      const seen = new Set();
      for (const e of allErrors) {
        if (!e.fix) continue;
        const key = e.type + "::" + (e.fix || "");
        if (seen.has(key)) continue;
        seen.add(key);
        log(`  • [${e.type}] ${e.fix}`);
      }
    }
  }

  process.exit(allErrors.length ? 1 : 0);
}

main().catch((e) => {
  console.error("FATAL:", e && (e.stack || e.message || e));
  process.exit(2);
});
