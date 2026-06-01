/**
 * Restore calculator DOM removed in 97b3ffd2 (interest + retirement).
 * Source: parent commit 97b3ffd2^ — extract from calculator-layout through charts.
 */
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE_COMMIT = "97b3ffd2^";

const TOOLS = [
  {
    slug: "interest-calculator",
    stopBefore: /<section class="card">\s*\n\s*<h2>Cross-Tool Navigation<\/h2>/i,
  },
  {
    slug: "retirement-calculator",
    stopBefore: /<section class="card">\s*\n\s*<h2>Connected Planning Tools<\/h2>/i,
  },
];

const BODY_START = "<!-- CN_CALCULATOR_BODY_START -->";
const BODY_END = "<!-- CN_CALCULATOR_BODY_END -->";
const HERO_END = "<!-- CN_CALCULATOR_HERO_STACK_END -->";

function gitShow(relPath) {
  const spec = `${SOURCE_COMMIT}:${relPath.replace(/\\/g, "/")}`;
  return execSync(`git show "${spec}"`, {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
    shell: true,
  });
}

function extractBody(oldHtml, stopBefore) {
  const layoutStart = oldHtml.indexOf('<section class="calculator-layout">');
  if (layoutStart === -1) {
    throw new Error("calculator-layout not found in source HTML");
  }
  const tail = oldHtml.slice(layoutStart);
  const stop = stopBefore.exec(tail);
  const end = stop ? stop.index : tail.indexOf('<section class="card" data-related-tools');
  if (end === -1) {
    throw new Error("could not find end of calculator body");
  }
  return tail.slice(0, end).trim();
}

function collapseBlankRuns(html) {
  return html.replace(/\n(\s*\n){4,}/g, "\n\n");
}

function restoreTool({ slug, stopBefore }) {
  const rel = `tools/${slug}/index.html`;
  const filePath = path.join(ROOT, rel);
  const oldHtml = gitShow(rel);
  const bodyInner = extractBody(oldHtml, stopBefore);
  const bodyBlock = `${BODY_START}\n${bodyInner}\n${BODY_END}`;

  let html = fs.readFileSync(filePath, "utf8");
  const heroEndIdx = html.indexOf(HERO_END);
  if (heroEndIdx === -1) {
    throw new Error(`${slug}: ${HERO_END} not found`);
  }
  const afterHero = heroEndIdx + HERO_END.length;

  const relatedStart = html.indexOf(
    `<section class="card" data-related-tools data-current-tool="${slug}"`,
    afterHero
  );
  if (relatedStart === -1) {
    throw new Error(`${slug}: data-related-tools section not found after hero`);
  }
  const relatedEnd = html.indexOf("</section>", relatedStart) + "</section>".length;

  const chromeBlock = html.slice(afterHero, relatedStart).trim();
  const relatedSection = html.slice(relatedStart, relatedEnd);
  let tail = html.slice(relatedEnd);
  tail = tail.replace(
    /<!-- SEO_ENGINE_RELATED_START -->[\s\S]*?<!-- SEO_ENGINE_RELATED_END -->\s*/g,
    ""
  );

  html =
    html.slice(0, afterHero) +
    `\n${bodyBlock}\n${chromeBlock}\n${relatedSection}` +
    tail;
  html = collapseBlankRuns(html);

  if (slug === "interest-calculator" && !html.includes("interestPrincipal")) {
    throw new Error("interestPrincipal missing after restore");
  }
  if (slug === "retirement-calculator" && !html.includes("retirementCurrentAge")) {
    throw new Error("retirementCurrentAge missing after restore");
  }

  fs.writeFileSync(filePath, html, "utf8");
  console.log(`restore-calculator-bodies: restored ${slug}`);
}

for (const tool of TOOLS) {
  restoreTool(tool);
}

console.log("restore-calculator-bodies: done");
