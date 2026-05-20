/**
 * GET|HEAD /data/blog.json — manifest from KV only.
 * Returns "[]" when KV is missing or the manifest key is empty.
 * No ASSETS.fetch, no static fallback.
 */
const HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "public, max-age=60"
};

export async function onRequest(context) {
  const { request, env } = context;
  const method = request.method;

  if (method !== "GET" && method !== "HEAD") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  let body = "[]";

  if (env.SEO_KV) {
    const raw = await env.SEO_KV.get("blog:manifest");
    if (raw) body = raw;
  }

  if ((!body || body === "[]") && env.ASSETS) {
    const assetUrl = new URL("/data/blog.json", request.url);
    const assetRes = await env.ASSETS.fetch(new Request(assetUrl.toString(), { method, headers: request.headers }));
    if (assetRes && assetRes.ok) {
      body = await assetRes.text();
    }
  }

  return new Response(method === "HEAD" ? null : body, { headers: HEADERS });
}
