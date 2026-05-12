/**
 * Local helper: POST JSON body to save drafts/pending-seo-pages.json
 * (Browsers cannot write to the repo filesystem without a server.)
 *
 * Usage: npm run seo-draft-server
 * Dashboard posts to http://127.0.0.1:38421/save
 */
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const TARGET = path.join(ROOT, "drafts", "pending-seo-pages.json");
const PORT = Number(process.env.SEO_DRAFT_PORT) || 38421;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

const server = http.createServer((req, res) => {
  if (req.method === "OPTIONS" && req.url === "/save") {
    res.writeHead(204, cors);
    res.end();
    return;
  }

  if (req.method === "POST" && req.url === "/save") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      try {
        JSON.parse(body);
        fs.mkdirSync(path.dirname(TARGET), { recursive: true });
        fs.writeFileSync(TARGET, body, "utf8");
        res.writeHead(200, { "Content-Type": "application/json", ...cors });
        res.end(JSON.stringify({ ok: true, path: path.relative(ROOT, TARGET) }));
      } catch (e) {
        res.writeHead(400, { "Content-Type": "application/json", ...cors });
        res.end(JSON.stringify({ ok: false, error: String(e && e.message ? e.message : e) }));
      }
    });
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ ok: false, error: "Not found" }));
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`[seo-draft-server] POST http://127.0.0.1:${PORT}/save → writes ${TARGET}`);
});
