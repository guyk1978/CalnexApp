/**
 * POST /api/publish-now — strict KV-only publish.
 * Reads/writes ONLY:
 * - drafts:pending-seo-pages
 * - blog:manifest
 * - blog:html:{slug}
 */

import {
  buildArticleHtml,
  buildBlogEntryFromItem,
  normSlug
} from "./_lib/blog-article-html.js";

const K_DRAFTS = "drafts:pending-seo-pages";
const K_MANIFEST = "blog:manifest";

const htmlKey = (slug) => `blog:html:${slug}`;

function json(data, status = 200, origin = "*") {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}

export async function onRequestOptions({ request }) {
  const origin = request.headers.get("Origin") || "*";

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

  // ---------- Parse body ----------
  let body = {};
  try {
    const text = await request.text();
    body = text ? JSON.parse(text) : {};
  } catch {
    return json({ ok: false, error: "invalid_json" }, 400, origin);
  }

  if (typeof body !== "object" || Array.isArray(body)) {
    return json({ ok: false, error: "body must be object" }, 400, origin);
  }

  const slugFilter = normSlug(body.slug || "");
  const siteOrigin = env.SEO_SITE_ORIGIN || "https://calnexapp.com";

  // ---------- Load drafts ----------
  let drafts = { items: [] };

  try {
    const raw = await env.SEO_KV.get(K_DRAFTS);
    if (raw) drafts = JSON.parse(raw);
  } catch {}

  if (!Array.isArray(drafts.items)) drafts.items = [];

  const items = drafts.items;

  // ---------- Build queue ----------
  let queue = [];

  if (slugFilter) {
    queue = items.filter(
      (i) => i && normSlug(i) === slugFilter
    );

    if (!queue.length) {
      return json(
        { ok: false, error: "slug not found", slug: slugFilter },
        404,
        origin
      );
    }
  } else {
    queue = items.filter((i) => {
      if (!i) return false;
      return String(i.status || "")
        .trim()
        .toLowerCase() !== "published";
    });
  }

  // ---------- Load manifest ----------
  let manifest = [];

  try {
    const raw = await env.SEO_KV.get(K_MANIFEST);
    const parsed = raw ? JSON.parse(raw) : [];
    manifest = Array.isArray(parsed) ? parsed : [];
  } catch {}

  let published = 0;

  // ---------- Publish loop ----------
  for (const item of queue) {
    const slug = normSlug(item);
    if (!slug) continue;

    const html = buildArticleHtml(item, siteOrigin);

    if (!html) {
      return json(
        { ok: false, error: `html generation failed`, slug },
        500,
        origin
      );
    }

    // write HTML
    await env.SEO_KV.put(htmlKey(slug), html);

    // build manifest entry
    const rich = buildBlogEntryFromItem(item, slug);

    const entry = {
      slug,
      title: item.title || rich.title,
      excerpt:
        item.excerpt && String(item.excerpt).trim()
          ? String(item.excerpt)
          : rich.excerpt,
      updatedDate: item.updatedDate || rich.updatedDate,
      featured: false,
      category: rich.category,
      readTime: rich.readTime
    };

    const idx = manifest.findIndex((p) => p && p.slug === slug);

    if (idx >= 0) {
      entry.featured = Boolean(manifest[idx].featured);
      manifest[idx] = entry;
    } else {
      manifest.push(entry);
    }

    // mark published
    item.status = "published";
    published++;
  }

  // ---------- Save back ----------
  await env.SEO_KV.put(K_MANIFEST, JSON.stringify(manifest));
  await env.SEO_KV.put(K_DRAFTS, JSON.stringify(drafts));

    return json(
    {
      ok: true,
      published,
      total: items.length,
      queued: queue.length
    },
    200,
    origin
  );
}
