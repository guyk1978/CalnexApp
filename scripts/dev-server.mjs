/**
 * Local dev = static site from repo root (same as Cloudflare). Not `next dev`.
 */
import { spawn } from "child_process";
import net from "net";
import path from "path";
import { fileURLToPath } from "url";

const PORT = Number(process.env.PORT || 3000);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function portAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => server.close(() => resolve(true)));
    server.listen(port, "127.0.0.1");
  });
}

if (!(await portAvailable(PORT))) {
  console.error(
    `\nPort ${PORT} is already in use (often an old "next dev" or "serve").\n` +
      `Stop it, then run npm run dev again.\n` +
      `  Windows: netstat -ano | findstr :${PORT}   then   taskkill /PID <pid> /F\n`
  );
  process.exit(1);
}

console.log(
  `\nCalnexApp static dev → http://localhost:${PORT}/tools/rent-vs-buy/\n` +
    `Take-home pay (after build) → http://localhost:${PORT}/tools/take-home-pay/\n` +
    `Live React edits → npm run dev:next → http://localhost:3001/tools/take-home-pay/\n`
);

const child = spawn("npx", ["serve", ".", "-l", String(PORT)], {
  cwd: ROOT,
  stdio: "inherit",
  shell: true,
});

child.on("exit", (code) => process.exit(code ?? 0));
