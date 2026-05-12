import {
  buildArticleHtml,
  normSlug
} from "./_lib/blog-article-html.js";

export async function onRequestPost({ env }) {
  const slug =
    "debt-to-income-ratio-mortgage-qualification";

  const raw = await env.SEO_KV.get(
    "drafts:pending-seo-pages"
  );

  const drafts = raw
    ? JSON.parse(raw)
    : { items: [] };

  const item = drafts.items.find((x) => {
    return normSlug(x) === slug;
  });

  if (!item) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: "draft_not_found"
      }),
      {
        status: 404,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
  }

  const html = buildArticleHtml(
    item,
    "https://calnexapp.com"
  );

  if (!html) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: "html_generation_failed"
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
  }

  await env.SEO_KV.put(
    `blog:html:${slug}`,
    html
  );

  return new Response(
    JSON.stringify({
      ok: true,
      repaired: slug
    }),
    {
      headers: {
        "Content-Type": "application/json"
      }
    }
  );
}