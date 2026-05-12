/**
 * Serve drafts + blog from KV when present (instant publish without Git).
 * Keys: drafts:pending-seo-pages, blog:manifest, blog:html:{slug}
 */
export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);
  const path = url.pathname;

  if (request.method !== "GET" && request.method !== "HEAD") {
    return next();
  }

  if (!env.SEO_KV) {
    return next();
  }

  if (path === "/drafts/pending-seo-pages.json") {
    const raw = await env.SEO_KV.get("drafts:pending-seo-pages");
    if (raw) {
      return new Response(raw, {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "no-store"
        }
      });
    }
    return next();
  }

  if (path === "/data/blog.json") {
    const raw = await env.SEO_KV.get("blog:manifest");
    if (raw) {
      return new Response(raw, {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "no-store"
        }
      });
    }
    return next();
  }

  const m = path.match(/^\/blog\/([^/]+)\/?$/);
  if (m) {
    const slug = m[1];
    const raw = await env.SEO_KV.get(`blog:html:${slug}`);
    if (raw) {
      return new Response(raw, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store"
        }
      });
    }
    return next();
  }

  return next();
}
