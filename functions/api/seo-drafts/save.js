/**
 * Cloudflare Pages Function — production save for SEO drafts JSON.
 *
 * POST /api/seo-drafts/save
 * Body: { "version": number, "items": array } (same contract as local persist server)
 * Response: { "ok": true, "version": number } or 409 { "ok": false, "error": "version_conflict", "version": number }
 *
 * Required Pages environment variables (Settings → Environment variables):
 *   GITHUB_TOKEN        — PAT with repo scope: contents:write (never expose to client)
 *   GITHUB_OWNER        — e.g. "myorg"
 *   GITHUB_REPO         — e.g. "CalnexApp"
 *   GITHUB_BRANCH       — optional, default "main"
 *   SEO_DRAFTS_PATH     — optional, default "drafts/pending-seo-pages.json"
 *
 * Optional:
 *   ALLOWED_ORIGINS     — comma-separated; if set, Origin must match one (e.g. https://calnexapp.com)
 */

const GH_API = "https://api.github.com";

function corsHeaders(origin) {
  const o = origin || "*";
  return {
    "Access-Control-Allow-Origin": o,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400"
  };
}

function json(data, status, origin) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(origin)
    }
  });
}

function encodePathForGitHub(filePath) {
  return String(filePath || "")
    .replace(/\\/g, "/")
    .split("/")
    .map((p) => encodeURIComponent(p))
    .join("%2F");
}

function utf8ToBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) {
    bin += String.fromCharCode(bytes[i]);
  }
  return btoa(bin);
}

function base64ToUtf8(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

function normalizeOriginAllowEntry(entry) {
  const s = String(entry || "").trim().replace(/\/$/, "");
  return s;
}

function checkOrigin(request, env) {
  const allowed = (env.ALLOWED_ORIGINS || "").trim();
  if (!allowed) return true;
  const origin = (request.headers.get("Origin") || "").trim().replace(/\/$/, "");
  const referer = request.headers.get("Referer") || "";
  let refOrigin = "";
  try {
    if (referer) refOrigin = new URL(referer).origin.replace(/\/$/, "");
  } catch (_) {}
  const list = allowed.split(",").map((s) => normalizeOriginAllowEntry(s)).filter(Boolean);
  return list.some((a) => origin === a || refOrigin === a);
}

/** CORS preflight — must be a separate export; POST is handled by `onRequestPost` only. */
export async function onRequestOptions(context) {
  const origin = context.request.headers.get("Origin") || "";
  return new Response(null, { status: 204, headers: corsHeaders(origin || "*") });
}

/**
 * POST /api/seo-drafts/save — routed from `functions/api/seo-drafts/save.js`.
 * Use `onRequestPost` (not only `onRequest`) so Pages invokes POST correctly.
 */
export async function onRequestPost(context) {
  const { request, env } = context;
  const origin = request.headers.get("Origin") || "";

  if (!checkOrigin(request, env)) {
    return json({ ok: false, error: "origin_forbidden" }, 403, origin || "*");
  }

  const token = env.GITHUB_TOKEN;
  const owner = env.GITHUB_OWNER;
  const repo = env.GITHUB_REPO;
  const branch = env.GITHUB_BRANCH || "main";
  const filePath = env.SEO_DRAFTS_PATH || "drafts/pending-seo-pages.json";

  if (!token || !owner || !repo) {
    return json({ ok: false, error: "github_not_configured" }, 503, origin || "*");
  }

  let incoming;
  try {
    incoming = await request.json();
  } catch {
    return json({ ok: false, error: "invalid_json" }, 400, origin || "*");
  }

  if (typeof incoming.version !== "number" || !Number.isFinite(incoming.version)) {
    return json({ ok: false, error: "version (number) required" }, 400, origin || "*");
  }
  if (!Array.isArray(incoming.items)) {
    return json({ ok: false, error: "items (array) required" }, 400, origin || "*");
  }

  const ghHeaders = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "CalnexApp-SEO-Draft-Save"
  };

  const encodedPath = encodePathForGitHub(filePath);
  const getUrl = `${GH_API}/repos/${owner}/${repo}/contents/${encodedPath}?ref=${encodeURIComponent(branch)}`;

  const getRes = await fetch(getUrl, { headers: ghHeaders });
  if (!getRes.ok) {
    const t = await getRes.text();
    console.error("[seo-drafts/save] GitHub GET failed", getRes.status, t.slice(0, 500));
    return json({ ok: false, error: "github_read_failed", status: getRes.status }, 502, origin || "*");
  }

  const meta = await getRes.json();
  const shaBlob = meta.sha;
  if (!shaBlob || !meta.content) {
    return json({ ok: false, error: "github_missing_blob" }, 502, origin || "*");
  }

  let current;
  try {
    const raw = base64ToUtf8(meta.content.replace(/\s/g, ""));
    current = JSON.parse(raw);
  } catch (e) {
    console.error("[seo-drafts/save] parse current file", e);
    return json({ ok: false, error: "github_invalid_json" }, 502, origin || "*");
  }

  let currentVersion = current.version;
  if (typeof currentVersion === "string" && !isNaN(Number(currentVersion))) {
    currentVersion = Number(currentVersion);
  }
  if (typeof currentVersion !== "number" || !Number.isFinite(currentVersion)) {
    currentVersion = 1;
  }

  if (incoming.version !== currentVersion) {
    return json(
      { ok: false, error: "version_conflict", version: currentVersion },
      409,
      origin || "*"
    );
  }

  const outDoc = {
    version: currentVersion + 1,
    items: incoming.items
  };
  const fileUtf8 = JSON.stringify(outDoc, null, 2) + "\n";
  const contentB64 = utf8ToBase64(fileUtf8);

  const putBody = {
    message: env.SEO_COMMIT_MESSAGE || "chore(seo): update drafts/pending-seo-pages.json (dashboard)",
    content: contentB64,
    sha: shaBlob,
    branch
  };

  const putRes = await fetch(`${GH_API}/repos/${owner}/${repo}/contents/${encodedPath}`, {
    method: "PUT",
    headers: { ...ghHeaders, "Content-Type": "application/json" },
    body: JSON.stringify(putBody)
  });

  if (!putRes.ok) {
    const t = await putRes.text();
    console.error("[seo-drafts/save] GitHub PUT failed", putRes.status, t.slice(0, 500));
    return json({ ok: false, error: "github_write_failed", status: putRes.status }, 502, origin || "*");
  }

  return json({ ok: true, version: outDoc.version }, 200, origin || "*");
}
