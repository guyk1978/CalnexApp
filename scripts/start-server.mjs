/**
 * Serve production build from out/ (run `npm run build` first).
 */
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const PORT = Number(process.env.PORT || 3000);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "out");
const MARKER = path.join(OUT, "tools", "rent-vs-buy", "index.html");

if (!fs.existsSync(MARKER)) {
  console.error("\nMissing out/ build. Run first:\n  npm run build\n");
  process.exit(1);
}

execSync(`node scripts/kill-port.mjs ${PORT}`, { cwd: ROOT, stdio: "inherit" });

console.log(`\nProduction preview → http://localhost:${PORT}/tools/rent-vs-buy/\n`);

const child = spawn("npx", ["serve", "out", "-l", String(PORT)], {
  cwd: ROOT,
  stdio: "inherit",
  shell: true,
});

child.on("exit", (code) => process.exit(code ?? 0));
