/**
 * @deprecated GA is loaded only after cookie consent. Use patch-cookie-consent.mjs.
 */
const { execSync } = require("child_process");
const path = require("path");

execSync("node scripts/patch-cookie-consent.mjs", {
  cwd: path.resolve(__dirname, ".."),
  stdio: "inherit",
});
