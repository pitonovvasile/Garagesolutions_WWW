/**
 * Din `assets/garage-solutions-logo.png` generează:
 * - assets/garage-solutions-favicon.png (64×64) — tab / bookmark
 * - assets/garage-solutions-apple-touch.png (180×180) — Add to Home Screen (iOS)
 *
 * Recolor: gri neutru → alb; negru foarte închis și roșu (R dominant) → neschimbate.
 * Scalare: fit în pătrat, centrat.
 *
 * Rulare: npm run favicon
 */
import fs from "fs";
import path from "path";
import { PNG } from "pngjs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const src = path.join(root, "assets", "garage-solutions-logo.png");
const out = path.join(root, "assets", "garage-solutions-favicon.png");
const outApple = path.join(root, "assets", "garage-solutions-apple-touch.png");
const FAV = 64;
const APPLE = 180;

function recolorPixel(r, g, b, a) {
  if (a < 6) {
    return [r, g, b, a];
  }

  const maxc = Math.max(r, g, b);
  const minc = Math.min(r, g, b);
  const sum = r + g + b;
  const avg = sum / 3;
  const neutral =
    Math.abs(r - g) < 24 && Math.abs(g - b) < 24 && Math.abs(r - b) < 24;

  const isRed = r > 70 && r > g + 14 && r > b + 14 && maxc - minc > 20;
  if (isRed) {
    return [r, g, b, a];
  }

  if (maxc <= 62 && avg < 72) {
    return [r, g, b, a];
  }

  if (neutral) {
    if (maxc < 60) {
      return [r, g, b, a];
    }
    return [255, 255, 255, a];
  }

  const sat = maxc - minc;
  if (sat < 35 && avg > 75) {
    if (maxc < 55) {
      return [r, g, b, a];
    }
    return [255, 255, 255, a];
  }

  return [r, g, b, a];
}

function recolorInPlace(png) {
  const { data } = png;
  for (let i = 0; i < data.length; i += 4) {
    const [nr, ng, nb, na] = recolorPixel(data[i], data[i + 1], data[i + 2], data[i + 3]);
    data[i] = nr;
    data[i + 1] = ng;
    data[i + 2] = nb;
    data[i + 3] = na;
  }
}

function fitToSquareFavicon(srcPng, size) {
  const w = srcPng.width;
  const h = srcPng.height;
  const scale = Math.min(size / w, size / h);
  const nw = Math.max(1, Math.round(w * scale));
  const nh = Math.max(1, Math.round(h * scale));
  const ox = Math.floor((size - nw) / 2);
  const oy = Math.floor((size - nh) / 2);
  const dst = new PNG({ width: size, height: size });
  dst.data.fill(0);
  for (let y = 0; y < nh; y++) {
    for (let x = 0; x < nw; x++) {
      const sx = Math.min(w - 1, Math.floor(((x + 0.5) * w) / nw));
      const sy = Math.min(h - 1, Math.floor(((y + 0.5) * h) / nh));
      const si = (sy * w + sx) * 4;
      const di = ((oy + y) * size + (ox + x)) * 4;
      for (let c = 0; c < 4; c++) {
        dst.data[di + c] = srcPng.data[si + c];
      }
    }
  }
  return dst;
}

const buf = fs.readFileSync(src);
const png = PNG.sync.read(buf);
recolorInPlace(png);
const small = fitToSquareFavicon(png, FAV);
const applePng = fitToSquareFavicon(png, APPLE);
fs.writeFileSync(out, PNG.sync.write(small));
fs.writeFileSync(outApple, PNG.sync.write(applePng));
console.log("Written:", out, `${FAV}×${FAV}`);
console.log("Written:", outApple, `${APPLE}×${APPLE}`);
