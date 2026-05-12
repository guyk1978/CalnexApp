/**
 * GET|HEAD /blog/:slug (and /blog/:slug/) — HTML from KV only.
 *
 * Single-segment dynamic route (`[slug].js`), so `/blog/` itself still resolves
 * to the static blog index. No ASSETS.fetch and no fallback for missing slugs:
 * if `blog:html:{slug}` is absent we return a plain 404.
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
  if (!env.SEO_KV) return notFound();

  const html = await env.SEO_KV.get(`blog:html:${slug}`);
  if (!html) return notFound();

  return new Response(method === "HEAD" ? null : html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=60"
    }
  });
}
