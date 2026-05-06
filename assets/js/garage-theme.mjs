/** Persistă culoarea de accent a interfeței Garage Mode (localStorage). */

export const GARAGE_THEME_STORAGE_KEY = "garageAccentHex";
export const GARAGE_THEME_DEFAULT_HEX = "#ef4444";

function clamp255(n) {
  return Math.min(255, Math.max(0, n));
}

function parseHex(hex) {
  if (typeof hex !== "string") return null;
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  if (!m) return null;
  return {
    r: parseInt(m[1], 16),
    g: parseInt(m[2], 16),
    b: parseInt(m[3], 16),
  };
}

function rgbToHsl(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      default:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }
  return [h * 360, s * 100, l * 100];
}

function hslToRgb(h, s, l) {
  h /= 360;
  s /= 100;
  l /= 100;
  let r;
  let g;
  let b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p, q, t) => {
      let tt = t;
      if (tt < 0) tt += 1;
      if (tt > 1) tt -= 1;
      if (tt < 1 / 6) return p + (q - p) * 6 * tt;
      if (tt < 1 / 2) return q;
      if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function complementRgb(r, g, b) {
  const [h, s, l] = rgbToHsl(r, g, b);
  return hslToRgb((h + 180) % 360, s, l);
}

function mixTowardWhite(r, g, b, t) {
  return [
    clamp255(Math.round(r + (255 - r) * t)),
    clamp255(Math.round(g + (255 - g) * t)),
    clamp255(Math.round(b + (255 - b) * t)),
  ];
}

/**
 * @param {string} hex
 * @param {HTMLElement} [target]
 */
export function applyGarageTheme(hex, target = document.body) {
  const parsed = parseHex(hex) ?? parseHex(GARAGE_THEME_DEFAULT_HEX);
  if (!parsed) return;
  const { r, g, b } = parsed;
  const c = complementRgb(r, g, b);
  const gda = [Math.round(r * 0.72), Math.round(g * 0.72), Math.round(b * 0.72)];
  const gca = mixTowardWhite(r, g, b, 0.35);
  const cda = [Math.round(c[0] * 0.72), Math.round(c[1] * 0.72), Math.round(c[2] * 0.72)];
  const cca = mixTowardWhite(c[0], c[1], c[2], 0.35);
  const pl = mixTowardWhite(r, g, b, 0.42);
  const dh = [Math.round(r * 0.35), Math.round(g * 0.35), Math.round(b * 0.35)];

  const setTri = (name, arr) => {
    target.style.setProperty(`${name}-r`, String(arr[0]));
    target.style.setProperty(`${name}-g`, String(arr[1]));
    target.style.setProperty(`${name}-b`, String(arr[2]));
  };

  setTri("--garage-p", [r, g, b]);
  setTri("--garage-c", c);
  setTri("--garage-gda", gda);
  setTri("--garage-gca", gca);
  setTri("--garage-cda", cda);
  setTri("--garage-cca", cca);
  setTri("--garage-pl", pl);
  setTri("--garage-dh", dh);
}

function normalizeStoredHex() {
  try {
    const raw = localStorage.getItem(GARAGE_THEME_STORAGE_KEY);
    if (raw && /^#[0-9A-Fa-f]{6}$/.test(raw.trim())) return raw.trim().toLowerCase();
  } catch {
    /* ignore */
  }
  return GARAGE_THEME_DEFAULT_HEX;
}

export function initGarageTheme(root = document) {
  const body = root.body;
  if (!body) return;

  const initial = normalizeStoredHex();
  applyGarageTheme(initial, body);

  const picker = root.getElementById("garage-theme-color");
  if (picker && picker instanceof HTMLInputElement) {
    picker.value = initial;
    picker.addEventListener("input", () => {
      const hex = picker.value;
      applyGarageTheme(hex, body);
      try {
        localStorage.setItem(GARAGE_THEME_STORAGE_KEY, hex);
      } catch {
        /* ignore */
      }
    });
  }

  root.querySelectorAll("[data-garage-hex]").forEach((el) => {
    el.addEventListener("click", () => {
      const h = el.getAttribute("data-garage-hex");
      if (!h || !parseHex(h)) return;
      applyGarageTheme(h, body);
      try {
        localStorage.setItem(GARAGE_THEME_STORAGE_KEY, h);
      } catch {
        /* ignore */
      }
      if (picker && picker instanceof HTMLInputElement) picker.value = h;
    });
  });
}
