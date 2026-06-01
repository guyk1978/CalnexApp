import fs from "fs";
import path from "path";

/** Main landmark HTML from the static marketing homepage (repo root index.html). */
export function readHomeMainHtml(): string {
  const file = path.join(process.cwd(), "index.html");
  if (!fs.existsSync(file)) {
    return `<main class="cn-main-layout pt-10 sm:pt-14 px-4 sm:px-6 max-w-7xl mx-auto"><p class="muted">Homepage content is unavailable in this build.</p></main>`;
  }
  const html = fs.readFileSync(file, "utf8");
  const match = html.match(/<main\b[^>]*>[\s\S]*?<\/main>/i);
  return match?.[0] ?? `<main class="cn-main-layout pt-10 sm:pt-14 px-4 sm:px-6 max-w-7xl mx-auto"><p class="muted">Homepage content is unavailable.</p></main>`;
}
