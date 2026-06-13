/**
 * Add cn-site-footer class to all static pages with a site footer.
 * Run: node scripts/sync-site-footer.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SKIP_DIRS = new Set(["node_modules", ".git", "assets", "data", "drafts", ".next", "dist", "coverage", "public", "out"]);

function walkHtml(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.isDirectory()) {
      if (SKIP_DIRS.has(ent.name)) continue;
      walkHtml(path.join(dir, ent.name), out);
    } else if (ent.name === "index.html") {
      out.push(path.join(dir, ent.name));
    }
  }
  return out;
}

let updated = 0;
for (const file of walkHtml(ROOT)) {
  let html = fs.readFileSync(file, "utf8");
  let changed = false;

  if (html.includes('class="site-footer"') && !html.includes("cn-site-footer")) {
    html = html.replace(/class="site-footer"/g, 'class="site-footer cn-site-footer"');
    changed = true;
  }

  if (html.includes("site-footer") && !html.includes("cn-site-chrome")) {
    html = html.replace(/<body([^>]*)>/i, (match, attrs) => {
      if (/cn-site-chrome/.test(attrs)) return match;
      if (/class=/.test(attrs)) {
        return `<body${attrs.replace(/class=(["'])([^"']*)\1/, 'class=$1$2 cn-site-chrome$1')}>`;
      }
      return `<body${attrs} class="cn-site-chrome">`;
    });
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(file, html, "utf8");
    updated += 1;
  }
}

console.log(`sync-site-footer: updated ${updated} pages`);
