/**
 * Embed shadow-styles.ts into cookie-consent.js (static pages global banner).
 * Run automatically in prebuild / sync:site.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const STYLES_SRC = path.join(ROOT, "src", "lib", "consent", "shadow-styles.ts");
const JS_DEST = path.join(ROOT, "assets", "js", "cookie-consent.js");

const ts = fs.readFileSync(STYLES_SRC, "utf8");
const match = ts.match(/export const COOKIE_BANNER_SHADOW_CSS = `([\s\S]*?)`;/);
if (!match) {
  console.error("write-cookie-consent-shadow: could not parse shadow-styles.ts");
  process.exit(1);
}

const shadowCss = match[1];
const marker = "  var SHADOW_CSS = ";
const js = fs.readFileSync(JS_DEST, "utf8");

if (!js.includes(marker)) {
  console.error("write-cookie-consent-shadow: SHADOW_CSS marker missing in cookie-consent.js");
  process.exit(1);
}

const escaped = JSON.stringify(shadowCss);
const next = js.replace(
  /  var SHADOW_CSS = [\s\S]*?;\n/,
  `  var SHADOW_CSS = ${escaped};\n`
);

if (next === js) {
  console.log("write-cookie-consent-shadow: already up to date");
} else {
  fs.writeFileSync(JS_DEST, next, "utf8");
  console.log("write-cookie-consent-shadow: synced SHADOW_CSS into assets/js/cookie-consent.js");
}
