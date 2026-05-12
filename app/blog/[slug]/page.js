import posts from "../../../../data/blog.json";

export async function generateStaticParams() {
  return posts.map(post => ({
    slug: post.slug
  }));
}

export default function BlogPost({ params }) {
  const post = posts.find(p => p.slug === params.slug);

  if (!post) {
    return <div>404 - Page Not Found</div>;
  }

  return (
    <main style={{ padding: "40px", maxWidth: "800px" }}>
      <h1>{post.title}</h1>
      <p>{post.excerpt}</p>

      {post.internal_links?.length > 0 && (
        <div>
          <h3>Related posts</h3>
          <ul>
            {post.internal_links.map((link, i) => (
              <li key={i}>
                <a href={`/blog/${link.slug}`}>{link.title}</a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </main>
  );
}