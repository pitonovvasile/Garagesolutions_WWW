/**
 * Removes light checkerboard / gray studio matting from edges (common bad export).
 * Edge flood: seeds on border where pixels are bright + low saturation, then spreads similarly.
 * Usage: node scripts/flood-light-matting.mjs <input.png> <output.png> [seedLum] [spreadLum]
 */
import sharp from "sharp";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const input = path.resolve(process.argv[2] ?? path.join(root, "assets", "antrenare-punte-icon-alpha.png"));
const output = path.resolve(process.argv[3] ?? input);
const seedLum = Number(process.argv[4] ?? 118);
const spreadLum = Number(process.argv[5] ?? 92);

const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
if (info.channels !== 4) throw new Error("Expected RGBA");

const { width, height } = info;
const out = Buffer.from(data);
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

const visited = new Uint8Array(width * height);
const q = [];

const trySeed = (x, y, minLum) => {
  const p = y * width + x;
  if (visited[p]) return;
  const i = idx(x, y);
  if (lumAt(i) < minLum) return;
  if (satAt(i) > 0.22) return;
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
    if (satAt(ni) > 0.26) continue;
    visited[np] = 1;
    q.push(np);
  }
}

await sharp(out, {
  raw: { width, height, channels: 4 },
})
  .png({ compressionLevel: 9, effort: 10, palette: false })
  .toFile(output);

console.log("Wrote", output);
