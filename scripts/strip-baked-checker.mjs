/**
 * Removes checkerboard / neutral matting baked into RGB (not real alpha).
 * Keeps dark metal + saturated accents (e.g. red rim on gears).
 * Usage: node scripts/strip-baked-checker.mjs <input.png> <output.png>
 */
import sharp from "sharp";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const input = path.resolve(process.argv[2] ?? path.join(root, "assets", "antrenare-punte-icon.png"));
const output = path.resolve(process.argv[3] ?? path.join(root, "assets", "antrenare-punte-icon-alpha.png"));

const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
if (info.channels !== 4) throw new Error("Expected RGBA");

const out = Buffer.from(data);

const neutral = (r, g, b) => {
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  return mx - mn <= 34;
};

const sat = (r, g, b) => {
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  return mx === 0 ? 0 : (mx - mn) / mx;
};

// Near-pure white pixels (jagged fringe on teeth)
for (let i = 0; i < out.length; i += 4) {
  const r = out[i],
    g = out[i + 1],
    b = out[i + 2];
  if (r + g + b >= 732 && Math.max(r, g, b) - Math.min(r, g, b) <= 18) {
    out[i + 3] = 0;
  }
}

for (let i = 0; i < out.length; i += 4) {
  const r = out[i];
  const g = out[i + 1];
  const b = out[i + 2];
  const l = (r + g + b) / 3;
  const s = sat(r, g, b);

  // Keep anything clearly colored (red trim on gears, etc.)
  if (s >= 0.32) continue;

  // Near-white checker + light halos
  if (l >= 226 && neutral(r, g, b)) {
    out[i + 3] = 0;
    continue;
  }

  // Near-black checker cells (not gear: gear usually has highlights / red; pure neutral black tiles)
  if (l <= 34 && neutral(r, g, b) && s < 0.12) {
    out[i + 3] = 0;
    continue;
  }

  // Mid neutral grays typical of checker + anti-alias between B/W
  if (l >= 118 && l <= 228 && neutral(r, g, b) && s < 0.14) {
    out[i + 3] = 0;
    continue;
  }

  // Very soft light fringe on opaque gear edge
  if (out[i + 3] > 200 && l >= 218 && l < 245 && neutral(r, g, b) && s < 0.1) {
    out[i + 3] = Math.min(out[i + 3], 40);
  }
}

// Second pass: neutral light grays (anti-alias halo on dark gears)
for (let i = 0; i < out.length; i += 4) {
  if (out[i + 3] < 6) continue;
  const r = out[i];
  const g = out[i + 1];
  const b = out[i + 2];
  const l = (r + g + b) / 3;
  const s = sat(r, g, b);
  if (s >= 0.28) continue;
  if (neutral(r, g, b) && l >= 142 && l <= 248 && s < 0.16) {
    out[i + 3] = 0;
  }
}

// Third: enclosed near-white (gear hole fill) + stubborn halos
for (let i = 0; i < out.length; i += 4) {
  if (out[i + 3] < 6) continue;
  const r = out[i];
  const g = out[i + 1];
  const b = out[i + 2];
  const l = (r + g + b) / 3;
  const s = sat(r, g, b);
  if (s >= 0.26) continue;
  if (neutral(r, g, b) && l >= 182 && s < 0.13) {
    out[i + 3] = 0;
  }
}

const w = info.width;
const h = info.height;
const idx = (x, y) => (y * w + x) * 4;
const aAt = (x, y) => {
  if (x < 0 || y < 0 || x >= w || y >= h) return 0;
  return out[idx(x, y) + 3];
};

// Fourth: edge halos (light pixels touching transparency)
for (let iter = 0; iter < 4; iter++) {
  const kill = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = idx(x, y);
      const a = out[i + 3];
      if (a < 12) continue;
      const r = out[i],
        g = out[i + 1],
        b = out[i + 2];
      const l = (r + g + b) / 3;
      const s = sat(r, g, b);
      if (s > 0.3) continue;
      if (l < 138 || l > 254) continue;
      let t = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          if (aAt(x + dx, y + dy) < 26) t++;
        }
      }
      if (t >= 2 && l >= 148) kill.push(i);
    }
  }
  for (const i of kill) out[i + 3] = 0;
}

// Fifth: light halo adjacent to dark metal (fringe on teeth; several passes)
const lumAt = (x, y) => {
  if (x < 0 || y < 0 || x >= w || y >= h) return 999;
  const j = idx(x, y);
  if (out[j + 3] < 8) return 0;
  return (out[j] + out[j + 1] + out[j + 2]) / 3;
};

for (let pass = 0; pass < 3; pass++) {
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = idx(x, y);
      if (out[i + 3] < 12) continue;
      const r = out[i],
        g = out[i + 1],
        b = out[i + 2];
      const l = (r + g + b) / 3;
      const s = sat(r, g, b);
      if (l < 158 || l > 252) continue;
      if (s > 0.3) continue;
      let darkN = false;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nl = lumAt(x + dx, y + dy);
          if (nl > 0 && nl < 142) darkN = true;
        }
      }
      if (darkN && l >= 148) out[i + 3] = 0;
    }
  }
}

// Sixth: any bright pixel touching true transparency (outer silhouette)
for (let y = 0; y < h; y++) {
  for (let x = 0; x < w; x++) {
    const i = idx(x, y);
    if (out[i + 3] < 12) continue;
    const r = out[i],
      g = out[i + 1],
      b = out[i + 2];
    const l = (r + g + b) / 3;
    if (l < 168) continue;
    let touchT = false;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        if (aAt(x + dx, y + dy) < 12) touchT = true;
      }
    }
    if (touchT && l >= 172) out[i + 3] = 0;
  }
}

const tmp = await sharp(out, {
  raw: { width: info.width, height: info.height, channels: 4 },
})
  .png({ compressionLevel: 9, effort: 10, palette: false })
  .toBuffer();

await sharp(tmp).trim({ threshold: 12 }).png({ compressionLevel: 9, effort: 10, palette: false }).toFile(output);

const m = await sharp(output).metadata();
console.log("Wrote", output, `${m.width}x${m.height}`);
