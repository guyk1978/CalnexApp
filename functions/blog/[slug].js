/**
 * GET|HEAD /blog/:slug (and /blog/:slug/) — HTML from KV first, then static assets.
 *
 * Single-segment dynamic route (`[slug].js`), so `/blog/` still resolves to the
 * static blog index. Production 404s happen when `blog:html:{slug}` is missing
 * in KV but the post exists as `blog/{slug}/index.html` in the deployment bundle.
 * After a KV miss we fetch static assets via explicit index.html paths (Pretty URLs
 * do not always apply when a Function handles the route first).
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

async function fetchBlogStatic(env, request, slug, method) {
  if (!env.ASSETS) return null;

  const base = new URL(request.url);
  const candidates = [`/blog/${slug}/index.html`, `/blog/${slug}/`, `/blog/${slug}`];

  for (const pathname of candidates) {
    const url = new URL(pathname, base);
    const assetRequest = new Request(url.toString(), {
      method,
      headers: request.headers
    });
    const res = await env.ASSETS.fetch(assetRequest);
    if (res && res.status !== 404) return res;
  }

  return null;
}

export async function onRequest(context) {
  const { request, env, params } = context;
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

  const assetRes = await fetchBlogStatic(env, request, slug, method);
  if (assetRes) return assetRes;

  return notFound();
}
