/** Local intake for Bardi accessory pages captured through the authenticated browser UI. */
import { createServer } from "node:http";
import { appendFile } from "node:fs/promises";

const host = "127.0.0.1";
const port = Number(process.env.BARDI_CAPTURE_PORT || 8855);
const output = "/private/tmp/bardi-accessories-captures.jsonl";
const form = `<!doctype html><html lang="ro"><meta charset="utf-8"><title>Captură accesorii Bardi</title>
<body><h1>Captură accesorii Bardi</h1><form method="post" action="/capture">
<label>Date verificate<textarea name="payload" rows="12" cols="100" autofocus></textarea></label>
<button type="submit">Salvează captura</button></form></body></html>`;

createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/") {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(form);
    return;
  }
  if (req.method !== "POST" || req.url !== "/capture") {
    res.writeHead(404).end();
    return;
  }
  try {
    let body = "";
    for await (const part of req) {
      body += part;
      if (body.length > 2_000_000) throw new Error("Captură prea mare");
    }
    const payload = new URLSearchParams(body).get("payload");
    const capture = JSON.parse(payload || "null");
    if (!capture || !/^https:\/\/www\.bardiauto\.ro\/webshop\/termeklista\//.test(capture.sourceUrl)
      || !Array.isArray(capture.categoryPath) || typeof capture.ax !== "string") throw new Error("Captură invalidă");
    await appendFile(output, `${JSON.stringify(capture)}\n`);
    res.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
    res.end(`Salvat: ${capture.categoryPath.join(" / ")}`);
  } catch (error) {
    res.writeHead(400, { "content-type": "text/plain; charset=utf-8" });
    res.end(String(error.message || error));
  }
}).listen(port, host, () => console.log(`Bardi capture intake http://${host}:${port}/`));
