const test = require("node:test");
const assert = require("node:assert/strict");
const {
  collapseUrlSlashes,
  relativizeHtml,
} = require("../scripts/lib/site-root.mjs");

test("collapseUrlSlashes removes duplicate slashes in relative paths", () => {
  assert.equal(collapseUrlSlashes("../../assets//js/foo.js"), "../../assets/js/foo.js");
  assert.equal(collapseUrlSlashes("../../tools//mortgage/"), "../../tools/mortgage/");
  assert.equal(collapseUrlSlashes("https://calnexapp.com//tools/"), "https://calnexapp.com//tools/");
});

test("relativizeHtml rewrites script and link tags without double slashes", () => {
  const html = `<!DOCTYPE html><html><head>
<link rel="stylesheet" href="/assets/css/style.css"/>
<script src="/assets/js/theme-init.js"></script>
<script>(self.__next_s=self.__next_s||[]).push(["/assets/js/calnex-path.js",{}])</script>
</head><body></body></html>`;
  const out = relativizeHtml(html, "../../");
  assert.match(out, /href="\.\.\/\.\.\/assets\/css\/style\.css"/);
  assert.match(out, /src="\.\.\/\.\.\/assets\/js\/theme-init\.js"/);
  assert.doesNotMatch(out, /assets\/\/js/);
  assert.doesNotMatch(out, /src="\/assets/);
  assert.match(
    out,
    /push\(\["\.\.\/\.\.\/assets\/js\/calnex-path\.js"/
  );
});
