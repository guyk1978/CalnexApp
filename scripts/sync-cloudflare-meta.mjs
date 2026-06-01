/**
 * Copy Cloudflare Pages metadata into out/ so production deploy (publish: out/)
 * receives _headers, _redirects, and _routes.json.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "out");

const COPIES = [
  { from: path.join(ROOT, "_headers"), to: path.join(OUT, "_headers") },
  { from: path.join(ROOT, "_redirects"), to: path.join(OUT, "_redirects") },
  { from: path.join(ROOT, "public", "_routes.json"), to: path.join(OUT, "_routes.json") },
];

if (!fs.existsSync(OUT)) {
  console.error("sync-cloudflare-meta: missing out/ — run npm run build first");
  process.exit(1);
}

for (const { from, to } of COPIES) {
  if (!fs.existsSync(from)) {
    console.error(`sync-cloudflare-meta: missing ${path.relative(ROOT, from)}`);
    process.exit(1);
  }
  fs.copyFileSync(from, to);
  console.log(`sync-cloudflare-meta: ${path.relative(ROOT, to)}`);
}

const nextBundle = path.join(OUT, "assets", "next", "static", "chunks");
if (!fs.existsSync(nextBundle)) {
  console.error("sync-cloudflare-meta: missing out/assets/next/static/chunks — run sync-next-to-assets");
  process.exit(1);
}

const sample = fs.readdirSync(nextBundle).find((n) => n.startsWith("webpack-") && n.endsWith(".js"));
if (!sample) {
  console.warn("sync-cloudflare-meta: warning — no webpack-*.js under assets/next/static/chunks");
} else {
  console.log(`sync-cloudflare-meta: verified ${sample}`);
}
