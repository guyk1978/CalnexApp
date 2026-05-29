/**
 * One-off / maintenance: reset blog index featured & all grids to empty marker shells.
 * Run: node scripts/reset-blog-index-grids.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const file = path.join(ROOT, "blog", "index.html");

let html = fs.readFileSync(file, "utf8");

function resetSection(title, kind) {
  const start = `<!-- BLOG_INDEX_${kind}_START -->`;
  const end = `<!-- BLOG_INDEX_${kind}_END -->`;
  const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(
    `<section>\\s*<h2>${escaped}</h2>[\\s\\S]*?</section>`,
    "i"
  );
  const replacement = `<section>
        <h2>${title}</h2>
        ${start}
        ${end}
      </section>`;
  const next = html.replace(re, replacement);
  if (next === html) {
    throw new Error(`reset-blog-index-grids: no match for "${title}"`);
  }
  html = next;
}

resetSection("Featured Articles", "FEATURED");
resetSection("All Articles", "ALL");
fs.writeFileSync(file, html, "utf8");
console.log("reset-blog-index-grids: marker shells written");
