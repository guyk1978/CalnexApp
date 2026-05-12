/**
 * POST /api/publish-now — strict KV-only publish.
 * No ASSETS.fetch, no GitHub, no static fallback.
 *
 * Body: {} or { slug?: string }
 *   - With slug: publish only that draft row.
 *   - Without slug: publish every item where status !== "published".
 *
 * Draft mutation rule: only set item.status = "published".
 * Reads/writes ONLY: drafts:pending-seo-pages, blog:manifest, blog:html:{slug}.
 */
import { buildArticleHtml, buildBlogEntryFromItem, normSlug } from "./_lib/blog-article-html.js";

const K_DRAFTS = "drafts:pending-seo-pages";
const K_MANIFEST = "blog:manifest";
const htmlKey = (s) => `blog:html:${s}`;

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

  const slugFilter = normSlug({ slug: body.slug || "" });
  const siteOrigin = env.SEO_SITE_ORIGIN || "https://calnexapp.com";

  let drafts;
  try {
    const raw = await env.SEO_KV.get(K_DRAFTS);
    drafts = raw ? JSON.parse(raw) : { items: [] };
  } catch {
    drafts = { items: [] };
  }
  if (!Array.isArray(drafts.items)) drafts.items = [];
  const items = drafts.items;

  /** @type {object[]} */
  let queue;
  if (slugFilter) {
    queue = items.filter((i) => i && normSlug(i) === slugFilter);
    if (!queue.length) {
      return json({ ok: false, error: "slug not found" }, 400, origin);
    }
  } else {
<<<<<<< Updated upstream
    queue = Array.isArray(doc.items) ? doc.items.filter(Boolean) : [];
=======
    queue = items.filter((i) => i && String(i.status || "") !== "published");
>>>>>>> Stashed changes
  }

  let manifest;
  try {
    const mraw = await env.SEO_KV.get(K_MANIFEST);
    const parsed = mraw ? JSON.parse(mraw) : [];
    manifest = Array.isArray(parsed) ? parsed : [];
  } catch {
    manifest = [];
  }

  let published = 0;

  for (const item of queue) {
    const slug = normSlug(item);
    if (!slug) continue;
    if (String(item.status || "") === "published") continue;

    const html = buildArticleHtml(item, siteOrigin);
    if (!html) {
      return json({ ok: false, error: `html generation failed for ${slug}` }, 500, origin);
    }

    await env.SEO_KV.put(htmlKey(slug), html);

    const rich = buildBlogEntryFromItem(item, slug);
    const entry = {
      slug,
      title: item.title || rich.title,
      excerpt:
        item.excerpt != null && String(item.excerpt).trim() !== ""
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

    item.status = "published";
    published++;
  }

  await env.SEO_KV.put(K_MANIFEST, JSON.stringify(manifest));
  await env.SEO_KV.put(K_DRAFTS, JSON.stringify(drafts));

  return json({ ok: true, published }, 200, origin);
}
