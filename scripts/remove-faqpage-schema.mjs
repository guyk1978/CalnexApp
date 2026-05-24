/**
 * Strip deprecated FAQPage JSON-LD from static HTML (keeps Article/BreadcrumbList @graph).
 * Run: node scripts/remove-faqpage-schema.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const MARKER_BLOCKS = [
  /<!--\s*RANK_BLOG_FAQ_SCHEMA_START\s*-->[\s\S]*?<!--\s*RANK_BLOG_FAQ_SCHEMA_END\s*-->/gi
];

function stripFaqFromLdJson(content) {
  let data;
  try {
    data = JSON.parse(content.trim());
  } catch {
    return content;
  }

  if (data["@type"] === "FAQPage") {
    return null;
  }

  if (Array.isArray(data["@graph"])) {
    const next = data["@graph"].filter((node) => node && node["@type"] !== "FAQPage");
    if (next.length === data["@graph"].length) {
      return content;
    }
    data["@graph"] = next;
    return JSON.stringify(data, null, 2);
  }

  return content;
}

/** Fallback when JSON-LD is malformed (e.g. HTML inside a string). */
function removeFaqPageGraphNode(text) {
  if (!text.includes('"@type": "FAQPage"') && !text.includes('"@type":"FAQPage"')) {
    return text;
  }
  return text
    .replace(/,\s*\{\s*"@type"\s*:\s*"FAQPage"[\s\S]*?\n\s*\}(?=\s*\])/g, "\n  }")
    .replace(/\{\s*"@type"\s*:\s*"FAQPage"[\s\S]*?\n\s*\}\s*,/g, "");
}

function processHtml(html) {
  let out = html;
  for (const re of MARKER_BLOCKS) {
    out = out.replace(re, "");
  }

  out = out.replace(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi, (full, inner) => {
    const trimmed = inner.trim();
    const parsed = stripFaqFromLdJson(trimmed);
    if (parsed === null) {
      return "";
    }
    if (parsed !== trimmed) {
      return `<script type="application/ld+json">\n${parsed}\n    </script>`;
    }
    const regexClean = removeFaqPageGraphNode(trimmed);
    if (regexClean !== trimmed) {
      return `<script type="application/ld+json">\n${regexClean}\n    </script>`;
    }
    return full;
  });

  return out;
}

function walkHtmlFiles(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      walkHtmlFiles(full, acc);
      continue;
    }
    if (name.endsWith(".html")) acc.push(full);
  }
  return acc;
}

const targets = [
  path.join(ROOT, "blog"),
  path.join(ROOT, "seo"),
  path.join(ROOT, "tools"),
  path.join(ROOT, "index.html")
].flatMap((t) => (t.endsWith(".html") ? [t] : walkHtmlFiles(t)));

let changed = 0;
for (const file of targets) {
  const before = fs.readFileSync(file, "utf8");
  if (!before.includes("FAQPage")) continue;
  const after = processHtml(before);
  if (after !== before) {
    fs.writeFileSync(file, after, "utf8");
    changed += 1;
    console.log("updated:", path.relative(ROOT, file));
  }
}

console.log(`Done. ${changed} file(s) stripped of FAQPage schema.`);
