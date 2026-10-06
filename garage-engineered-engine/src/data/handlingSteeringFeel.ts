/** Casetă direcție E46 — tag OEM / swap (referință LPSR & forum). */
export type SteeringRackRatioId =
  | "unknown_oem"
  | "silver"
  | "green"
  | "purple"
  | "yellow"
  | "blue_csl"
  | "blue_slow"
  | "black_reman"
  | "z3_swap"
  | "custom";

export interface E46SteeringRackSpec {
  id: SteeringRackRatioId;
  /** Etichetă scurtă în dropdown. */
  shortLabel: string;
  tagLabel: string;
  codes: string;
  application: string;
  lockToLockTurns: string;
  rackRateMmPerRev: string;
  totalTravelMm: string;
  notes: string;
}

export const E46_STEERING_RACK_SPECS: readonly E46SteeringRackSpec[] = [
  {
    id: "unknown_oem",
    shortLabel: "OEM necunoscut / de verificat",
    tagLabel: "—",
    codes: "—",
    application: "Casetă din fabrică — tag neidentificat",
    lockToLockTurns: "—",
    rackRateMmPerRev: "—",
    totalTravelMm: "—",
    notes: "Verifică tag-ul fizic sau codul ZF înainte de a alege o variantă de mai jos.",
  },
  {
    id: "silver",
    shortLabel: "Silver tag · ~3.33 L2L",
    tagLabel: "Silver tag",
    codes: "—",
    application: "E46 non-M standard / unele modele de bază",
    lockToLockTurns: "≈ 3.33",
    rackRateMmPerRev: "45 mm/tură",
    totalTravelMm: "150 mm",
    notes: "Mai lentă decât purple/yellow; 26 caneluri pe tijă (LPSR).",
  },
  {
    id: "green",
    shortLabel: "Green tag · ~3.2 L2L",
    tagLabel: "Green tag",
    codes: "—",
    application: "E46 M3 non-ZCP",
    lockToLockTurns: "≈ 3.19–3.2",
    rackRateMmPerRev: "47 mm/tură",
    totalTravelMm: "150 mm",
    notes: "Casetă M3 normală; liniară, nu progresivă (măsurători citate).",
  },
  {
    id: "purple",
    shortLabel: "Purple tag · 3.0 L2L",
    tagLabel: "Purple tag",
    codes: "6 755 067 · ZF 7852 974 678",
    application: "E46 Clubsport / 325i / 330i (piață/an)",
    lockToLockTurns: "3.0",
    rackRateMmPerRev: "50 mm/tură",
    totalTravelMm: "150 mm",
    notes: "Upgrade popular; același rack rate ca yellow/ZHP, valvare/asistență diferită față de yellow.",
  },
  {
    id: "yellow",
    shortLabel: "Yellow tag (712) · 3.0 L2L",
    tagLabel: "Yellow tag",
    codes: "ZF 7852 974 712 („712”)",
    application: "E46 330i ZHP / 330i Performance, LHD",
    lockToLockTurns: "3.0",
    rackRateMmPerRev: "50 mm/tură",
    totalTravelMm: "150 mm",
    notes: "Foarte căutată; opțiune LHD. Nu RHD conform LPSR.",
  },
  {
    id: "blue_csl",
    shortLabel: "Blue tag CSL / rapidă · 3.0 L2L",
    tagLabel: "Blue tag — CSL / rapidă",
    codes: "Verifică cod; forum: .924 sus / .640 jos (ZCP/CSL-like)",
    application: "E46 M3 CSL / ZCP, în special RHD (unele surse)",
    lockToLockTurns: "3.0",
    rackRateMmPerRev: "50 mm/tură",
    totalTravelMm: "150 mm",
    notes: "Nu orice blue tag este rapidă; unele blue sunt casete mai lente.",
  },
  {
    id: "blue_slow",
    shortLabel: "Blue tag lentă · ~3.33 L2L",
    tagLabel: "Blue tag — lentă",
    codes: "—",
    application: "E46 LHD/RHD — confundată uneori cu CSL",
    lockToLockTurns: "≈ 3.33",
    rackRateMmPerRev: "45 mm/tură",
    totalTravelMm: "150 mm",
    notes: "Similară ca viteză cu silver; LPSR: poate fi confundată cu CSL.",
  },
  {
    id: "black_reman",
    shortLabel: "Black tag · ~2.5 L2L",
    tagLabel: "Black tag",
    codes: "Aftermarket / reman",
    application: "Upgrade rapid E30/E36/E46 (nu OEM E46 clasic)",
    lockToLockTurns: "≈ 2.5",
    rackRateMmPerRev: "n/a",
    totalTravelMm: "n/a",
    notes: "Nu este casetă OEM E46 clasică; upgrade foarte rapid.",
  },
  {
    id: "z3_swap",
    shortLabel: "Z3 rack swap · ~2.7–2.88 L2L",
    tagLabel: "Z3 rack",
    codes: "—",
    application: "Swap popular pe E46/E30/E36",
    lockToLockTurns: "≈ 2.7–2.88",
    rackRateMmPerRev: "50 mm/tură (LPSR) / 53.5 (forum)",
    totalTravelMm: "144–144.5 mm",
    notes: "Nu e E46 OEM; cursă mai mică → mai puține ture lock-to-lock.",
  },
  {
    id: "custom",
    shortLabel: "Altă casetă / custom…",
    tagLabel: "Custom",
    codes: "—",
    application: "Casetă sau swap necatalogat",
    lockToLockTurns: "—",
    rackRateMmPerRev: "—",
    totalTravelMm: "—",
    notes: "Completează datele manual mai jos.",
  },
] as const;

const STEERING_RACK_BY_ID: Record<SteeringRackRatioId, E46SteeringRackSpec> = Object.fromEntries(
  E46_STEERING_RACK_SPECS.map((s) => [s.id, s]),
) as Record<SteeringRackRatioId, E46SteeringRackSpec>;

/** Migrare valori vechi (raport generic 15:1 etc.) → necunoscut. */
const LEGACY_STEERING_RACK_IDS = new Set([
  "oem",
  "15_1",
  "16_1",
  "17_1",
  "18_1",
  "19_1",
  "20_1",
]);

export function coerceSteeringRackRatioId(raw: string | undefined | null): SteeringRackRatioId {
  if (!raw) return "unknown_oem";
  if (LEGACY_STEERING_RACK_IDS.has(raw)) return "unknown_oem";
  if (raw in STEERING_RACK_BY_ID) return raw as SteeringRackRatioId;
  return "unknown_oem";
}

export function getSteeringRackSpec(id: SteeringRackRatioId): E46SteeringRackSpec {
  return STEERING_RACK_BY_ID[id] ?? STEERING_RACK_BY_ID.unknown_oem;
}

export type StrutBarBracingId =
  | "none"
  | "oem"
  | "strut_tower"
  | "strut_lower_tie"
  | "triangle"
  | "aftermarket";

export type ChassisBracingId =
  | "oem_minimal"
  | "subframe"
  | "partial"
  | "semi"
  | "full_cage"
  | "aftermarket";

export type BushingsTypeId =
  | "oem_rubber"
  | "poly_street"
  | "poly_track"
  | "spherical_mixed"
  | "solid_race"
  | "refresh_oem";

export type AngleArmsId =
  | "stock"
  | "oem_upgraded"
  | "adjustable_rear"
  | "adjustable_front_rear"
  | "tension_strut"
  | "drift_extended"
  | "aftermarket";

export interface HandlingSteeringFeelState {
  steeringRackRatio: SteeringRackRatioId;
  steeringRackRatioCustom: string | null;
  frontStrutBarBracing: StrutBarBracingId;
  rearStrutBarBracing: StrutBarBracingId;
  chassisBracing: ChassisBracingId;
  bushingsType: BushingsTypeId;
  angleArms: AngleArmsId;
}

export const DEFAULT_HANDLING_STEERING_FEEL: HandlingSteeringFeelState = {
  steeringRackRatio: "unknown_oem",
  steeringRackRatioCustom: null,
  frontStrutBarBracing: "oem",
  rearStrutBarBracing: "oem",
  chassisBracing: "oem_minimal",
  bushingsType: "oem_rubber",
  angleArms: "stock",
};

/** Opțiuni dropdown (fără custom — tratat separat). */
export const STEERING_RACK_RATIO_OPTIONS: readonly SteeringRackRatioId[] = E46_STEERING_RACK_SPECS.map(
  (s) => s.id,
);

export const STEERING_RACK_RATIO_LABELS: Record<SteeringRackRatioId, string> = Object.fromEntries(
  E46_STEERING_RACK_SPECS.map((s) => [s.id, s.shortLabel]),
) as Record<SteeringRackRatioId, string>;

export const STRUT_BAR_BRACING_OPTIONS: readonly StrutBarBracingId[] = [
  "none",
  "oem",
  "strut_tower",
  "strut_lower_tie",
  "triangle",
  "aftermarket",
] as const;

export const STRUT_BAR_BRACING_LABELS: Record<StrutBarBracingId, string> = {
  none: "None",
  oem: "OEM / factory",
  strut_tower: "Strut tower bar",
  strut_lower_tie: "Strut + lower tie",
  triangle: "Triangle / multi-point",
  aftermarket: "Aftermarket (other)",
};

export const CHASSIS_BRACING_OPTIONS: readonly ChassisBracingId[] = [
  "oem_minimal",
  "subframe",
  "partial",
  "semi",
  "full_cage",
  "aftermarket",
] as const;

export const CHASSIS_BRACING_LABELS: Record<ChassisBracingId, string> = {
  oem_minimal: "OEM / minimal",
  subframe: "Subframe braces only",
  partial: "Partial (selective)",
  semi: "Semi (doors + subframe)",
  full_cage: "Full cage / extensive",
  aftermarket: "Aftermarket kit",
};

export const BUSHINGS_TYPE_OPTIONS: readonly BushingsTypeId[] = [
  "oem_rubber",
  "poly_street",
  "poly_track",
  "spherical_mixed",
  "solid_race",
  "refresh_oem",
] as const;

export const BUSHINGS_TYPE_LABELS: Record<BushingsTypeId, string> = {
  oem_rubber: "OEM rubber",
  poly_street: "Polyurethane (street)",
  poly_track: "Polyurethane (track)",
  spherical_mixed: "Spherical (mixed)",
  solid_race: "Solid / race",
  refresh_oem: "Refresh OEM bushings",
};

export const ANGLE_ARMS_OPTIONS: readonly AngleArmsId[] = [
  "stock",
  "oem_upgraded",
  "adjustable_rear",
  "adjustable_front_rear",
  "tension_strut",
  "drift_extended",
  "aftermarket",
] as const;

export const ANGLE_ARMS_LABELS: Record<AngleArmsId, string> = {
  stock: "Stock",
  oem_upgraded: "OEM upgraded (M / sport)",
  adjustable_rear: "Adjustable rear arms",
  adjustable_front_rear: "Adjustable front + rear",
  tension_strut: "Front tension strut arms",
  drift_extended: "Drift / extended",
  aftermarket: "Aftermarket kit",
};

export function steeringRackRatioDisplay(
  id: SteeringRackRatioId,
  custom: string | null,
): string {
  if (id === "custom") {
    const t = custom?.trim();
    return t || "Custom (not set)";
  }
  const spec = getSteeringRackSpec(id);
  return `${spec.tagLabel} · ${spec.lockToLockTurns} L2L`;
}
