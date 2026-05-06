/** Vopsea live pe imaginea hero din garaj (per mașină, localStorage). */

export const GARAGE_CAR_PAINT_KEY = "garageSolutionsCarPaintV1";

function carKey(car) {
  if (!car || typeof car !== "object") return "";
  return [car.brand, car.model ?? "", car.engine ?? ""]
    .map((s) => String(s || "").trim().toLowerCase())
    .join("\0");
}

function readMap() {
  try {
    const raw = localStorage.getItem(GARAGE_CAR_PAINT_KEY);
    if (!raw) return {};
    const p = JSON.parse(raw);
    return p && typeof p === "object" && !Array.isArray(p) ? p : {};
  } catch {
    return {};
  }
}

function writeMap(m) {
  try {
    localStorage.setItem(GARAGE_CAR_PAINT_KEY, JSON.stringify(m));
  } catch {
    /* quota / private */
  }
}

function hexToRgb(hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  if (!m) return null;
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
}

function rgbToHexChannel(v) {
  const n = Math.min(255, Math.max(0, Math.round(v)));
  return n.toString(16).padStart(2, "0");
}

function rgbToHex(r, g, b) {
  return `#${rgbToHexChannel(r)}${rgbToHexChannel(g)}${rgbToHexChannel(b)}`;
}

function mixRgbTowardWhite(r, g, b, t) {
  return [r + (255 - r) * t, g + (255 - g) * t, b + (255 - b) * t];
}

/** Luminanță relativă sRGB, 0–1 */
function relativeLuminanceFromHex(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0.5;
  const lin = rgb.map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}

function rgbToHslSat01(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return 0;
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  return s;
}

/**
 * @param {{ brand?: string, model?: string, engine?: string } | null | undefined} car
 * @returns {{ hex: string, strength: number }}
 */
export function readCarPaint(car) {
  const k = carKey(car);
  const fallback = { hex: "#dc2626", strength: 0 };
  if (!k) return fallback;
  const m = readMap();
  const e = m[k];
  if (!e || typeof e !== "object") return fallback;
  const hex = typeof e.hex === "string" && /^#[0-9A-Fa-f]{6}$/.test(e.hex.trim()) ? hexNorm(e.hex) : fallback.hex;
  let strength = typeof e.strength === "number" ? e.strength : 0;
  if (!Number.isFinite(strength)) strength = 0;
  strength = Math.min(1, Math.max(0, strength));
  return { hex, strength };
}

function hexNorm(h) {
  return h.trim().toLowerCase();
}

/**
 * @param {{ brand?: string, model?: string, engine?: string }} car
 * @param {string} hex
 * @param {number} strength 0–1
 */
export function saveCarPaint(car, hex, strength) {
  const k = carKey(car);
  if (!k) return;
  if (typeof hex !== "string" || !/^#[0-9A-Fa-f]{6}$/.test(hex.trim())) return;
  const m = readMap();
  m[k] = { hex: hexNorm(hex), strength: Math.min(1, Math.max(0, strength)) };
  writeMap(m);
}

function clearPaintStackVars(stackEl) {
  stackEl.style.removeProperty("--garage-car-paint");
  stackEl.style.removeProperty("--garage-car-paint-body");
  stackEl.style.removeProperty("--garage-paint-w-base");
  stackEl.style.removeProperty("--garage-paint-w-hue");
  stackEl.removeAttribute("data-paint-base-mode");
}

/**
 * @param {HTMLElement | null} stackEl .garage-car-stack
 * @param {{ brand?: string, model?: string, engine?: string } | null | undefined} car
 */
export function applyCarPaintStack(stackEl, car) {
  if (!stackEl) return;
  if (!car) {
    clearPaintStackVars(stackEl);
    return;
  }
  const { hex, strength } = readCarPaint(car);
  const rgb = hexToRgb(hex);
  if (!rgb) return;

  const lum = relativeLuminanceFromHex(hex);
  const sat = rgbToHslSat01(rgb[0], rgb[1], rgb[2]);

  let baseMode = "multiply";
  let bodyRgb = rgb;
  let wBase;
  let wHue;

  if (lum < 0.22) {
    /* Negru / foarte închis: multiply distruge detaliile → soft-light + nuanță ridicată spre gri */
    baseMode = "soft-light";
    const lift = 0.22 + (0.22 - lum) * 0.45;
    bodyRgb = mixRgbTowardWhite(rgb[0], rgb[1], rgb[2], Math.min(0.38, lift));
    wBase = strength * 0.78;
    wHue = strength * 0.32;
  } else if (lum > 0.8 && sat < 0.16) {
    /* Țintă aproape albă / argintie */
    wBase = strength * 0.86;
    wHue = strength * 0.12;
  } else {
    /* Culoare obișnuită: mai mult hue (crom/kantele cu sat mic rămân neutre), mai puțin multiply */
    wBase = strength * 0.46;
    wHue = strength * 0.64;
  }

  const bodyHex = rgbToHex(bodyRgb[0], bodyRgb[1], bodyRgb[2]);

  stackEl.style.setProperty("--garage-car-paint", hex);
  stackEl.style.setProperty("--garage-car-paint-body", bodyHex);
  stackEl.style.setProperty("--garage-paint-w-base", String(wBase));
  stackEl.style.setProperty("--garage-paint-w-hue", String(wHue));
  stackEl.setAttribute("data-paint-base-mode", baseMode);
}
