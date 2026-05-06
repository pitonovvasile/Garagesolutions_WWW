/**
 * Mapare explicită mașină salvată → path imagine hero în garaj.
 * Cheie: brand|model|engine (lowercase, trimmed), aceeași convenție ca în garaj.
 * După potrivirile de aici rulează logica din garage-hero-assets (platformă BMW / caroserie).
 */

/** @param {{ brand?: string, model?: string, engine?: string } | null | undefined} car */
export function garageCarImageKey(car) {
  if (!car || typeof car !== "object") return "";
  return [car.brand, car.model, car.engine]
    .map((s) => String(s ?? "").trim().toLowerCase())
    .join("|");
}

/**
 * Potrivire exactă cheie completă → path.
 * Adaugă intrări când ai imagini dedicate per combinație salvată în magazin.
 *
 * @type {Record<string, string>}
 */
export const GARAGE_HERO_EXACT_MAP = {
  // Exemplu:
  // "bmw|seria 3 e46 | 09/2001-02/2005 | fl | sedan|m54b30 | 3.0l benzina | 231 cp | 170 kw | fl":
  //   "assets/garage-cars/bmw/e46/sedan/hero.png",
};

/**
 * Primul prefix care se potrivește la începutul cheii (după normalizare).
 * Ordonează de la cel mai specific la cel mai general.
 *
 * @type {{ prefix: string, path: string }[]}
 */
export const GARAGE_HERO_PREFIX_RULES = [
  /* ex: { prefix: "bmw|seria 3 nfl csl cabrio e46", path: "assets/garage-cars/bmw/e46/cabrio/generic.png" }, */
];

/**
 * @param {{ brand?: string, model?: string, engine?: string } | null | undefined} car
 * @returns {string | null} path relativ sau null = folosește rezolvarea standard
 */
export function resolveGarageHeroOverride(car) {
  if (!car) return null;
  const key = garageCarImageKey(car);
  if (!key) return null;
  const exact = GARAGE_HERO_EXACT_MAP[key];
  if (exact) return exact;
  for (const rule of GARAGE_HERO_PREFIX_RULES) {
    if (key.startsWith(rule.prefix)) return rule.path;
  }
  return null;
}
