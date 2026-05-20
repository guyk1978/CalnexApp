/**
 * GET|HEAD /data/blog.json — blog catalog for /blog/ index.
 * Prefers the static deploy artifact (data/blog.json) so the live list matches git;
 * falls back to KV blog:manifest only when the static file is unavailable.
 */
const HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "public, max-age=300"
};

export async function onRequest(context) {
  const { request, env } = context;
  const method = request.method;

  if (method !== "GET" && method !== "HEAD") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  if (env.ASSETS) {
    const assetUrl = new URL("/data/blog.json", request.url);
    const assetRes = await env.ASSETS.fetch(
      new Request(assetUrl.toString(), { method, headers: request.headers })
    );
    if (assetRes && assetRes.ok) {
      const body = await assetRes.text();
      return new Response(method === "HEAD" ? null : body, { headers: HEADERS });
    }
  }

  let body = "[]";
  if (env.SEO_KV) {
    const raw = await env.SEO_KV.get("blog:manifest");
    if (raw) body = raw;
  }

  return new Response(method === "HEAD" ? null : body, { headers: HEADERS });
}
