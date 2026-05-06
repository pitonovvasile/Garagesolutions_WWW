/**
 * Server static local (fără dependențe). Rulare: npm run preview
 * Apoi: http://127.0.0.1:8080/index.html (implicit). Alt port: PORT=9090 npm run preview
 */
import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const PORT = Number(process.env.PORT || 8080);
const HOST = process.env.HOST || "127.0.0.1";

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

function sendFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  res.setHeader("Content-Type", MIME[ext] || "application/octet-stream");
  fs.createReadStream(filePath).pipe(res);
}

const server = http.createServer((req, res) => {
  const u = new URL(req.url || "/", `http://${HOST}`);
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
});

server.listen(PORT, HOST, () => {
  console.log(`Garage Solutions — http://${HOST}:${PORT}/index.html`);
  console.log("(Lasă acest terminal deschis. Ctrl+C oprește serverul.)");
});
