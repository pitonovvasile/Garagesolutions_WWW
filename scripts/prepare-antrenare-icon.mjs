/**
 * "Card" PNG exports often include baked frames + repeated title. Extract gear cluster only, then matting cleanup.
 * Usage: node scripts/prepare-antrenare-icon.mjs <input.png> <output.png>
 */
import sharp from "sharp";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const input = path.resolve(process.argv[2] ?? path.join(root, "assets", "antrenare-punte-raw.png"));
const output = path.resolve(process.argv[3] ?? path.join(root, "assets", "antrenare-punte-icon-alpha.png"));

const meta = await sharp(input).metadata();
const w = meta.width;
const h = meta.height;

// Tight crop inside baked UI frames (card exports): isolate gear cluster only.
const crop = {
  left: Math.round(w * 0.15),
  top: Math.round(h * 0.11),
  width: Math.round(w * 0.7),
  height: Math.round(h * 0.28),
};

let buf = await sharp(input).extract(crop).ensureAlpha().raw().toBuffer();

const width = crop.width;
const height = crop.height;
const out = Buffer.from(buf);

const idx = (x, y) => (y * width + x) * 4;
const lumAt = (i) => (out[i] + out[i + 1] + out[i + 2]) / 3;
const satAt = (i) => {
  const r = out[i],
    g = out[i + 1],
    b = out[i + 2];
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  return mx === 0 ? 0 : (mx - mn) / mx;
};

const seedLum = 108;
const spreadLum = 82;
const visited = new Uint8Array(width * height);
const q = [];

const trySeed = (x, y, minLum) => {
  const p = y * width + x;
  if (visited[p]) return;
  const i = idx(x, y);
  if (lumAt(i) < minLum) return;
  if (satAt(i) > 0.26) return;
  visited[p] = 1;
  q.push(p);
};

for (let x = 0; x < width; x++) {
  trySeed(x, 0, seedLum);
  trySeed(x, height - 1, seedLum);
}
for (let y = 0; y < height; y++) {
  trySeed(0, y, seedLum);
  trySeed(width - 1, y, seedLum);
}

while (q.length) {
  const p = q.pop();
  const x = p % width;
  const y = (p / width) | 0;
  const i = idx(x, y);
  out[i + 3] = 0;

  for (const [nx, ny] of [
    [x - 1, y],
    [x + 1, y],
    [x, y - 1],
    [x, y + 1],
  ]) {
    if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
    const np = ny * width + nx;
    if (visited[np]) continue;
    const ni = idx(nx, ny);
    if (lumAt(ni) < spreadLum) continue;
    if (satAt(ni) > 0.3) continue;
    visited[np] = 1;
    q.push(np);
  }
}

for (let i = 0; i < out.length; i += 4) {
  const r = out[i],
    g = out[i + 1],
    b = out[i + 2];
  const a = out[i + 3];
  if (a < 8) continue;
  const lum = (r + g + b) / 3;
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  const sat = mx === 0 ? 0 : (mx - mn) / mx;
  if (mn >= 244 && mx - mn <= 12) out[i + 3] = 0;
  else if (lum >= 238 && sat < 0.14) out[i + 3] = Math.min(a, Math.floor(a * 0.35));
  else if (a < 252 && lum >= 232 && sat < 0.12) out[i + 3] = 0;
}

await sharp(out, { raw: { width, height, channels: 4 } })
  .png({ compressionLevel: 9, effort: 10, palette: false })
  .toFile(output);

console.log("Wrote", output, `${width}x${height}`);
