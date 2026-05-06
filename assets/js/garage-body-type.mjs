/**
 * Tip caroserie în garaj (switch HUD) — opțiuni filtrate per platformă BMW.
 */

import { bmwGarageHay, detectBmwGaragePlatform } from "./garage-bmw-platform.mjs";

/**
 * Lexicon tipuri de caroserie (referință). În UI apar doar variante disponibile pentru mașina selectată.
 */
export const BMW_BODY_STYLE_LEXICON = [
  "Hatchback",
  "Liftback / fastback",
  "Sedan / Berlina",
  "Coupe",
  "Cabriolet",
  "Gran Coupé",
  "Roadster",
  "Spyder",
  "Targa",
  "Touring (break / wagon)",
  "SAV / SAC (BMW)",
  "SUV",
  "Gran Turismo",
  "Pick-up",
  "Van",
];

/** @type {Record<string, { id: string, label: string }[]>} */
const OPTIONS_BY_PLATFORM = {
  e46: [
    { id: "sedan", label: "Sedan" },
    { id: "coupe", label: "Coupe" },
    { id: "cabrio", label: "Cabriolet" },
    { id: "compact", label: "Compact (hatchback 3 uși)" },
    { id: "break", label: "Touring" },
  ],
  "z4-e89": [{ id: "roadster", label: "Roadster" }],
  "z4-e85": [
    { id: "roadster", label: "Roadster" },
    { id: "coupe", label: "Coupe" },
  ],
  "x5-e53": [{ id: "sav", label: "SAV" }],
  "m2-f87": [{ id: "coupe", label: "Coupe" }],
  "m2-g87": [{ id: "coupe", label: "Coupe" }],
};

/**
 * @param {{ brand?: string, model?: string, engine?: string } | null | undefined} car
 * @returns {{ id: string, label: string }[]}
 */
export function getGarageBodyTypeOptions(car) {
  if (!car || typeof car !== "object") return [];
  const brand = (car.brand || "").toLowerCase();
  if (!brand.includes("bmw")) return [];

  const plat = detectBmwGaragePlatform(car);
  if (!plat) return [];
  const opts = OPTIONS_BY_PLATFORM[plat];
  return opts ? [...opts] : [];
}

/**
 * Din textul modelului / motorului salvat la magazin (fără bodyType încă).
 * @param {{ brand?: string, model?: string, engine?: string } | null | undefined} car
 */
export function inferDefaultBodyType(car) {
  if (!car || typeof car !== "object") return "sedan";
  const h = bmwGarageHay(car);
  const plat = detectBmwGaragePlatform(car);

  if (plat === "z4-e85") {
    if (/\bcoupe\b/.test(h) || /\bcoupé\b/.test(h)) return "coupe";
    return "roadster";
  }
  if (plat === "z4-e89") return "roadster";
  if (plat === "x5-e53") return "sav";
  if (plat === "m2-f87" || plat === "m2-g87") return "coupe";

  if (plat === "e46") {
    if (/\bcompact\b/.test(h)) return "compact";
    if (
      /\bcabrio\b/.test(h) ||
      /\bcabriolet\b/.test(h) ||
      /\bconvertible\b/.test(h) ||
      /\bdecapotabil\b/.test(h)
    ) {
      return "cabrio";
    }
    if (/\btouring\b/.test(h) || /\bbreak\b/.test(h) || /\bwagon\b/.test(h)) return "break";
    if (/\bsedan\b/.test(h) || /\blimuzina\b/.test(h) || /\bberlina\b/.test(h)) return "sedan";
    if (/\bcoupe\b/.test(h) || /\bcoupé\b/.test(h)) return "coupe";
    return "sedan";
  }

  if (/\bcompact\b/.test(h)) return "compact";
  if (
    /\bcabrio\b/.test(h) ||
    /\bcabriolet\b/.test(h) ||
    /\bconvertible\b/.test(h) ||
    /\bdecapotabil\b/.test(h)
  ) {
    return "cabrio";
  }
  if (/\btouring\b/.test(h) || /\bbreak\b/.test(h) || /\bwagon\b/.test(h)) return "break";
  if (/\bsedan\b/.test(h) || /\blimuzina\b/.test(h) || /\bberlina\b/.test(h)) return "sedan";
  if (/\bx5\b/.test(h) || /\be53\b/.test(h)) return "sav";
  if (/\bz4\b/.test(h)) return "roadster";
  if (/\bm2\b/.test(h)) return "coupe";
  if (/\bcoupe\b/.test(h) || /\bcoupé\b/.test(h)) return "coupe";
  return "sedan";
}

/**
 * Valoare stabilă pentru hero / UI (validă pentru opțiunile mașinii).
 * @param {{ brand?: string, model?: string, engine?: string, bodyType?: string } | null | undefined} car
 */
export function getEffectiveBodyType(car) {
  const opts = getGarageBodyTypeOptions(car);
  if (!opts.length) return "";
  const allowed = new Set(opts.map((o) => o.id));
  let bt = typeof car.bodyType === "string" ? car.bodyType.trim().toLowerCase() : "";

  /* Compat: vechile salvări X5 cu id "suv" */
  if (bt === "suv" && allowed.has("sav")) bt = "sav";

  if (!allowed.has(bt)) bt = inferDefaultBodyType(car);
  if (!allowed.has(bt)) bt = opts[0].id;
  return bt;
}
