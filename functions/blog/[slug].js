/**
 * GET|HEAD /blog/:slug (and /blog/:slug/) — HTML from KV first, then static assets.
 *
 * Single-segment dynamic route (`[slug].js`), so `/blog/` still resolves to the
 * static blog index. Production 404s happen when `blog:html:{slug}` is missing
 * in KV but the post exists as `blog/{slug}/index.html` in the deployment bundle.
 * After a KV miss we delegate to `env.ASSETS.fetch(request)` so those pages load.
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

  if (env.ASSETS) {
    const assetRes = await env.ASSETS.fetch(request);
    if (assetRes && assetRes.status !== 404) return assetRes;
  }

  return notFound();
}
