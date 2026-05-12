export async function onRequestPost({ env }) {
  const slug = "debt-to-income-ratio-mortgage-qualification";

  const raw = await env.SEO_KV.get("drafts:pending-seo-pages");
  const drafts = raw ? JSON.parse(raw) : { items: [] };

  const item = drafts.items.find(
    (x) =>
      x.slug === slug ||
      x.id === slug
  );

  if (!item) {
    return new Response("draft not found", { status: 404 });
  }

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${item.title}</title>
</head>
<body>
  <main>
    <h1>${item.title}</h1>
    <p>${item.excerpt || ""}</p>
    <article>
      ${item.content || ""}
    </article>
  </main>
</body>
</html>
`;

  await env.SEO_KV.put(`blog:html:${slug}`, html);

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