/**
 * Preview local static — `npm run preview`
 *
 * Implicit: un singur listener dual-stack (:: + IPv4 mapat) — localhost și 127.0.0.1
 * merg prin același socket (evită desincronizarea 0.0.0.0 vs ::1).
 * Fallback: ascultă pe 0.0.0.0 dacă :: nu e disponibil.
 *
 * Alt port: PORT=9090 npm run preview
 * Bind fix: HOST=127.0.0.1 npm run preview
 * Fără deschidere browser: PREVIEW_OPEN=0 npm run preview
 * Cache: implicit fără cache pentru .html/.js/.mjs/.css/.json — PREVIEW_ALLOW_CACHE=1 pentru a permite cache-ul.
 */
import http from "http";
import fs from "fs";
import path from "path";
import { execFile } from "child_process";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const BASE_PORT = Number(process.env.PORT || 8844);
const BIND_HOST = process.env.HOST;
const DEMO_SYNC_FILE = path.join(root, ".garage-demo-sync.json");
const DEMO_SYNC_TMP_FILE = path.join(root, ".garage-demo-sync.json.tmp");
const DEMO_SYNC_BODY_LIMIT = 1024 * 1024 * 2;

const DEMO_SYNC_KEYS = new Set([
  "garageSolutionsDemoSessionV1",
  "garageSolutionsDemoAccountProfileV1",
  "garageSolutionsDemoDeliveryAddressesV1",
  "garageSolutionsSavedCars",
  "garageSolutionsCarPaintV1",
  "garageSolutionsSuspensionSavedConfigurationV1",
  "garageSolutionsCartV1",
  "garageSolutionsOwnedPartsV1",
  "garageSolutionsSuspensionSetupsV1",
  "garageSolutionsAeroBodySetupsV1",
]);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".stl": "model/stl",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

/** Header-e pentru Simple Browser / Chromium (COI). Fără X-Frame-Options. */
function applyPreviewHeaders(res) {
  res.setHeader("Cross-Origin-Embedder-Policy", "unsafe-none");
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
}

/**
 * Evită cache agresiv pentru pagini și bundle-uri în preview local (OEM+, Vite dist, etc.).
 * Setează PREVIEW_ALLOW_CACHE=1 dacă vrei comportamentul vechi (fără aceste header-e).
 */
function applyNoCacheForEditableAssets(res, ext) {
  if (process.env.PREVIEW_ALLOW_CACHE === "1") return;
  const e = ext.toLowerCase();
  if ([".html", ".js", ".mjs", ".css", ".json"].includes(e)) {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
  }
}

function sendFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  res.setHeader("Content-Type", MIME[ext] || "application/octet-stream");
  applyNoCacheForEditableAssets(res, ext);
  fs.createReadStream(filePath).pipe(res);
}

function defaultDemoSyncStore() {
  return { revision: 0, updatedAt: null, data: {} };
}

function readDemoSyncStore() {
  try {
    const raw = fs.readFileSync(DEMO_SYNC_FILE, "utf8");
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || !parsed.data || typeof parsed.data !== "object") {
      return defaultDemoSyncStore();
    }
    return {
      revision: Number.isFinite(Number(parsed.revision)) ? Number(parsed.revision) : 0,
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : null,
      data: sanitizeDemoSyncData(parsed.data),
    };
  } catch {
    return defaultDemoSyncStore();
  }
}

function writeDemoSyncStore(store) {
  const out = {
    revision: Number.isFinite(Number(store.revision)) ? Number(store.revision) : 0,
    updatedAt: typeof store.updatedAt === "string" ? store.updatedAt : new Date().toISOString(),
    data: sanitizeDemoSyncData(store.data),
  };
  fs.writeFileSync(DEMO_SYNC_TMP_FILE, `${JSON.stringify(out, null, 2)}\n`, "utf8");
  fs.renameSync(DEMO_SYNC_TMP_FILE, DEMO_SYNC_FILE);
  return out;
}

function sanitizeDemoSyncData(data) {
  const out = {};
  if (!data || typeof data !== "object" || Array.isArray(data)) return out;
  for (const [key, value] of Object.entries(data)) {
    if (!DEMO_SYNC_KEYS.has(key)) continue;
    if (typeof value !== "string") continue;
    if (Buffer.byteLength(value, "utf8") > DEMO_SYNC_BODY_LIMIT) continue;
    out[key] = value;
  }
  return out;
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(payload));
}

function readJsonBody(req, res, done) {
  let raw = "";
  req.setEncoding("utf8");
  req.on("data", (chunk) => {
    raw += chunk;
    if (Buffer.byteLength(raw, "utf8") > DEMO_SYNC_BODY_LIMIT) {
      sendJson(res, 413, { ok: false, error: "Payload prea mare." });
      req.destroy();
    }
  });
  req.on("end", () => {
    if (!raw.trim()) {
      done({});
      return;
    }
    try {
      done(JSON.parse(raw));
    } catch {
      sendJson(res, 400, { ok: false, error: "JSON invalid." });
    }
  });
}

function handleDemoSyncRequest(req, res) {
  if (req.method === "GET") {
    sendJson(res, 200, { ok: true, ...readDemoSyncStore() });
    return;
  }
  if (req.method === "PUT" || req.method === "POST") {
    readJsonBody(req, res, (payload) => {
      const current = readDemoSyncStore();
      const incoming = sanitizeDemoSyncData(payload.data || {});
      const replace = payload.mode === "replace";
      const next = writeDemoSyncStore({
        revision: current.revision + 1,
        updatedAt: new Date().toISOString(),
        data: replace ? incoming : { ...current.data, ...incoming },
      });
      sendJson(res, 200, { ok: true, ...next });
    });
    return;
  }
  if (req.method === "OPTIONS") {
    res.writeHead(204, { "Cache-Control": "no-store" });
    res.end();
    return;
  }
  sendJson(res, 405, { ok: false, error: "Metoda neacceptata." });
}

function handleRequest(req, res) {
  applyPreviewHeaders(res);
  const u = new URL(req.url || "/", "http://localhost");
  if (u.pathname === "/__preview_ok") {
    res.setHeader("Cache-Control", "no-store");
    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("ok");
    return;
  }
  if (u.pathname === "/__garage_demo_sync") {
    handleDemoSyncRequest(req, res);
    return;
  }
  let pathname = u.pathname;
  try {
    pathname = decodeURIComponent(pathname);
  } catch {
    /* segment invalid — folosim pathname brut */
  }
  const segments = pathname.split("/").filter(Boolean);
  if (segments.some((s) => s === "..")) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  const tryPath = segments.length ? path.join(root, ...segments) : path.join(root, "index.html");

  fs.stat(tryPath, (err, st) => {
    if (!err && st.isFile()) {
      sendFile(res, tryPath);
      return;
    }
    if (!err && st.isDirectory()) {
      const idx = path.join(tryPath, "index.html");
      fs.stat(idx, (e2, st2) => {
        if (!e2 && st2.isFile()) sendFile(res, idx);
        else {
          res.writeHead(404);
          res.end("Not found");
        }
      });
      return;
    }
    res.writeHead(404);
    res.end("Not found");
  });
}

function openBrowser(url) {
  if (process.env.PREVIEW_OPEN === "0") return;
  const silent = { stdio: "ignore", windowsHide: true };
  try {
    if (process.platform === "darwin") {
      execFile("open", [url], silent, () => {});
    } else if (process.platform === "win32") {
      execFile("cmd", ["/c", "start", "", url], silent, () => {});
    } else {
      execFile("xdg-open", [url], silent, () => {});
    }
  } catch {
    /* headless */
  }
}

/** @type {import('http').Server[]} */
let activeServers = [];

function closeAll(done) {
  const list = activeServers;
  activeServers = [];
  let n = list.length;
  if (n === 0) {
    done();
    return;
  }
  for (const s of list) {
    s.close(() => {
      if (--n === 0) done();
    });
  }
}

/** @param {{ bind?: string }} [extra] */
function printBanner(port, preferredPort, extra) {
  console.log(`Garage Solutions — preview pe port ${port}:`);
  console.log(`  Localhost: http://localhost:${port}/`);
  console.log(`  Alternativă (Simple Browser / IPv4): http://127.0.0.1:${port}/`);
  console.log(`  Verificare rapidă: curl -s http://127.0.0.1:${port}/__preview_ok   → trebuie „ok”`);
  console.log(
    "  Preview: .html / .js / .mjs / .css / .json → Cache-Control: no-store. PREVIEW_ALLOW_CACHE=1 → cache normal.",
  );
  if (extra?.bind) console.log(`  (mod bind: ${extra.bind})`);
  if (process.env.SSH_CONNECTION || process.env.REMOTE_CONTAINERS) {
    console.log(
      "SSH/Dev Container: Forward portul în Cursor (Ports). Simple Browser pe laptop → localhost DOAR după forward.",
    );
  }
  if (process.platform === "darwin") {
    console.log(
      "macOS: Reglaje → Confidențialitate → Rețea locală → permite Cursor (altfel webview poate da -102).",
    );
  }
  console.log(
    "Cursor Simple Browser uneori refuză loopback chiar cu serverul pornit → folosește Safari/Chrome cu URL-ul de mai sus.",
  );
  if (port !== preferredPort) {
    console.log(`(Portul ${preferredPort} era ocupat.)`);
  }
  /* Linie stabilă pentru VS Code serverReadyAction (launch „preview”) */
  console.log(`PREVIEW_READY http://127.0.0.1:${port}/`);
  openBrowser(`http://127.0.0.1:${port}/`);
}

/**
 * HOST setat: un singur bind.
 * Altfel: încearcă :: dual-stack, apoi 0.0.0.0.
 */
function listenWithFallback(port, triesLeft, strategies, strategyIndex) {
  const strat = strategies[strategyIndex];
  if (!strat) {
    console.error("Nu am putut porni serverul de preview pe niciun bind.");
    process.exit(1);
  }

  const srv = http.createServer(handleRequest);

  srv.once("error", (err) => {
    if (err.code === "EADDRINUSE" && triesLeft > 0) {
      srv.close(() => tryListen(port + 1, triesLeft));
      return;
    }
    if (strategyIndex + 1 < strategies.length) {
      srv.close(() => listenWithFallback(port, triesLeft, strategies, strategyIndex + 1));
      return;
    }
    console.error(err.message || err);
    process.exit(1);
  });

  const onListening = () => {
    activeServers = [srv];
    printBanner(port, BASE_PORT, strat.bindLabel ? { bind: strat.bindLabel } : undefined);
  };

  if (strat.type === "dual-stack") {
    srv.listen({ port, host: "::", ipv6Only: false }, onListening);
  } else if (strat.type === "ipv4-any") {
    srv.listen(port, "0.0.0.0", onListening);
  } else if (strat.type === "ipv4-loopback") {
    srv.listen(port, "127.0.0.1", onListening);
  }
}

const DEFAULT_STRATEGIES = [
  { type: "dual-stack", bindLabel: ":: + IPv4 (dual-stack)" },
  { type: "ipv4-any", bindLabel: "0.0.0.0" },
  { type: "ipv4-loopback", bindLabel: "127.0.0.1" },
];

function tryListen(port, triesLeft) {
  if (BIND_HOST) {
    const srv = http.createServer(handleRequest);
    srv.once("error", (err) => {
      if (err.code === "EADDRINUSE" && triesLeft > 0) {
        srv.close(() => tryListen(port + 1, triesLeft));
        return;
      }
      console.error(err.message || err);
      process.exit(1);
    });
    srv.listen(port, BIND_HOST, () => {
      activeServers = [srv];
      printBanner(port, BASE_PORT, { bind: BIND_HOST });
    });
    return;
  }

  listenWithFallback(port, triesLeft, DEFAULT_STRATEGIES, 0);
}

process.on("SIGINT", () => {
  closeAll(() => process.exit(0));
});

tryListen(BASE_PORT, 30);
