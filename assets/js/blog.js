const BlogModule = (() => {
  const blogList = document.getElementById("blogList");
  const blogPost = document.getElementById("blogPost");
  const POSTS_PATH = "/data/posts.json";

  const safeText = (text = "") =>
    String(text)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");

  const setMeta = ({ title, description, url }) => {
    if (title) {
      document.title = title;
      const ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle) ogTitle.setAttribute("content", title);
    }
    if (description) {
      const desc = document.querySelector('meta[name="description"]');
      const ogDesc = document.querySelector('meta[property="og:description"]');
      if (desc) desc.setAttribute("content", description);
      if (ogDesc) ogDesc.setAttribute("content", description);
    }
    if (url) {
      const ogUrl = document.querySelector('meta[property="og:url"]');
      const canonical = document.querySelector("link[rel='canonical']");
      if (ogUrl) ogUrl.setAttribute("content", url);
      if (canonical) canonical.setAttribute("href", url);
    }
  };

  const fetchPosts = async () => {
    const response = await fetch(POSTS_PATH);
    if (!response.ok) {
      throw new Error("Could not load posts.");
    }
    return response.json();
  };

  const renderBlogIndex = async () => {
    try {
      const posts = await fetchPosts();
      if (!Array.isArray(posts) || posts.length === 0) {
        blogList.innerHTML = "<p>No posts found.</p>";
        return;
      }

      blogList.innerHTML = posts
        .map(
          (post) => `
          <article class="card blog-card">
            <p class="blog-meta">${safeText(post.date)} • ${safeText(post.readTime)}</p>
            <h2><a href="/blog/${encodeURIComponent(post.slug)}">${safeText(post.title)}</a></h2>
            <p>${safeText(post.excerpt)}</p>
            <a class="btn btn-ghost" href="/blog/${encodeURIComponent(post.slug)}">Read Article</a>
          </article>
        `
        )
        .join("");
    } catch (_error) {
      blogList.innerHTML = "<p>Unable to load blog posts right now.</p>";
    }
  };

  const renderPost = async () => {
    try {
      const pathParts = window.location.pathname.split("/").filter(Boolean);
      const slugFromPath = pathParts[pathParts.length - 1];
      const slugFromQuery = new URLSearchParams(window.location.search).get("slug");
      const slug = slugFromPath === "blog" ? slugFromQuery : slugFromPath;
      const posts = await fetchPosts();
      const post = posts.find((item) => item.slug === slug);

      if (!post) {
        blogPost.innerHTML = "<h1>Post Not Found</h1><p>Try another article from the blog.</p>";
        return;
      }

      const postUrl = `${window.location.origin}/blog/${post.slug}`;
      setMeta({
        title: `${post.title} - CalnexApp Blog`,
        description: post.excerpt,
        url: postUrl
      });

      const paragraphs = post.content
        .map((line) => `<p>${safeText(line)}</p>`)
        .join("");

      blogPost.innerHTML = `
        <p class="blog-meta">${safeText(post.date)} • ${safeText(post.readTime)}</p>
        <h1>${safeText(post.title)}</h1>
        <p>${safeText(post.excerpt)}</p>
        <div class="post-content">${paragraphs}</div>
        <p><a class="btn btn-ghost" href="/blog">Back to Blog</a></p>
      `;
    } catch (_error) {
      blogPost.innerHTML = "<h1>Error</h1><p>Unable to load this post.</p>";
    }
  };

  const init = () => {
    const page = document.body.dataset.page;
    if (page === "blog-index" && blogList) {
      renderBlogIndex();
    }
    if (page === "blog-post" && blogPost) {
      renderPost();
    }
  };

  return { init };
})();

window.addEventListener("DOMContentLoaded", BlogModule.init);
