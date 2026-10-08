import type { AxleStockBundle } from "./vehicleStockSuspension";

export type AntiRollBarMode = "na" | "stock" | "tuning";

export type AntiRollBarStiffness = "low" | "medium" | "high";

export const ANTI_ROLL_BAR_MODE_LABELS: Record<AntiRollBarMode, string> = {
  na: "N/A",
  stock: "Stock",
  tuning: "Tuning",
};

export const ANTI_ROLL_BAR_STIFFNESS_LABELS: Record<AntiRollBarStiffness, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export const ANTI_ROLL_BAR_STIFFNESS_OPTIONS: readonly AntiRollBarStiffness[] = [
  "low",
  "medium",
  "high",
];

/** Branduri aftermarket frecvente pentru bare stabilizatoare (listă statică până la catalog). */
export const ANTI_ROLL_BAR_TUNING_BRANDS = [
  "Eibach",
  "H&R",
  "Whiteline",
  "Powerflex",
  "SuperPro",
  "ST Suspensions",
  "KW",
  "Bilstein",
  "Vogtland",
  "Koni",
  "D2 Racing",
  "BC Racing",
] as const;

export const DEFAULT_ANTI_ROLL_BAR_STIFFNESS: AntiRollBarStiffness = "medium";

export function axleOemAntiRollBarStiffness(
  bundle: AxleStockBundle,
): AntiRollBarStiffness | null {
  const v = bundle.stockSuspension.factoryAntiRollBarStiffness;
  if (v === "low" || v === "medium" || v === "high") return v;
  return null;
}

export function defaultAntiRollBarStiffnessForMode(
  mode: AntiRollBarMode,
  bundle: AxleStockBundle | null,
): AntiRollBarStiffness | null {
  if (mode === "na") return null;
  if (mode === "stock") {
    const oem = bundle ? axleOemAntiRollBarStiffness(bundle) : null;
    return oem ?? DEFAULT_ANTI_ROLL_BAR_STIFFNESS;
  }
  /* Tuning: rigiditatea se alege după brand — nu preset la schimbarea modului. */
  return null;
}

export function axleHasFactoryAntiRollBar(bundle: AxleStockBundle): boolean {
  return bundle.stockSuspension.factoryAntiRollBar === true;
}

/** Moduri permise în UI în funcție de prezența barei OEM. */
export function antiRollBarModesForFactory(factory: boolean): AntiRollBarMode[] {
  return factory ? ["na", "stock", "tuning"] : ["na", "tuning"];
}

export function defaultAntiRollBarModeForFactory(factory: boolean): AntiRollBarMode {
  return factory ? "stock" : "na";
}

export function coerceAntiRollBarMode(
  mode: AntiRollBarMode,
  factory: boolean,
): AntiRollBarMode {
  const allowed = antiRollBarModesForFactory(factory);
  return allowed.includes(mode) ? mode : defaultAntiRollBarModeForFactory(factory);
}

export function formatAntiRollBarSessionSummary(
  factory: boolean,
  mode: AntiRollBarMode,
  brand: string | null,
  stiffness: AntiRollBarStiffness | null,
): string {
  const label = ANTI_ROLL_BAR_MODE_LABELS[mode];
  const stiff =
    stiffness != null && mode !== "na"
      ? ` · ${ANTI_ROLL_BAR_STIFFNESS_LABELS[stiffness]}`
      : "";
  if (mode === "tuning") {
    const brandPart = brand ? brand : "brand nespecificat";
    return `${label} · ${brandPart}${stiff}`;
  }
  if (mode === "stock" && factory) return `${label} · OEM${stiff}`;
  if (mode === "na" && !factory) return `${label} · fără bară de fabrică`;
  if (mode === "na" && factory) return `${label} · eliminat / dezactivat`;
  return `${label}${stiff}`;
}
