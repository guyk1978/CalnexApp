/**
 * POST /api/draft-reject — set one pending draft to rejected.
 * Strict KV-only. No ASSETS.fetch.
 * Query: ?slug=  Body: {}.
 */
import { normSlug, normalizeDraftStatus } from "./_lib/blog-article-html.js";

const K_DRAFTS = "drafts:pending-seo-pages";

function json(data, status, origin) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": origin || "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}

export async function onRequestOptions(context) {
  const origin = context.request.headers.get("Origin") || "*";
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const origin = request.headers.get("Origin") || "*";

  if (!env.SEO_KV) {
    return json({ ok: false, error: "kv_not_configured" }, 503, origin);
  }

  let body = {};
  try {
    const t = await request.text();
    body = t ? JSON.parse(t) : {};
  } catch {
    return json({ ok: false, error: "invalid_json" }, 400, origin);
  }
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return json({ ok: false, error: "body must be object" }, 400, origin);
  }

  const url = new URL(request.url);
  const slug = normSlug({ slug: url.searchParams.get("slug") || "" });
  if (!slug) {
    return json({ ok: false, error: "slug required" }, 400, origin);
  }

  let doc;
  try {
    const raw = await env.SEO_KV.get(K_DRAFTS);
    doc = raw ? JSON.parse(raw) : { version: 1, items: [] };
  } catch {
    doc = { version: 1, items: [] };
  }
  if (!Array.isArray(doc.items)) doc.items = [];

  const it = doc.items.find((i) => i && normSlug(i) === slug);
  if (!it) {
    return json({ ok: false, error: "slug not found" }, 400, origin);
  }
  if (normalizeDraftStatus(it.status) !== "pending") {
    return json({ ok: false, error: "only pending can be rejected" }, 400, origin);
  }

  it.status = "rejected";
  if (typeof doc.version !== "number" || !Number.isFinite(doc.version)) doc.version = 1;
  else doc.version += 1;

  await env.SEO_KV.put(K_DRAFTS, JSON.stringify(doc));
  return json({ ok: true }, 200, origin);
}
