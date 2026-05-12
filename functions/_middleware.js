/**
 * Cloudflare Pages middleware
 * KV-backed blog routing with safe static fallback.
 *
 * Rules:
 * - /api/* always passes through
 * - /data/blog.json served from KV
 * - /blog/:slug and /blog/:slug/ served ONLY from KV
 * - Missing blog slug => real 404 (never homepage fallback)
 * - Everything else => normal static handling
 */

function extractBlogSlug(pathname) {
  const prefix = "/blog/";

  if (!pathname.startsWith(prefix)) {
    return null;
  }

  let slug = pathname.slice(prefix.length);

  // normalize trailing slash
  if (slug.endsWith("/")) {
    slug = slug.slice(0, -1);
  }

  // reject empty slug
  if (!slug) {
    return null;
  }

  // reject nested paths
  if (slug.includes("/")) {
    return null;
  }

  return slug;
}

function jsonResponse(body, status = 200) {
  return new Response(body, {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=60"
    }
  });
}

function htmlResponse(body, status = 200) {
  return new Response(body, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=60"
    }
  });
}

function notFoundResponse() {
  return new Response(
    `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8" />
      <title>404 Not Found</title>
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <style>
        body {
          font-family: Arial, sans-serif;
          padding: 40px;
          line-height: 1.6;
        }
      </style>
    </head>
    <body>
      <h1>404 - Page Not Found</h1>
      <p>The requested blog page does not exist.</p>
    </body>
    </html>
    `,
    {
      status: 404,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store"
      }
    }
  );
}

export async function onRequest(context) {
  const { request, env, next } = context;

  const url = new URL(request.url);
  const pathname = url.pathname;

  const method = request.method;

  console.log("[MW] request", method, pathname);

  /**
   * API ROUTES
   * Always pass through untouched.
   */
  if (pathname.startsWith("/api/")) {
    console.log("[MW][API_PASS]", pathname);
    return next();
  }

  /**
   * Only intercept GET/HEAD
   */
  if (method !== "GET" && method !== "HEAD") {
    return next();
  }

  /**
   * No KV configured
   */
  if (!env.SEO_KV) {
    console.log("[MW] SEO_KV missing");
    return next();
  }

  /**
   * BLOG MANIFEST
   */
  if (
    pathname === "/blog.json" ||
    pathname === "/data/blog.json"
  ) {
    try {
      const raw = await env.SEO_KV.get("blog:manifest");

      if (!raw) {
        console.log("[MW][BLOG_MANIFEST_MISS]");
        return jsonResponse("[]");
      }

      console.log("[MW][BLOG_MANIFEST_HIT]");

      return jsonResponse(
        method === "HEAD" ? null : raw
      );
    } catch (err) {
      console.error("[MW][KV_ERROR][MANIFEST]", err);

      return jsonResponse(
        JSON.stringify({
          error: "manifest_error"
        }),
        500
      );
    }
  }

  /**
   * BLOG HTML ROUTING
   */
  const slug = extractBlogSlug(pathname);

  if (slug) {
    console.log("[MW][BLOG_REQUEST]", slug);

    try {
      const key = `blog:html:${slug}`;

      const raw = await env.SEO_KV.get(key);

      if (!raw) {
        console.log("[MW][BLOG_MISS]", slug);

        // IMPORTANT:
        // Never fallback to next()
        // Otherwise Cloudflare serves index.html
        return notFoundResponse();
      }

      console.log("[MW][BLOG_HIT]", slug);

      return htmlResponse(
        method === "HEAD" ? null : raw
      );
    } catch (err) {
      console.error("[MW][KV_ERROR][BLOG]", slug, err);

      return new Response("Internal Server Error", {
        status: 500
      });
    }
  }

  /**
   * STATIC FALLBACK
   */
  return next();
}
