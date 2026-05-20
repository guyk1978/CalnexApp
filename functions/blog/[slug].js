/**
 * GET|HEAD /blog/:slug (and /blog/:slug/) — HTML from KV first, else static deploy.
 *
 * Single-segment dynamic route (`[slug].js`), so `/blog/` still resolves to the
 * static blog index. When KV has no `blog:html:{slug}`, delegate to the static
 * asset pipeline via `next()` so Cloudflare Pretty URLs serve
 * `blog/{slug}/index.html` without ASSETS.fetch edge cases or 200 rewrite loops.
 */
function notFound() {
  return new Response("404 - Page Not Found", {
    status: 404,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

/** Fallback when `next` is unavailable (local tooling). */
async function fetchBlogStatic(env, request, slug, method) {
  if (!env.ASSETS) return null;

  const base = new URL(request.url);
  const candidates = [`/blog/${slug}/index.html`, `/blog/${slug}/`, `/blog/${slug}`];

  for (const pathname of candidates) {
    const url = new URL(pathname, base);
    const assetRequest = new Request(url.toString(), { method });
    const res = await env.ASSETS.fetch(assetRequest);
    if (res && res.status !== 404) return res;
  }

  return null;
}

export async function onRequest(context) {
  const { request, env, params, next } = context;
  const method = request.method;

  if (method !== "GET" && method !== "HEAD") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const raw = params && params.slug != null ? String(params.slug) : "";
  const slug = raw.replace(/\/+$/, "").replace(/[^a-z0-9-]/gi, "");

  if (!slug) return notFound();

  if (env.SEO_KV) {
    const html = await env.SEO_KV.get(`blog:html:${slug}`);
    if (html) {
      return new Response(method === "HEAD" ? null : html, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "public, max-age=60"
        }
      });
    }
  }

  if (typeof next === "function") {
    return next();
  }

  const assetRes = await fetchBlogStatic(env, request, slug, method);
  if (assetRes) return assetRes;

  return notFound();
}
