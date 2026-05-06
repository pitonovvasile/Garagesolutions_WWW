/**
 * Înlocuiește fundal deschis conectat la margini cu transparență (RGBA).
 * Util: fundal alb/gri uniform sau carouri (alb + gri) — referințe deduse din pixelii de pe margine.
 *
 * Rulare: node scripts/white-edge-bg-to-alpha.mjs <input.png> [output.png]
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { PNG } from "pngjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const TOLERANCE = Number(process.env.ALPHA_TOLERANCE || 42);

/** @param {number} r @param {number} g @param {number} b */
function luminance(r, g, b) {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/**
 * Colectează pixelii de pe contur și deduce 1–2 culori de fundal (ex. carouri alb/gri).
 * @param {import("pngjs").PNG} png
 * @returns {[number, number, number][]}
 */
function edgeBackgroundRefs(png) {
  const { width: w, height: h, data } = png;
  /** @type {[number, number, number][]} */
  const edge = [];
  const push = (x, y) => {
    const i = (y * w + x) << 2;
    edge.push([data[i], data[i + 1], data[i + 2]]);
  };
  for (let x = 0; x < w; x++) {
    push(x, 0);
    push(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    push(0, y);
    push(w - 1, y);
  }
  edge.sort((a, b) => luminance(a[0], a[1], a[2]) - luminance(b[0], b[1], b[2]));
  const mid = (edge.length / 2) | 0;
  const mean = (/** @type {[number, number, number][]} */ arr) => {
    let r = 0;
    let g = 0;
    let b = 0;
    for (const px of arr) {
      r += px[0];
      g += px[1];
      b += px[2];
    }
    const n = arr.length || 1;
    return [r / n, g / n, b / n];
  };
  const low = mean(edge.slice(0, mid));
  const high = mean(edge.slice(mid));
  const lumDiff = luminance(high[0], high[1], high[2]) - luminance(low[0], low[1], low[2]);
  if (lumDiff < 12) {
    return [mean(edge)];
  }
  return [low, high];
}

/**
 * @param {import("pngjs").PNG} png
 * @param {[number, number, number][]} refs
 */
function floodEdgeBackground(png, refs) {
  const { width: w, height: h, data } = png;
  const n = w * h;
  const visited = new Uint8Array(n);
  const stack = [];

  const similar = (iByte) => {
    const r = data[iByte];
    const g = data[iByte + 1];
    const b = data[iByte + 2];
    for (const [sr, sg, sb] of refs) {
      if (
        Math.abs(r - sr) <= TOLERANCE &&
        Math.abs(g - sg) <= TOLERANCE &&
        Math.abs(b - sb) <= TOLERANCE
      ) {
        return true;
      }
    }
    return false;
  };

  const push = (x, y) => {
    if (x < 0 || x >= w || y < 0 || y >= h) return;
    const p = y * w + x;
    if (visited[p]) return;
    const bi = p << 2;
    if (!similar(bi)) return;
    visited[p] = 1;
    stack.push(p);
  };

  for (let x = 0; x < w; x++) {
    push(x, 0);
    push(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    push(0, y);
    push(w - 1, y);
  }

  while (stack.length) {
    const p = stack.pop();
    const x = p % w;
    const y = (p / w) | 0;
    const bi = p << 2;
    data[bi + 3] = 0;
    push(x + 1, y);
    push(x - 1, y);
    push(x, y + 1);
    push(x, y - 1);
  }
}

const input = process.argv[2];
const output = process.argv[3] || input;

if (!input) {
  console.error("Usage: node scripts/white-edge-bg-to-alpha.mjs <input.png> [output.png]");
  process.exit(1);
}

const absIn = path.isAbsolute(input) ? input : path.join(__dirname, "..", input);
const absOut = path.isAbsolute(output) ? output : path.join(__dirname, "..", output);

const buf = fs.readFileSync(absIn);
const png = PNG.sync.read(buf);

const refs = edgeBackgroundRefs(png);
floodEdgeBackground(png, refs);

const outBuf = PNG.sync.write(png);
fs.writeFileSync(absOut, outBuf);
const refStr = refs.map(([r, g, b]) => `${r | 0},${g | 0},${b | 0}`).join(" | ");
console.error(`OK: ${absOut} (edge ref(s) ~${refStr} tol=${TOLERANCE})`);
