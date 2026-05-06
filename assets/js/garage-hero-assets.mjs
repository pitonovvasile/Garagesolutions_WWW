import { getEffectiveBodyType } from "./garage-body-type.mjs";
import { bmwGarageHay, detectBmwGaragePlatform } from "./garage-bmw-platform.mjs";
import { resolveGarageHeroOverride } from "./garage-hero-map.mjs";

/** Imagini hero în Garage Mode (PNG local cu transparență / decupaj). */
export const DEFAULT_GARAGE_HERO_IMAGE = "assets/garage-car-cutout.png";
const DEFAULT_HERO = DEFAULT_GARAGE_HERO_IMAGE;
/** Coupe E46 (M3 CSL look). */
const BMW_E46_M3 = "assets/garage-cars/bmw/e46/coupe/m3-csl.png";
const BMW_E46_CABRIO = "assets/garage-cars/bmw/e46/cabrio/generic.png";
const BMW_E46_COMPACT = "assets/garage-cars/bmw/e46/compact/hero.png";
const BMW_E46_SEDAN = "assets/garage-cars/bmw/e46/sedan/hero.png";
const BMW_E46_BREAK_NFL = "assets/garage-cars/bmw/e46/break/nfl.png";
const BMW_E46_BREAK_FL_MPACK = "assets/garage-cars/bmw/e46/break/fl-mpack.png";
const BMW_X5_E53_FL = "assets/garage-cars/bmw/x5/e53/fl.png";
const BMW_Z4_E89 = "assets/garage-cars/bmw/z4/e89/roadster.png";
const BMW_M2_F87 = "assets/garage-cars/bmw/m2/f87/coupe.png";

/**
 * @param {{ brand?: string, model?: string, engine?: string, bodyType?: string } | null | undefined} car
 * @returns {string} path relativ la rădăcina site-ului
 */
export function getGarageHeroImageSrc(car) {
  if (!car) {
    return DEFAULT_HERO;
  }

  const override = resolveGarageHeroOverride(car);
  if (override) return override;

  const hay = bmwGarageHay(car);
  const brand = (car.brand || "").toLowerCase();

  if (!brand.includes("bmw")) {
    return DEFAULT_HERO;
  }

  const plat = detectBmwGaragePlatform(car);

  if (plat === "x5-e53") {
    return BMW_X5_E53_FL;
  }

  if (plat === "z4-e89") {
    return BMW_Z4_E89;
  }

  if (plat === "z4-e85") {
    return DEFAULT_HERO;
  }

  if (plat === "m2-f87") {
    return BMW_M2_F87;
  }

  if (plat === "m2-g87") {
    return DEFAULT_HERO;
  }

  const nflHint =
    hay.includes("nfl") ||
    hay.includes("non-fl") ||
    hay.includes("non fl") ||
    hay.includes("pre-facelift") ||
    hay.includes("predfacelift");
  const e46FlFaceliftHint =
    !nflHint &&
    (hay.includes("lci") ||
      hay.includes("| fl") ||
      hay.includes("|fl") ||
      (hay.includes("facelift") && !hay.includes("pre-facelift")));

  if (plat === "e46") {
    const body = getEffectiveBodyType(car);
    if (body === "cabrio") {
      return BMW_E46_CABRIO;
    }
    if (body === "compact") {
      return BMW_E46_COMPACT;
    }
    if (body === "coupe") {
      return BMW_E46_M3;
    }
    if (body === "sedan") {
      return BMW_E46_SEDAN;
    }
    if (body === "break") {
      if (nflHint) {
        return BMW_E46_BREAK_NFL;
      }
      if (e46FlFaceliftHint) {
        return BMW_E46_BREAK_FL_MPACK;
      }
      return DEFAULT_HERO;
    }
  }

  return DEFAULT_HERO;
}

/** Randări foto / 3D (scalare & lumină în garaj + knockout fundal negru). */
export function isPhotoHeroAsset(src) {
  return typeof src === "string" && src.includes("garage-cars/bmw/");
}
