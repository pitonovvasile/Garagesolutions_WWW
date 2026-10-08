export type CoiloverSetupTier =
  | "standard"
  | "m_technic"
  | "m_performance"
  | "aftermarket";

export const DEFAULT_COILOVER_SETUP_TIER: CoiloverSetupTier = "standard";

export const COILOVER_SETUP_TIER_OPTIONS: readonly CoiloverSetupTier[] = [
  "standard",
  "m_technic",
  "m_performance",
  "aftermarket",
] as const;

export const COILOVER_SETUP_TIER_LABELS: Record<CoiloverSetupTier, string> = {
  standard: "Standard",
  m_technic: "M tehnic",
  m_performance: "M Performance",
  aftermarket: "Aftermarket",
};

/** Valoare sentinelă — resort și amortizor din branduri diferite. */
export const COILOVER_AFTERMARKET_BRAND_CUSTOM = "Custom";

/** Valoare sentinelă în select — brand necunoscut, completat manual. */
export const COILOVER_AFTERMARKET_BRAND_OTHER = "Other";

/** Branduri coilover aftermarket (listă statică; extensibilă din catalog API). */
export const COILOVER_AFTERMARKET_BRANDS: readonly string[] = [
  "Air Lift Performance",
  "Apex",
  "AST Suspension",
  "BC Racing",
  "Bilstein",
  "D2 Racing",
  "Eibach",
  "Fortune Auto",
  "GReddy",
  "H&R",
  "HKS",
  "ISC Suspension",
  "JOM",
  "KSport",
  "KW",
  "Koni",
  "MCS",
  "MeisterR",
  "Moton",
  "Monroe",
  "Ohlins",
  "Raceland",
  "Ridetech",
  "Sachs",
  "Skunk2",
  "ST Suspensions",
  "Tanabe",
  "Tein",
  "Toda",
  "Vogtland",
  "Whiteline",
  "YCW",
] as const;

export function coiloverAftermarketPartBrandDisplay(
  brand: string | null,
  brandOther: string | null,
): string | null {
  if (!brand) return null;
  if (brand === COILOVER_AFTERMARKET_BRAND_OTHER) {
    const custom = brandOther?.trim();
    return custom || COILOVER_AFTERMARKET_BRAND_OTHER;
  }
  return brand;
}

export function coiloverAftermarketBrandDisplay(
  brand: string | null,
  brandOther: string | null,
  springBrand: string | null = null,
  springBrandOther: string | null = null,
  damperBrand: string | null = null,
  damperBrandOther: string | null = null,
): string | null {
  if (!brand) return null;
  if (brand === COILOVER_AFTERMARKET_BRAND_CUSTOM) {
    const spring = coiloverAftermarketPartBrandDisplay(springBrand, springBrandOther);
    const damper = coiloverAftermarketPartBrandDisplay(damperBrand, damperBrandOther);
    if (spring && damper) return `${spring} resort · ${damper} amortizor`;
    if (spring) return `${spring} resort`;
    if (damper) return `${damper} amortizor`;
    return COILOVER_AFTERMARKET_BRAND_CUSTOM;
  }
  return coiloverAftermarketPartBrandDisplay(brand, brandOther);
}
