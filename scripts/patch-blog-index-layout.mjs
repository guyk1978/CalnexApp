/**
 * Restructure blog/index.html — sidebar + editorial feed layout.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BLOG_INDEX = path.join(ROOT, "blog", "index.html");

const SEARCH_ICON = `<svg class="cn-blog-search__icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>`;

function extractBlock(html, start, end) {
  const s = html.indexOf(start);
  const e = html.indexOf(end);
  if (s === -1 || e === -1) return "";
  return html.slice(s, e + end.length);
}

function buildMainShell(featuredBlock, allBlock, latestBlock) {
  return `    <main class="cn-main-layout cn-calc-page-frame">
      <div class="cn-calc-page-body cn-calc-dashboard__body">
        <aside class="cn-blog-sidebar cn-calc-global-sidebar" aria-label="Blog navigation">
          <div class="cn-blog-sidebar__stack">
            <div class="cn-blog-sidebar__block">
              <p class="cn-blog-sidebar__label">Search</p>
              <label class="cn-blog-search" for="blogSearchInput">
                ${SEARCH_ICON}
                <input id="blogSearchInput" type="search" placeholder="Search guides..." aria-label="Search blog articles" />
              </label>
            </div>
            <nav class="cn-blog-sidebar__block" aria-label="Categories">
              <p class="cn-blog-sidebar__label">Categories</p>
              <ul id="blogCategoryFilters" class="cn-blog-categories" aria-label="Blog categories"></ul>
            </nav>
          </div>
        </aside>

        <div class="cn-calc-page-main cn-calc-workspace cn-blog-workspace">
          <header class="cn-blog-hero page-title">
            <p class="eyebrow">Blog</p>
            <h1>CalnexApp Content Hub</h1>
            <p>In-depth loan strategy guides, calculators, and decision frameworks for smarter borrowing.</p>
          </header>

          <section class="cn-blog-hubs">
            <h2 class="cn-blog-section__title">Mortgage &amp; borrowing topic hubs</h2>
            <p class="cn-blog-hubs__lede muted">Curated cluster maps—not isolated posts. Each hub links pillars, comparisons, and tools with consistent disclosure vocabulary.</p>
            <ul class="cn-blog-hubs__list">
              <li><a href="/blog/mortgage-strategy-hub/">Mortgage strategy hub</a> — fixed vs ARM, refi break-even, DTI, PMI, prepay.</li>
              <li><a href="/blog/home-equity-hub/">Home equity hub</a> — HELOC, home equity loan, cash-out, recast vs refi.</li>
              <li><a href="/blog/mortgage-costs-hub/">Mortgage cost hub</a> — APR, points, PMI, closing costs, break-even framing.</li>
              <li><a href="/authors/daniel-morris/">Daniel Morris</a> — mortgage cluster author profile and reviewed articles.</li>
            </ul>
          </section>

          <section class="cn-blog-section">
            <h2 class="cn-blog-section__title">Featured Articles</h2>
${featuredBlock}
          </section>

          <section class="cn-blog-section">
            <h2 class="cn-blog-section__title">All Articles</h2>
${allBlock}
          </section>

${latestBlock}
          </div>

          <section id="cnBlogCategoryView" class="cn-blog-category-view" hidden>
            <header class="cn-blog-category-header">
              <p class="cn-blog-category-header__eyebrow">Category</p>
              <h1 id="blogCategoryTitle" class="cn-blog-category-header__title"></h1>
              <p id="blogCategoryDescription" class="cn-blog-category-header__desc"></p>
            </header>
            <div id="blogCategoryList" class="cn-blog-feed" aria-live="polite"></div>
          </section>
        </div>
      </div>
    </main>`;
}

let html = fs.readFileSync(BLOG_INDEX, "utf8");

html = html.replace(
  /<body([^>]*)class="([^"]*)"/,
  (_, attrs, classes) => {
    const next = new Set(classes.split(/\s+/).filter(Boolean));
    next.add("cn-blog-index-page");
    next.add("cn-calculator-page");
    return `<body${attrs}class="${[...next].join(" ")}"`;
  }
);

const featuredBlock = extractBlock(html, "<!-- BLOG_INDEX_FEATURED_START -->", "<!-- BLOG_INDEX_FEATURED_END -->");
const allBlock = extractBlock(html, "<!-- BLOG_INDEX_ALL_START -->", "<!-- BLOG_INDEX_ALL_END -->");
const latestBlock = extractBlock(html, "<!-- ILB_BLOG_LATEST_START -->", "<!-- ILB_BLOG_LATEST_END -->");

const mainShell = buildMainShell(
  featuredBlock || `        <!-- BLOG_INDEX_FEATURED_START -->
        <div id="featuredBlogList" class="cn-blog-feed" aria-live="polite"></div>
<!-- BLOG_INDEX_FEATURED_END -->`,
  allBlock || `        <!-- BLOG_INDEX_ALL_START -->
        <div id="blogList" class="cn-blog-feed" aria-live="polite"></div>
<!-- BLOG_INDEX_ALL_END -->`,
  latestBlock ? `          ${latestBlock}` : ""
);

html = html.replace(/<main[\s\S]*?<\/main>/, mainShell);

fs.writeFileSync(BLOG_INDEX, html, "utf8");
console.log("patch-blog-index-layout: updated", BLOG_INDEX);
