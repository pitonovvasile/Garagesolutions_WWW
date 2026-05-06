/**
 * Removes near-black studio backdrop via edge flood-fill, writes PNG with alpha.
 * Usage: node scripts/studio-black-to-alpha.mjs <input> <output> [seedMax] [spreadMax]
 * Defaults tuned for 1024x682 product shots on black.
 */
import sharp from "sharp";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const input = path.resolve(process.argv[2] ?? path.join(root, "assets", "exhaust-icon.png"));
const output = path.resolve(process.argv[3] ?? path.join(root, "assets", "exhaust-icon-alpha.png"));
const seedMax = Number(process.argv[4] ?? 38);
const spreadMax = Number(process.argv[5] ?? 62);

function floodEraseBlack({ data, width, height, seedMax: sMax, spreadMax: spMax }) {
  const visited = new Uint8Array(width * height);
  const out = Buffer.from(data);
  const idx = (x, y) => (y * width + x) * 4;
  const lum = (i) => out[i] + out[i + 1] + out[i + 2];

  const q = [];
  const push = (x, y) => {
    const p = y * width + x;
    if (visited[p]) return;
    const i = idx(x, y);
    if (lum(i) > sMax) return;
    visited[p] = 1;
    q.push(p);
  };

  for (let x = 0; x < width; x++) {
    push(x, 0);
    push(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    push(0, y);
    push(width - 1, y);
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
      if (lum(ni) > spMax) continue;
      visited[np] = 1;
      q.push(np);
    }
  }

  return out;
}

const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
if (info.channels !== 4) throw new Error("Expected RGBA");

const rgba = floodEraseBlack({
  data,
  width: info.width,
  height: info.height,
  seedMax,
  spreadMax,
});

await sharp(rgba, {
  raw: { width: info.width, height: info.height, channels: 4 },
})
  .png({ compressionLevel: 9, effort: 10, palette: false })
  .toFile(output);

console.log("Wrote", output, `${info.width}x${info.height}`);
