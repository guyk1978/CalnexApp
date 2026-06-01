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

const INTERNAL_ROOTS =
  "assets|_next|data|engine|tools|blog|about|contact|dashboard|authors|site-inventory";

const ABS_INTERNAL_RE = new RegExp(
  `(href|src|content)=(["'])/(${INTERNAL_ROOTS})([^"']*)\\2`,
  "gi"
);

const ABS_HOME_RE = /(href|src)=(["'])\/(["'])/gi;

/** Root-absolute paths inside JSON / Next flight payloads (not https://…). */
const EMBEDDED_ABS_RE = new RegExp(
  `(["'\\(\\[=])\\/(${INTERNAL_ROOTS})\\/`,
  "g"
);

/** Rewrite root-absolute internal URLs in attributes and embedded script payloads. */
export function relativizeEmbeddedPaths(text, prefix) {
  if (!text) return text;
  return text.replace(EMBEDDED_ABS_RE, (_, lead, root) => `${lead}${prefix}${root}/`);
}

/**
 * Hosts that SPA-fallback `/_next/*` need bundles under /assets/next/ (see sync-next-to-assets.mjs).
 */
export function relocateNextBundlesToAssets(text, prefix) {
  if (!text) return text;
  let out = text;

  const pairs = [
    [prefix ? `${prefix}_next/` : "/_next/", prefix ? `${prefix}assets/next/` : "/assets/next/"],
    ["/_next/", "/assets/next/"],
    ["_next/", "assets/next/"],
  ];

  for (const [from, to] of pairs) {
    if (from !== to) out = out.split(from).join(to);
  }

  // Next sometimes emits ./_next/ before relativize
  out = out.replace(
    /(href|src|content)=(["'])\.\/_next\//gi,
    (_, attr, quote) => `${attr}=${quote}${prefix}assets/next/`
  );

  return out;
}

/** Fail build if any root-absolute /_next/ references remain in exported HTML. */
export function assertNoAbsoluteNextPaths(html, relPath = "") {
  if (/(["'(=])\/_next\//.test(html)) {
    throw new Error(
      `relativize-export: ${relPath || "HTML"} still contains /_next/ — run sync-next-to-assets and relocateNextBundlesToAssets`
    );
  }
}

/** Rewrite root-absolute internal URLs to depth-relative paths. */
export function relativizeHtml(html, prefix) {
  let next = html.replace(ABS_INTERNAL_RE, (_, attr, quote, root, rest = "") => {
    const tail = rest || "";
    return `${attr}=${quote}${prefix}${root}${tail}${quote}`;
  });

  next = next.replace(ABS_HOME_RE, (_, attr, quote) => {
    const home = prefix || "./";
    return `${attr}=${quote}${home}${quote}`;
  });

  next = relativizeEmbeddedPaths(next, prefix);
  return relocateNextBundlesToAssets(next, prefix);
}

export function injectCalnexRoot(html, prefix) {
  const rootLiteral = JSON.stringify(prefix);
  const snippet = `<script>window.__CALNEX_ROOT__=${rootLiteral};</script>`;
  const pathSrc = `${prefix}assets/js/calnex-path.js`;
  const pathTag = `<script src="${pathSrc}"></script>`;

  let next = html;

  if (next.includes("__CALNEX_ROOT__")) {
    next = next.replace(
      /<script>window\.__CALNEX_ROOT__\s*=\s*[^<]*<\/script>\s*/i,
      `${snippet}\n`
    );
  }

  const calnexPathRe = /<script\s+src=["'](?:\.\.\/)*assets\/js\/calnex-path\.js["']\s*><\/script>\s*/i;
  if (calnexPathRe.test(next)) {
    next = next.replace(calnexPathRe, "");
  }

  if (/<head[^>]*>/i.test(next)) {
    return next.replace(/<head([^>]*)>/i, `<head$1>\n${snippet}\n${pathTag}`);
  }
  if (/<body[^>]*>/i.test(next)) {
    return next.replace(/<body([^>]*)>/i, `<body$1>\n${snippet}\n${pathTag}`);
  }
  return `${snippet}\n${pathTag}\n${next}`;
}
