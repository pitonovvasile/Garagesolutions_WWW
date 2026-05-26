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

function handleRequest(req, res) {
  applyPreviewHeaders(res);
  const u = new URL(req.url || "/", "http://localhost");
  if (u.pathname === "/__preview_ok") {
    res.setHeader("Cache-Control", "no-store");
    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("ok");
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
