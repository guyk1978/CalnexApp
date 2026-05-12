/**
 * SEO drafts persist API — single file, strict schema { version, items }.
 *
 * POST /save — CAS on version; full atomic replace (no merge).
 * GET /drafts/pending-seo-pages.json — same file as writes, no-store headers.
 */
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const TARGET = path.join(ROOT, "drafts", "pending-seo-pages.json");
const LOCK_PATH = TARGET + ".lock";
const PORT = Number(process.env.SEO_DRAFT_PORT) || 38421;
const LOCK_TIMEOUT_MS = 3000;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

let writeChain = Promise.resolve();

function enqueueWrite(fn) {
  const p = writeChain.then(fn, fn);
  writeChain = p.catch(() => {});
  return p;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function atomicWrite(filePath, data) {
  const tmp = filePath + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), "utf-8");
  fs.renameSync(tmp, filePath);
}

async function acquireFileLock(timeoutMs = LOCK_TIMEOUT_MS) {
  const start = Date.now();
  let fd;
  while (Date.now() - start < timeoutMs) {
    try {
      fd = fs.openSync(LOCK_PATH, "wx");
      return function release() {
        try {
          fs.closeSync(fd);
        } catch (_) {}
        try {
          fs.unlinkSync(LOCK_PATH);
        } catch (_) {}
      };
    } catch (_) {
      await sleep(20);
    }
  }
  throw new Error("DRAFT file lock timeout");
}

function noStoreHeaders(extra) {
  return {
    "Cache-Control": "no-store, no-cache, must-revalidate",
    Pragma: "no-cache",
    Expires: "0",
    ...extra
  };
}

function isDraftJsonPath(urlPath) {
  return urlPath === "/drafts/pending-seo-pages.json";
}

function formatSlugStatusLog(items) {
  if (!Array.isArray(items)) return "(no items)";
  return items
    .map(function (i) {
      return String(i.slug || "?") + ":" + String(i.status || "?");
    })
    .join(" ");
}

/**
 * Read disk file and return ONLY { version, items } (legacy roots ignored for CAS).
 */
function readCurrentDocumentSync() {
  if (!fs.existsSync(TARGET)) {
    return { version: 1, items: [] };
  }
  const raw = fs.readFileSync(TARGET, "utf8");
  const doc = JSON.parse(raw);
  const items = Array.isArray(doc.items) ? doc.items : [];
  let v = doc.version;
  if (typeof v === "string" && v.trim() !== "" && !isNaN(Number(v))) {
    v = Number(v);
  }
  if (typeof v !== "number" || !Number.isFinite(v)) {
    v = 1;
  }
  return { version: v, items };
}

async function handlePostSave(body) {
  let incoming;
  try {
    incoming = JSON.parse(body);
  } catch (e) {
    const err = e && e.message ? e.message : String(e);
    console.warn("[SEO-SAVE] parse failed:", err);
    throw Object.assign(new Error("Invalid JSON"), { status: 400, expose: err });
  }

  if (typeof incoming.version !== "number" || !Number.isFinite(incoming.version)) {
    throw Object.assign(new Error("version (number) required"), { status: 400, expose: "version (number) required" });
  }
  if (!Array.isArray(incoming.items)) {
    throw Object.assign(new Error("items (array) required"), { status: 400, expose: "items (array) required" });
  }

  let outVersion;

  await enqueueWrite(async () => {
    const release = await acquireFileLock(LOCK_TIMEOUT_MS);
    try {
      fs.mkdirSync(path.dirname(TARGET), { recursive: true });
      const current = readCurrentDocumentSync();

      if (incoming.version !== current.version) {
        const conflict = new Error("version_conflict");
        conflict.status = 409;
        conflict.payload = {
          ok: false,
          error: "version_conflict",
          version: current.version
        };
        throw conflict;
      }

      const outDoc = { version: current.version + 1, items: incoming.items };
      outVersion = outDoc.version;
      const normalized = JSON.stringify(outDoc, null, 2);
      const byteSize = Buffer.byteLength(normalized, "utf8");
      atomicWrite(TARGET, outDoc);
      console.log("[SEO-SAVE]", formatSlugStatusLog(incoming.items), "version", outVersion, "bytes", byteSize);
    } finally {
      release();
    }
  });

  return { ok: true, version: outVersion };
}

function handleGetDrafts(res) {
  if (!fs.existsSync(TARGET)) {
    res.writeHead(404, { "Content-Type": "application/json", ...noStoreHeaders(cors) });
    res.end(JSON.stringify({ ok: false, error: "Draft file not found on disk" }));
    return;
  }
  const current = readCurrentDocumentSync();
  const body = JSON.stringify(current, null, 2);
  res.writeHead(200, {
    "Content-Type": "application/json; charset=utf-8",
    ...noStoreHeaders(cors)
  });
  res.end(body);
}

const server = http.createServer((req, res) => {
  const urlPath = req.url.split("?")[0];

  if (req.method === "OPTIONS" && (urlPath === "/save" || isDraftJsonPath(urlPath))) {
    res.writeHead(204, cors);
    res.end();
    return;
  }

  if (req.method === "GET" && isDraftJsonPath(urlPath)) {
    try {
      handleGetDrafts(res);
    } catch (e) {
      console.error("[SEO-FETCH] read error", e);
      res.writeHead(500, { "Content-Type": "application/json", ...cors });
      res.end(JSON.stringify({ ok: false, error: String(e && e.message ? e.message : e) }));
    }
    return;
  }

  if (req.method === "POST" && urlPath === "/save") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      handlePostSave(body)
        .then((payload) => {
          res.writeHead(200, { "Content-Type": "application/json", ...cors });
          res.end(JSON.stringify(payload));
        })
        .catch((e) => {
          if (e.payload && e.status) {
            res.writeHead(e.status, { "Content-Type": "application/json", ...cors });
            res.end(JSON.stringify(e.payload));
            return;
          }
          const status = e.status || 500;
          const msg = e.expose || (e && e.message) || String(e);
          if (status >= 500) console.error("[SEO-SAVE] failed", e);
          res.writeHead(status, { "Content-Type": "application/json", ...cors });
          res.end(JSON.stringify({ ok: false, error: msg }));
        });
    });
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json", ...cors });
  res.end(JSON.stringify({ ok: false, error: "Not found" }));
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `[seo-draft-server] Port ${PORT} is already in use. Another instance may be running; use that process or set SEO_DRAFT_PORT.`
    );
  } else {
    console.error("[seo-draft-server]", err);
  }
  process.exit(1);
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`[seo-draft-server] POST /save → ${TARGET} (schema: version + items only)`);
  console.log(`[seo-draft-server] GET /drafts/pending-seo-pages.json (same file)`);
});
