/**
 * Depth-aware relative prefixes for portable static export (out/).
 */
import path from "path";

/** e.g. tools/take-home-pay/index.html → 2 */
export function htmlDepthFromOut(relPath) {
  const normalized = relPath.replace(/\\/g, "/");
  const dir = path.posix.dirname(normalized);
  if (dir === "." || dir === "") return 0;
  return dir.split("/").filter(Boolean).length;
}

/** depth 0 → ""; depth 2 → "../../" */
export function relativePrefix(depth) {
  if (!depth || depth < 1) return "";
  return "../".repeat(depth);
}

/**
 * Longest match first so /assets/next/ is not parsed as /assets/.
 * _next is rewritten to assets/next before other passes.
 */
const INTERNAL_PATH_PREFIXES = [
  "assets/next",
  "assets/js",
  "assets/css",
  "_next",
  "assets",
  "data",
  "engine",
  "tools",
  "blog",
  "about",
  "contact",
  "dashboard",
  "authors",
  "site-inventory",
];

const ATTR_ABS_RE = new RegExp(
  `(href|src|content|as)=(["'])/(${INTERNAL_PATH_PREFIXES.map(escapeRe).join("|")})(/[^"']*)?\\2`,
  "gi"
);

const ATTR_HOME_RE = /(href|src)=(["'])\/(["'])/gi;

/** Inside __next_f, __next_s, :HL[...] — not https:// */
const EMBEDDED_ABS_RE = new RegExp(
  `(\\"|'|\\\\"|\\\\'|\\(|\\[|,|:)\\/(${INTERNAL_PATH_PREFIXES.map(escapeRe).join("|")})(?=/)`,
  "g"
);

/** JSON-escaped slashes in flight payloads: \/_next\/ or \/assets\/ */
const ESCAPED_SLASH_ABS_RE = new RegExp(
  `\\\\/(${INTERNAL_PATH_PREFIXES.map(escapeRe).join("|")})\\\\/`,
  "g"
);

function escapeRe(segment) {
  return segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function joinPrefix(prefix, tail) {
  const root = tail.startsWith("/") ? tail.slice(1) : tail;
  return collapseUrlSlashes(`${prefix}${root}`);
}

/** Collapse duplicate slashes in relative URLs (not after `http:` / `https:`). */
export function collapseUrlSlashes(url) {
  if (!url || /^https?:\/\//i.test(url) || /^data:/i.test(url)) return url;
  return url.replace(/([^:])\/{2,}/g, "$1/");
}

/** Map site-root paths; _next → assets/next for Cloudflare static hosts. */
export function normalizeInternalRoot(root) {
  return root === "_next" ? "assets/next" : root;
}

export function relocateNextBundlesToAssets(text, prefix) {
  if (!text) return text;

  let out = text;
  const replacements = [
    [prefix ? `${prefix}_next/` : "/_next/", prefix ? `${prefix}assets/next/` : "/assets/next/"],
    ["/_next/", "/assets/next/"],
    ["\\/_next\\/", "\\/assets\\/next\\/"],
  ];

  for (const [from, to] of replacements) {
    if (from !== to) out = out.split(from).join(to);
  }

  out = out.replace(
    /(href|src|content|as)=(["'])\.\/_next\//gi,
    (_, attr, quote) => `${attr}=${quote}${prefix}assets/next/`
  );

  return out;
}

export function relativizeEmbeddedPaths(text, prefix) {
  if (!text) return text;

  let out = relocateNextBundlesToAssets(text, prefix);

  out = out.replace(EMBEDDED_ABS_RE, (_, lead, root) => {
    const normalized = normalizeInternalRoot(root);
    // Do not append "/" — the source already has "/" immediately after the root segment.
    return `${lead}${joinPrefix(prefix, normalized)}`;
  });

  out = out.replace(ESCAPED_SLASH_ABS_RE, (_, root) => {
    const normalized = normalizeInternalRoot(root);
    const rel = joinPrefix(prefix, normalized).replace(/\//g, "\\/");
    return `\\/${rel}`;
  });

  return out;
}

export function relativizeHtml(html, prefix) {
  let next = relocateNextBundlesToAssets(html, prefix);

  next = next.replace(ATTR_ABS_RE, (_, attr, quote, root, rest = "") => {
    const normalized = normalizeInternalRoot(root);
    const tail = rest || "/";
    const path = tail.startsWith("/") ? `${normalized}${tail}` : `${normalized}/${tail}`;
    return `${attr}=${quote}${joinPrefix(prefix, path)}${quote}`;
  });

  next = next.replace(ATTR_HOME_RE, (_, attr, quote) => {
    const home = prefix || "./";
    return `${attr}=${quote}${home}${quote}`;
  });

  next = relativizeEmbeddedPaths(next, prefix);

  next = next.replace(
    /(href|src|content|as)=(["'])([^"']+)\2/gi,
    (_, attr, quote, url) => `${attr}=${quote}${collapseUrlSlashes(url)}${quote}`
  );

  next = dedupeRelativePathSlashes(next);

  return next;
}

/** Collapse `//` inside depth-relative paths embedded in JSON / flight payloads. */
export function dedupeRelativePathSlashes(html) {
  return html.replace(/(?:\.\.\/)+[^"'\\s<>]+/g, (match) => collapseUrlSlashes(match));
}

/** Fail when script/link/preload tags still use site-root absolute internal paths. */
export function assertNoAbsoluteAssetRefs(html, relPath = "") {
  const bad = [];
  const tagRe = /<(script|link)\b[^>]*>/gi;
  let tag;
  while ((tag = tagRe.exec(html)) !== null) {
    const chunk = tag[0];
    for (const attr of ["src", "href"]) {
      const m = new RegExp(`${attr}=["']([^"']+)["']`, "i").exec(chunk);
      if (!m) continue;
      const url = m[1];
      if (/^https?:\/\//i.test(url) || /^data:/i.test(url)) continue;
      if (/^\/(assets|_next)(\/|$)/.test(url)) {
        bad.push(`<${tag[1]} ${attr}="${url}"`);
      }
    }
  }
  if (bad.length) {
    throw new Error(
      `relativize-export: ${relPath || "HTML"} still has absolute asset refs:\n  ${bad.slice(0, 8).join("\n  ")}`
    );
  }
}

export function assertNoAbsoluteNextPaths(html, relPath = "") {
  if (/(["'(=:,]|^)\/_next\//.test(html)) {
    throw new Error(
      `relativize-export: ${relPath || "HTML"} still contains /_next/ — run sync-next-to-assets first`
    );
  }
}

/** Static tool pages must not ship Next.js client bundles. */
export function assertNoNextClientBundles(html, relPath = "") {
  if (/\/assets\/next\//.test(html) || /\/_next\//.test(html)) {
    throw new Error(
      `relativize-export: ${relPath || "HTML"} must not reference Next client bundles (static tool page)`
    );
  }
}

export function injectCalnexRoot(html, prefix) {
  const rootLiteral = JSON.stringify(prefix);
  const snippet = `<script>window.__CALNEX_ROOT__=${rootLiteral};</script>`;
  const pathSrc = `${prefix}assets/js/calnex-path.js`;
  const pathTag = `<script src="${pathSrc}"></script>`;

  let next = html.replace(
    /<script>\s*window\.__CALNEX_ROOT__\s*=\s*[^<]*<\/script>\s*/gi,
    ""
  );
  next = next.replace(
    /<script\s+src=["'](?:\.\.\/)*assets\/js\/calnex-path\.js["']\s*><\/script>\s*/gi,
    ""
  );

  if (/<head[^>]*>/i.test(next)) {
    return next.replace(/<head([^>]*)>/i, `<head$1>\n${snippet}\n${pathTag}`);
  }
  if (/<body[^>]*>/i.test(next)) {
    return next.replace(/<body([^>]*)>/i, `<body$1>\n${snippet}\n${pathTag}`);
  }
  return `${snippet}\n${pathTag}\n${next}`;
}
