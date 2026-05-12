/**
 * POST /api/publish-now — instant publish (no GitHub, no CI).
 * Requires KV binding SEO_KV on Pages. Drafts + blog list + HTML live in KV; middleware serves /drafts/*, /data/blog.json, /blog/{slug}/.
 *
 * Body must be {} (optionally with ?slug= for single-row Approve from pending|approved).
 * Without ?slug: publishes every item with normalized status "approved".
 */
import {
  buildArticleHtml,
  buildBlogEntryFromItem,
  normSlug,
  normalizeDraftStatus
} from "./_lib/blog-article-html.js";

const K_DRAFTS = "drafts:pending-seo-pages";
const K_MANIFEST = "blog:manifest";
const htmlKey = (slug) => `blog:html:${slug}`;

function json(data, status, origin) {
  const o = origin || "*";
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": o,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}

async function readDraftsDoc(env, request) {
  const raw = await env.SEO_KV.get(K_DRAFTS);
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch {
      return { version: 1, items: [] };
    }
  }
  const r = await env.ASSETS.fetch(new URL("/drafts/pending-seo-pages.json", request.url));
  if (!r.ok) return { version: 1, items: [] };
  const doc = JSON.parse(await r.text());
  await env.SEO_KV.put(K_DRAFTS, JSON.stringify(doc));
  return doc;
}

async function writeDraftsDoc(env, doc) {
  await env.SEO_KV.put(K_DRAFTS, JSON.stringify(doc));
}

async function readManifest(env, request) {
  const raw = await env.SEO_KV.get(K_MANIFEST);
  if (raw) {
    try {
      const p = JSON.parse(raw);
      return Array.isArray(p) ? p : [];
    } catch {
      return [];
    }
  }
  const r = await env.ASSETS.fetch(new URL("/data/blog.json", request.url));
  if (!r.ok) return [];
  let arr = [];
  try {
    const p = await r.json();
    arr = Array.isArray(p) ? p : [];
  } catch {
    arr = [];
  }
  await env.SEO_KV.put(K_MANIFEST, JSON.stringify(arr));
  return arr;
}

async function writeManifest(env, posts) {
  await env.SEO_KV.put(K_MANIFEST, JSON.stringify(posts));
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

  console.log("ENV KEYS:", Object.keys(env || {}));
  console.log("[PUBLISH-NOW] start");

  if (!env.SEO_KV) {
    return json({ ok: false, error: "kv_not_configured" }, 503);
  }

  let bodyText = "";
  try {
    bodyText = await request.text();
  } catch {
    bodyText = "";
  }
  let body = {};
  try {
    body = bodyText ? JSON.parse(bodyText) : {};
  } catch {
    return json({ ok: false, error: "invalid_json" }, 400, origin);
  }
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return json({ ok: false, error: "body must be object" }, 400, origin);
  }

  const url = new URL(request.url);
  const slugParam = normSlug({ slug: url.searchParams.get("slug") || "" });

  const siteOrigin = env.SEO_SITE_ORIGIN || "https://calnexapp.com";

  const doc = await readDraftsDoc(env, request);
  if (!Array.isArray(doc.items)) doc.items = [];

  /** @type {object[]} */
  let queue = [];
  if (slugParam) {
    const it = doc.items.find((i) => i && normSlug(i) === slugParam);
    if (!it) {
      return json({ ok: false, error: "slug not found" }, 400, origin);
    }
    const st = normalizeDraftStatus(it.status);
    if (st === "published") {
      console.log("[PUBLISH-NOW] done");
      return json({ ok: true, published: 0 }, 200, origin);
    }
    if (st !== "pending" && st !== "approved") {
      return json({ ok: false, error: "only pending or approved can be published" }, 400, origin);
    }
    queue = [it];
  } else {
    queue = Array.isArray(doc.items) ? doc.items.filter(Boolean) : [];
  }

  if (!queue.length) {
    console.log("[PUBLISH-NOW] done");
    return json({ ok: true, published: 0 }, 200, origin);
  }

  let posts = await readManifest(env, request);
  if (!Array.isArray(posts)) posts = [];

  let publishedCount = 0;

  for (const item of queue) {
    const slug = normSlug(item);
    if (!slug) continue;
    const st = normalizeDraftStatus(item.status);
    if (st === "published") continue;

    console.log("[PUBLISH-NOW] slug", slug);
    const html = buildArticleHtml(item, siteOrigin);
    if (!html) {
      console.error("[PUBLISH-NOW] html failed", slug);
      return json({ ok: false, error: `html generation failed for ${slug}` }, 500, origin);
    }

    await env.SEO_KV.put(htmlKey(slug), html);
    console.log("[PUBLISH-NOW] written", slug);

    const entry = buildBlogEntryFromItem(item, slug);
    const idx = posts.findIndex((p) => p && p.slug === slug);
    if (idx >= 0) posts[idx] = { ...posts[idx], ...entry, featured: Boolean(posts[idx].featured) };
    else posts.push({ ...entry, featured: false });

    item.status = "published";
    publishedCount += 1;
  }

  if (typeof doc.version !== "number" || !Number.isFinite(doc.version)) doc.version = 1;
  else doc.version += 1;

  await writeManifest(env, posts);
  await writeDraftsDoc(env, doc);

  console.log("[PUBLISH-NOW] done");
  return json({ ok: true, published: publishedCount }, 200, origin);
}

