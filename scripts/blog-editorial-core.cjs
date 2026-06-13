/**
 * Shared blog editorial layout helpers (patch + publish).
 */
const { load: loadCheerio } = (() => {
  try {
    return { load: require("cheerio").load };
  } catch {
    return { load: null };
  }
})();

function slugifyHeading(text) {
  return String(text ?? "")
    .toLowerCase()
    .replace(/&[^;\s]+;/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 72);
}

function stripTags(html) {
  return String(html ?? "").replace(/<[^>]+>/g, "").trim();
}

function extractHeadingsFromArticleHtml(articleInnerHtml) {
  const headings = [];
  const re = /<h([23])([^>]*)>([\s\S]*?)<\/h\1>/gi;
  let match;
  const used = new Set();

  while ((match = re.exec(articleInnerHtml))) {
    const level = Number(match[1]);
    const attrs = match[2] || "";
    const text = stripTags(match[3]);
    if (!text) continue;

    let id = "";
    const idMatch = attrs.match(/\bid=(["'])([^"']+)\1/i);
    if (idMatch) {
      id = idMatch[2];
    } else {
      let base = slugifyHeading(text) || `section-${headings.length + 1}`;
      let candidate = base;
      let n = 2;
      while (used.has(candidate)) {
        candidate = `${base}-${n}`;
        n += 1;
      }
      id = candidate;
      used.add(id);
    }

    headings.push({ level, id, text });
  }

  return headings;
}

function addHeadingIds(articleInnerHtml) {
  const used = new Set();
  return articleInnerHtml.replace(/<h([23])([^>]*)>([\s\S]*?)<\/h\1>/gi, (full, level, attrs, inner) => {
    if (/\bid=/.test(attrs)) {
      const idMatch = attrs.match(/\bid=(["'])([^"']+)\1/i);
      if (idMatch) used.add(idMatch[2]);
      return full;
    }
    const text = stripTags(inner);
    let base = slugifyHeading(text) || `section-${used.size + 1}`;
    let id = base;
    let n = 2;
    while (used.has(id)) {
      id = `${base}-${n}`;
      n += 1;
    }
    used.add(id);
    return `<h${level}${attrs} id="${id}">${inner}</h${level}>`;
  });
}

function wrapMathEquations(articleInnerHtml) {
  return articleInnerHtml.replace(/<p>\s*<strong>([\s\S]*?)<\/strong>\s*<\/p>/gi, (full, inner) => {
    const plain = stripTags(inner);
    const looksLikeMath =
      /[=×÷+\-^]/.test(plain) &&
      (/[A-Za-z]\s*=/.test(plain) || /<sup>/.test(inner) || /sub>/.test(inner) || /[₀-₉]/.test(plain));
    if (!looksLikeMath) return full;
    return `<div class="cn-math-callout" role="note"><span class="cn-math-callout__label">Formula</span><div class="cn-math-callout__equation"><strong>${inner}</strong></div></div>`;
  });
}

/** @deprecated TOC removed from integrated layout; kept for legacy callers */
function buildTocHtml() {
  return "";
}

const PROGRESS_BAR_HTML = `<div class="cn-reading-progress" aria-hidden="true"><div class="cn-reading-progress__bar" id="cnReadingProgressBar"></div></div>`;

const FRAUNCES_LINK =
  '<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&display=swap" rel="stylesheet" />';

const BLOG_ARTICLE_SCRIPT = '<script src="/assets/js/blog-article.js" defer></script>';

const BLOG_SIDEBAR_SEARCH_ICON = `<svg class="cn-blog-search__icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>`;

function renderBlogSidebarHtml() {
  return `<aside class="cn-blog-sidebar cn-calc-global-sidebar" aria-label="Blog navigation">
          <div class="cn-blog-sidebar__stack">
            <div class="cn-blog-sidebar__block">
              <p class="cn-blog-sidebar__label">Search</p>
              <label class="cn-blog-search" for="blogSearchInput">
                ${BLOG_SIDEBAR_SEARCH_ICON}
                <input id="blogSearchInput" type="search" placeholder="Search guides..." aria-label="Search blog articles" />
              </label>
            </div>
            <nav class="cn-blog-sidebar__block" aria-label="Categories">
              <p class="cn-blog-sidebar__label">Categories</p>
              <ul id="blogCategoryFilters" class="cn-blog-categories" aria-label="Blog categories"></ul>
            </nav>
          </div>
        </aside>`;
}

function ensureHeadAssets(html) {
  let next = html;
  if (!next.includes("fonts.googleapis.com/css2?family=Fraunces")) {
    next = next.replace("</head>", `    ${FRAUNCES_LINK}\n  </head>`);
  }
  if (!next.includes("blog-article.js")) {
    next = next.replace(
      /<script src="\/assets\/js\/app\.js" defer><\/script>/i,
      `${BLOG_ARTICLE_SCRIPT}\n    <script src="/assets/js/app.js" defer></script>`
    );
  }
  return next;
}

function ensureBodyClass(html) {
  return html.replace(/<body([^>]*)>/i, (match, attrs) => {
    const classMatch = attrs.match(/class=(["'])([^"']*)\1/);
    const classes = new Set((classMatch ? classMatch[2] : "").split(/\s+/).filter(Boolean));
    classes.add("cn-blog-article-page");
    classes.add("cn-blog-index-page");
    classes.add("cn-calculator-page");
    classes.add("cn-site-chrome");
    const nextClass = [...classes].join(" ");
    if (classMatch) {
      return `<body${attrs.replace(/class=(["'])([^"']*)\1/, `class="${nextClass}"`)}>`;
    }
    return `<body${attrs} class="${nextClass}">`;
  });
}

function ensureProgressBar(html) {
  if (html.includes("cn-reading-progress")) return html;
  return html.replace(/<body[^>]*>/i, (open) => `${open}\n    ${PROGRESS_BAR_HTML}`);
}

function normalizeHeroHtml(heroHtml) {
  let h = String(heroHtml || "").trim();
  if (!h) return "";

  h = h.replace(/<section([^>]*)\bcn-blog-editorial__hero[^>]*>/i, "<header class=\"cn-blog-article-header\">");
  h = h.replace(/<section([^>]*)\bcn-article-page-title[^>]*>/i, "<header class=\"cn-blog-article-header\">");
  h = h.replace(/<section([^>]*)\bpage-title[^>]*>/i, "<header class=\"cn-blog-article-header\">");
  h = h.replace(/<\/section>/i, "</header>");
  h = h.replace(/cn-blog-editorial__meta/g, "cn-blog-article-meta");
  h = h.replace(/<p class="eyebrow">[^<]*<\/p>\s*/i, "");
  h = h.replace(/\sclass="[^"]*"/i, (match) => {
    if (match.includes("cn-blog-article-header")) return ' class="cn-blog-article-header"';
    return "";
  });
  if (!h.includes("cn-blog-article-header")) {
    h = `<header class="cn-blog-article-header">${h}</header>`;
  }
  return h;
}

function stripCardSections(html) {
  return String(html || "")
    .replace(/<aside class="cn-blog-toc"[\s\S]*?<\/aside>/gi, "")
    .replace(/<section class="card([^"]*)">\s*<h2>FAQ<\/h2>/gi, '<section class="cn-blog-article-faq$1"><h2>FAQ</h2>')
    .replace(/<section class="card([^"]*)"/gi, '<section class="cn-blog-article-extra$1"')
    .replace(/<section class="py-12 border-t[^"]*"/gi, '<section class="cn-blog-article-extra"')
    .replace(/<section class="cn-blog-article-extra">\s*<h2>FAQ<\/h2>/gi, '<section class="cn-blog-article-faq"><h2>FAQ</h2>')
    .replace(/class="cn-blog-faq faq-list"/gi, 'class="cn-blog-article-faq faq-list"');
}

function buildEditorialArticleBodyHtml(bodyHtml) {
  let html = addHeadingIds(bodyHtml);
  html = wrapMathEquations(html);
  return html;
}

function renderIntegratedArticleMain({ heroHtml = "", bodyHtml, faqHtml = "", extraSectionsHtml = "" }) {
  const processedBody = buildEditorialArticleBodyHtml(bodyHtml);
  const sidebar = renderBlogSidebarHtml();
  const hero = heroHtml ? normalizeHeroHtml(heroHtml) : "";
  const faq = faqHtml ? stripCardSections(faqHtml) : "";
  const extra = extraSectionsHtml ? stripCardSections(extraSectionsHtml) : "";

  return `<main class="cn-main-layout cn-calc-page-frame">
      <div class="cn-calc-page-body cn-calc-dashboard__body">
        ${sidebar}
        <div class="cn-calc-page-main cn-calc-workspace cn-blog-workspace cn-blog-article-workspace">
          <a href="/blog/" class="cn-blog-back-link">← Back to Blog</a>
          ${hero}
          <article class="cn-blog-article-body article-body">
              ${processedBody}
            </article>
          ${faq}
          ${extra}
        </div>
      </div>
    </main>`;
}

function extractHeroHtml(html) {
  const match = html.match(
    /<(?:section|header)[^>]*(?:cn-blog-editorial__hero|cn-article-page-title|cn-blog-article-header)[^>]*>[\s\S]*?<\/(?:section|header)>/i
  );
  return match ? match[0] : "";
}

function extractArticleInnerHtml(html) {
  const match = html.match(/<article class="[^"]*\b(?:cn-blog-article-body|article-body)[^"]*">([\s\S]*?)<\/article>/i);
  return match ? match[1].trim() : "";
}

function extractTailSections(html) {
  const mainMatch = html.match(/<main[\s\S]*?<\/main>/i);
  if (!mainMatch) return { faqHtml: "", extraSectionsHtml: "" };

  let tail = mainMatch[0];
  tail = tail.replace(/<aside class="cn-blog-toc"[\s\S]*?<\/aside>/gi, "");
  const afterArticle = tail.match(/<\/article>([\s\S]*?)<\/main>/i);
  if (!afterArticle) return { faqHtml: "", extraSectionsHtml: "" };

  let sections = afterArticle[1];
  sections = sections.replace(/<\/div>\s*<\/div>\s*<\/div>/gi, "");
  sections = sections.replace(/<div class="cn-blog-editorial__shell">[\s\S]*$/i, "");
  sections = sections.trim();

  const faqMatch = sections.match(/<section[^>]*(?:faq-list|cn-blog-faq|cn-blog-article-faq)[^>]*>[\s\S]*?<\/section>/i);
  const faqHtml = faqMatch ? faqMatch[0] : "";
  const extraSectionsHtml = faqHtml ? sections.replace(faqHtml, "").trim() : sections;

  return { faqHtml, extraSectionsHtml };
}

function transformArticlePage(html) {
  if (html.includes("cn-blog-article-workspace")) {
    return { html, changed: false };
  }
  if (!html.includes("article-body") && !html.includes("cn-blog-article-body")) {
    return { html, changed: false };
  }

  let next = html;
  next = ensureHeadAssets(next);
  next = ensureBodyClass(next);
  next = ensureProgressBar(next);

  const heroHtml = extractHeroHtml(next);
  const articleInner = extractArticleInnerHtml(next);
  if (!articleInner) return { html: next, changed: false };

  const { faqHtml, extraSectionsHtml } = extractTailSections(next);
  const newMain = renderIntegratedArticleMain({
    heroHtml,
    bodyHtml: articleInner,
    faqHtml,
    extraSectionsHtml,
  });

  next = next.replace(/<main[\s\S]*?<\/main>/i, newMain);
  return { html: next, changed: true };
}

function buildEditorialArticleShell({ heroHtml, bodyHtml, faqHtml = "", extraSectionsHtml = "" }) {
  return `${PROGRESS_BAR_HTML}
    ${renderIntegratedArticleMain({ heroHtml, bodyHtml, faqHtml, extraSectionsHtml })}`;
}

function renderEditorialArticleMain({ heroHtml = "", bodyHtml, faqHtml = "", extraSectionsHtml = "" }) {
  return renderIntegratedArticleMain({ heroHtml, bodyHtml, faqHtml, extraSectionsHtml });
}

module.exports = {
  slugifyHeading,
  extractHeadingsFromArticleHtml,
  addHeadingIds,
  wrapMathEquations,
  buildTocHtml,
  transformArticlePage,
  buildEditorialArticleShell,
  buildEditorialArticleBodyHtml,
  renderEditorialArticleMain,
  renderIntegratedArticleMain,
  renderBlogSidebarHtml,
  normalizeHeroHtml,
  FRAUNCES_LINK,
  BLOG_ARTICLE_SCRIPT,
  PROGRESS_BAR_HTML,
};
