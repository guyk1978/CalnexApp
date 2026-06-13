/**
 * Blog article page: reading progress bar.
 */
(function blogArticleEnhancements() {
  const bar = document.getElementById("cnReadingProgressBar");
  const article = document.querySelector(".cn-blog-article-body");

  if (!bar || !article) return;

  const updateProgress = () => {
    const rect = article.getBoundingClientRect();
    const articleTop = window.scrollY + rect.top;
    const articleHeight = article.offsetHeight;
    const viewport = window.innerHeight;
    const scrollable = Math.max(articleHeight - viewport * 0.35, 1);
    const scrolled = window.scrollY - articleTop + viewport * 0.15;
    const pct = Math.min(100, Math.max(0, (scrolled / scrollable) * 100));
    bar.style.width = `${pct}%`;
  };

  window.addEventListener("scroll", updateProgress, { passive: true });
  window.addEventListener("resize", updateProgress, { passive: true });
  updateProgress();
})();
