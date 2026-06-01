/**
 * Free a TCP port on Windows (LISTENING processes only).
 * Usage: node scripts/kill-port.mjs [port]
 */
import { execSync } from "child_process";

const port = process.argv[2] || "3000";
const isWin = process.platform === "win32";

function findListeningPids() {
  if (!isWin) {
    try {
      const out = execSync(`lsof -ti tcp:${port}`, { encoding: "utf8" }).trim();
      return out ? out.split(/\s+/).filter(Boolean) : [];
    } catch {
      return [];
    }
  }
  try {
    const out = execSync(`netstat -ano | findstr :${port}`, { encoding: "utf8" });
    const pids = new Set();
    for (const line of out.split(/\r?\n/)) {
      if (!line.includes("LISTENING")) continue;
      const parts = line.trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      if (pid && pid !== "0") pids.add(pid);
    }
    return [...pids];
  } catch {
    return [];
  }
}

const pids = findListeningPids();
if (pids.length === 0) {
  console.log(`kill-port: port ${port} is already free.`);
  process.exit(0);
}

for (const pid of pids) {
  let name = "unknown";
  try {
    if (isWin) {
      name = execSync(`tasklist /FI "PID eq ${pid}" /NH`, { encoding: "utf8" }).trim();
    }
  } catch {
    /* ignore */
  }
  console.log(`kill-port: stopping ${name || pid} (PID ${pid}) on port ${port}…`);
  try {
    if (isWin) execSync(`taskkill /PID ${pid} /F`, { stdio: "inherit" });
    else execSync(`kill -9 ${pid}`, { stdio: "inherit" });
  } catch (err) {
    console.error(`kill-port: could not stop PID ${pid}. Try running the terminal as Administrator.`);
    process.exit(1);
  }
}

console.log(`kill-port: port ${port} is free.`);
