/**
 * Copy Next.js export routes into the static tools/ tree so `npm run dev`
 * (serve repo root) can load app-router calculators. Also mirrors _next/ assets.
 *
 * Run after `next build` (see package.json postbuild).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "out");

/** out/<from> → <to> under repo root */
const ROUTE_COPIES = [{ from: "tools/take-home-pay", to: "tools/take-home-pay" }];

function copyDir(src, dest) {
  if (!fs.existsSync(src)) {
    console.warn(`sync-next-app-routes: missing ${src}`);
    return false;
  }
  fs.rmSync(dest, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.cpSync(src, dest, { recursive: true });
  return true;
}

if (!fs.existsSync(OUT)) {
  console.error("sync-next-app-routes: missing out/ — run `npm run build` first");
  process.exit(1);
}

let copied = 0;
for (const { from, to } of ROUTE_COPIES) {
  const src = path.join(OUT, from);
  const dest = path.join(ROOT, to);
  if (copyDir(src, dest)) {
    copied += 1;
    console.log(`sync-next-app-routes: ${to}/`);
  }
}

const nextSrc = path.join(OUT, "_next");
const nextDest = path.join(ROOT, "_next");
if (fs.existsSync(nextSrc)) {
  copyDir(nextSrc, nextDest);
  console.log("sync-next-app-routes: _next/ (for static dev server)");
} else {
  console.warn("sync-next-app-routes: missing out/_next");
}

const nextAssetsSrc = path.join(OUT, "assets", "next");
const nextAssetsDest = path.join(ROOT, "assets", "next");
if (fs.existsSync(nextAssetsSrc)) {
  copyDir(nextAssetsSrc, nextAssetsDest);
  console.log("sync-next-app-routes: assets/next/ (production Next bundles)");
} else {
  console.warn("sync-next-app-routes: missing out/assets/next");
}

if (copied === 0) {
  console.warn("sync-next-app-routes: no app routes copied");
  process.exit(1);
}

const thpHtml = path.join(ROOT, "tools/take-home-pay/index.html");
if (fs.existsSync(thpHtml)) {
  let html = fs.readFileSync(thpHtml, "utf8");
  html = html.replace(
    /<div class="cn-pdf-export-wrap"[\s\S]*?<!-- CN_PDF_EXPORT_END -->[\s\S]*?<\/div>\s*(?=<\/main>)/i,
    ""
  );
  html = html.replace(
    /<div class="cn-calculator-share-wrap"[\s\S]*?<!-- CN_CALCULATOR_SHARE_END -->[\s\S]*?<\/div>\s*(?=<\/main>)/i,
    ""
  );
  if (!html.includes('data-page="take-home-pay-calculator"')) {
    html = html.replace(/<body([^>]*)>/i, '<body$1 data-page="take-home-pay-calculator">');
  } else if (!/<body[^>]*data-page=/i.test(html)) {
    html = html.replace(
      /<body([^>]*)>/i,
      '<body$1 data-page="take-home-pay-calculator">'
    );
  }
  if (!html.includes("cn-main-layout")) {
    html = html.replace(
      /<main class="container section-space"/i,
      '<main class="cn-main-layout pt-10 sm:pt-14 px-4 sm:px-6 max-w-7xl mx-auto"'
    );
  }
  if (!html.includes("cn-header-actions")) {
    html = html.replace(
      /<!-- CN_NAV_MENU_END -->/,
      "<!-- CN_NAV_MENU_END -->\n        <div class=\"cn-header-actions\"></div>"
    );
  }

  fs.writeFileSync(thpHtml, html, "utf8");
  console.log("sync-next-app-routes: cleaned tools/take-home-pay/index.html");
}

// Nav/tools-hub sync runs in postbuild after relativize-export (see package.json).
