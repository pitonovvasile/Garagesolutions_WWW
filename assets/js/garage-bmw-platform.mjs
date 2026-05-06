/**
 * Identificare platformă BMW pentru garaj (hero + tipuri de caroserie).
 * Ordinea regulilor contează: Z4 / X5 / M2 înainte de Seria 3 (E46).
 */

/**
 * @param {{ brand?: string, model?: string, engine?: string } | null | undefined} car
 */
export function bmwGarageHay(car) {
  if (!car || typeof car !== "object") return "";
  return `${car.brand || ""} ${car.model || ""} ${car.engine || ""}`.toLowerCase();
}

/**
 * @typedef {"z4-e89"|"z4-e85"|"x5-e53"|"m2-f87"|"m2-g87"|"e46"|null} BmwGaragePlatform
 */

/**
 * @param {{ brand?: string, model?: string, engine?: string } | null | undefined} car
 * @returns {BmwGaragePlatform}
 */
export function detectBmwGaragePlatform(car) {
  const brand = (car?.brand || "").toLowerCase();
  if (!brand.includes("bmw")) return null;

  const h = bmwGarageHay(car);

  /* Orice Z4 — înainte de Seria 3, ca să nu prindem accidental "3" din alte câmpuri */
  if (/\bz4\b/.test(h)) {
    if (/\be89\b/.test(h)) return "z4-e89";
    if (/\be85\b/.test(h)) return "z4-e85";
    return "z4-e89";
  }

  if (/\bx5\b/.test(h) || /\be53\b/.test(h)) return "x5-e53";

  if (/\bm2\b/.test(h) && /\bf87\b/.test(h)) return "m2-f87";
  if (/\bm2\b/.test(h) && /\bg87\b/.test(h)) return "m2-g87";

  /* Seria 3 non-E46 după coduri șasiu frecvente în etichete */
  if (/\b(e9[0-3]|f3[0-9]|f34|f35|f36|f44|g2[0-9]|g8[0-9]|i4|i3)\b/i.test(h)) {
    return null;
  }

  const seria3E46 =
    /\be46\b/.test(h) ||
    /\bseria\s*3\b/.test(h) ||
    /\b3[\s-]*series\b/.test(h);

  if (seria3E46) return "e46";

  return null;
}
