/**
 * Cloudflare Pages middleware: KV blog + safe static fallback.
 * Prefix-based routing only. /api/* always passes through unchanged.
 */

function extractBlogSlug(pathname) {
  const prefix = "/blog/";

  if (!pathname.startsWith(prefix)) return null;

  let slug = pathname.slice(prefix.length);

  // normalize trailing slash
  if (slug.endsWith("/")) {
    slug = slug.slice(0, -1);
  }

  // reject invalid slugs
  if (!slug || slug.includes("/")) return null;

  return slug;
}

export async function onRequest(context) {
  const { request, env, next } = context;
  const pathname = new URL(request.url).pathname;

  if (pathname.startsWith("/api/")) {
    return next();
  }

  const method = request.method;
  if (method !== "GET" && method !== "HEAD") {
    return next();
  }

  if (!env.SEO_KV) {
    return next();
  }

  if (pathname === "/blog.json" || pathname === "/data/blog.json") {
    try {
      const raw = await env.SEO_KV.get("blog:manifest");
      if (raw) {
        return new Response(method === "HEAD" ? null : raw, {
          status: 200,
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "public, max-age=60"
          }
        });
      }
    } catch (err) {
      console.error("[middleware] KV get blog:manifest failed", err);
    }
    return next();
  }

  const slug = extractBlogSlug(pathname);
  if (slug) {
    try {
      const raw = await env.SEO_KV.get(`blog:html:${slug}`);
      if (raw) {
        return new Response(method === "HEAD" ? null : raw, {
          status: 200,
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "public, max-age=60"
          }
        });
      }
    } catch (err) {
      console.error("[middleware] KV get blog:html failed", slug, err);
    }
    return next();
  }

  return next();
}
