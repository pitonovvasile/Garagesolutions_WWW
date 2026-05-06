/**
 * Generează assets/garage-car-cutout.png (RGBA, fundal transparent).
 * Rulare: node scripts/build-garage-car-png.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { PNG } from "pngjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const W = 920;
const H = 340;
const png = new PNG({ width: W, height: H, colorType: 6 });

function setPx(x, y, r, g, b, a) {
  if (x < 0 || x >= W || y < 0 || y >= H) return;
  const i = (W * y + x) << 2;
  png.data[i] = r;
  png.data[i + 1] = g;
  png.data[i + 2] = b;
  png.data[i + 3] = a;
}

function pointInPoly(px, py, poly) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0];
    const yi = poly[i][1];
    const xj = poly[j][0];
    const yj = poly[j][1];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

function fillPoly(poly, r, g, b, a) {
  let minX = W;
  let maxX = 0;
  let minY = H;
  let maxY = 0;
  for (const [x, y] of poly) {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  minX = Math.floor(minX);
  maxX = Math.ceil(maxX);
  minY = Math.floor(minY);
  maxY = Math.ceil(maxY);
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      if (pointInPoly(x, y, poly)) setPx(x, y, r, g, b, a);
    }
  }
}

function fillEllipse(cx, cy, rx, ry, r, g, b, a) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const dx = (x - cx) / rx;
      const dy = (y - cy) / ry;
      if (dx * dx + dy * dy <= 1) setPx(x, y, r, g, b, a);
    }
  }
}

function strokeEllipse(cx, cy, rx, ry, thick, r, g, b, a) {
  for (let y = Math.floor(cy - ry - thick); y <= Math.ceil(cy + ry + thick); y++) {
    for (let x = Math.floor(cx - rx - thick); x <= Math.ceil(cx + rx + thick); x++) {
      const dx = (x - cx) / rx;
      const dy = (y - cy) / ry;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d <= 1 && d >= 1 - thick / Math.min(rx, ry)) setPx(x, y, r, g, b, a);
    }
  }
}

// Clear transparent
for (let i = 0; i < png.data.length; i += 4) {
  png.data[i + 3] = 0;
}

// Body (matches SVG silhouette roughly)
const body = [
  [120, 238],
  [118, 228],
  [125, 205],
  [142, 188],
  [168, 178],
  [520, 165],
  [620, 168],
  [695, 178],
  [738, 195],
  [758, 218],
  [765, 238],
  [752, 252],
  [738, 258],
  [698, 262],
  [672, 258],
  [658, 248],
  [652, 232],
  [648, 218],
  [620, 208],
  [580, 202],
  [280, 208],
  [232, 218],
  [218, 232],
  [212, 252],
  [198, 262],
  [158, 265],
  [132, 258],
];
fillPoly(body, 38, 44, 56, 255);

const cabin = [
  [268, 178],
  [298, 118],
  [338, 88],
  [398, 78],
  [468, 82],
  [528, 98],
  [568, 128],
  [588, 165],
  [520, 165],
];
fillPoly(cabin, 42, 50, 64, 255);

const hood = [
  [120, 238],
  [125, 205],
  [142, 188],
  [168, 178],
  [268, 178],
  [298, 118],
  [268, 178],
  [180, 195],
  [145, 215],
];
fillPoly(hood, 36, 42, 54, 255);

// Glass
fillPoly(
  [
    [298, 118],
    [338, 88],
    [398, 78],
    [468, 82],
    [498, 98],
    [518, 128],
    [528, 148],
    [488, 155],
    [358, 142],
  ],
  55,
  65,
  82,
  240
);
fillPoly(
  [
    [358, 142],
    [488, 155],
    [528, 148],
    [568, 128],
    [588, 165],
    [548, 168],
    [368, 162],
  ],
  48,
  58,
  75,
  235
);

// Wheel wells (dark)
fillEllipse(678, 238, 52, 48, 10, 12, 16, 255);
fillEllipse(188, 242, 50, 46, 10, 12, 16, 255);

// Wheels
fillEllipse(678, 238, 44, 44, 15, 18, 24, 255);
strokeEllipse(678, 238, 44, 44, 4, 42, 49, 66, 255);
fillEllipse(678, 238, 26, 26, 55, 60, 72, 255);
strokeEllipse(678, 238, 26, 26, 2, 26, 32, 40, 255);
fillEllipse(678, 238, 10, 10, 12, 14, 18, 255);

fillEllipse(188, 242, 42, 42, 15, 18, 24, 255);
strokeEllipse(188, 242, 42, 42, 4, 42, 49, 66, 255);
fillEllipse(188, 242, 24, 24, 55, 60, 72, 255);
strokeEllipse(188, 242, 24, 24, 2, 26, 32, 40, 255);
fillEllipse(188, 242, 9, 9, 12, 14, 18, 255);

// Sill shadow
fillPoly(
  [
    [232, 248],
    [648, 232],
    [652, 242],
    [238, 258],
  ],
  8,
  10,
  14,
  140
);

const out = path.join(__dirname, "..", "assets", "garage-car-cutout.png");
png.pack().pipe(fs.createWriteStream(out));
png.on("end", () => {
  console.log("Wrote", out);
});
