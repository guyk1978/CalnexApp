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

  if (!env.SEO_KV) {
    return new Response(method === "HEAD" ? null : "[]", { headers: HEADERS });
  }

  const raw = await env.SEO_KV.get("blog:manifest");
  const body = raw || "[]";

  return new Response(method === "HEAD" ? null : body, { headers: HEADERS });
}
