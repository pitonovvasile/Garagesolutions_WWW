/** Build the public Cloudflare Pages folder from the website's static files. */
import { cp, mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, ".pages-dist");
const folders = ["assets", "catalog", "categorii", "garage", "parteneri", "universale", "garage-engineered-engine-dist"];
const extensions = new Set([".html", ".css", ".js", ".mjs", ".json", ".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico", ".webp", ".avif", ".woff", ".woff2"]);
const maxFileBytes = 25 * 1024 * 1024;
const stl = "assets/garage-cars/bmw/e46/compact/e46-compact.stl";

async function copyPublicFile(relativePath) {
  const from = path.join(root, relativePath);
  const size = (await stat(from)).size;
  if (size > maxFileBytes) throw new Error(`Asset prea mare pentru Cloudflare Pages: ${relativePath}`);
  const to = path.join(output, relativePath);
  await mkdir(path.dirname(to), { recursive: true });
  await cp(from, to);
}

async function copyFolder(relativePath) {
  for (const entry of await readdir(path.join(root, relativePath), { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const child = path.posix.join(relativePath, entry.name);
    if (entry.isDirectory()) await copyFolder(child);
    else if (entry.isFile() && child !== stl && extensions.has(path.extname(entry.name).toLowerCase())) {
      await copyPublicFile(child);
    }
  }
}

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const entry of await readdir(root, { withFileTypes: true })) {
  if (entry.isFile() && path.extname(entry.name) === ".html") await copyPublicFile(entry.name);
}
for (const folder of folders) await copyFolder(folder);

const compressedStl = gzipSync(await readFile(path.join(root, stl)), { level: 9 });
if (compressedStl.byteLength > maxFileBytes) throw new Error("Modelul 3D comprimat depășește limita Pages.");
const compressedPath = path.join(output, `${stl}.gz`);
await mkdir(path.dirname(compressedPath), { recursive: true });
await writeFile(compressedPath, compressedStl);
await writeFile(path.join(output, "robots.txt"), "User-agent: *\nDisallow: /\n");
await writeFile(path.join(output, "_headers"), "/*\n  X-Robots-Tag: noindex, nofollow\n/*.html\n  Cache-Control: no-store\n/*.js\n  Cache-Control: no-store\n/*.mjs\n  Cache-Control: no-store\n/*.css\n  Cache-Control: no-store\n");
console.log(`Cloudflare Pages: ${output}`);
