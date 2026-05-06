/**
 * Removes only near-white / light-gray matting (export halo), keeps dark metal + red accents.
 * Usage: node scripts/defringe-light.mjs <input.png> <output.png>
 */
import sharp from "sharp";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const input = path.resolve(process.argv[2] ?? path.join(root, "assets", "antrenare-punte-icon-alpha.png"));
const output = path.resolve(process.argv[3] ?? input);

const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
if (info.channels !== 4) throw new Error("Expected RGBA");

const out = Buffer.from(data);
for (let i = 0; i < out.length; i += 4) {
  const r = out[i];
  const g = out[i + 1];
  const b = out[i + 2];
  const a = out[i + 3];
  const lum = (r + g + b) / 3;
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  const sat = mx === 0 ? 0 : (mx - mn) / mx;

  // Pure / off-white pixels (typical halo)
  if (mn >= 248 && mx - mn <= 10 && a > 8) {
    out[i + 3] = 0;
    continue;
  }

  // Very bright, almost gray, on semi-transparent edge
  if (a > 4 && a < 254 && lum >= 242 && sat < 0.08) {
    out[i + 3] = 0;
    continue;
  }

  // Opaque light gray ring (still conservative)
  if (a >= 240 && lum >= 246 && sat < 0.12) {
    out[i + 3] = 0;
  }
}

await sharp(out, {
  raw: { width: info.width, height: info.height, channels: 4 },
})
  .png({ compressionLevel: 9, effort: 10, palette: false })
  .toFile(output);

console.log("Wrote", output);
