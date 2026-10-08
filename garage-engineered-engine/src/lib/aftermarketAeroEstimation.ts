import type {
  AeroBodyComponentRow,
  AeroComponentType,
  AeroEstimateMode,
  AeroFunctionType,
  AeroSizeClass,
  AeroUsageClass,
} from "../data/aeroBodyComponents";
import type { AeroComponentEffect } from "./aerodynamicImpact";

const AIR_DENSITY_KG_M3 = 1.225;
const GRAVITY_MS2 = 9.81;
export const AFTERMARKET_AERO_REFERENCE_SPEED_KMH = 160;

export const AFTERMARKET_AXLE_DISTRIBUTION: Record<
  AeroComponentType,
  { front: number; rear: number }
> = {
  front_splitter: { front: 1, rear: 0 },
  front_lip: { front: 0.9, rear: 0.1 },
  canard: { front: 1, rear: 0 },
  rear_spoiler: { front: 0, rear: 1 },
  rear_wing: { front: 0, rear: 1 },
  diffuser: { front: 0.1, rear: 0.9 },
  flat_floor: { front: 0.4, rear: 0.6 },
  side_skirt: { front: 0.5, rear: 0.5 },
  bumper: { front: 0.5, rear: 0.5 },
  underbody_panel: { front: 0.4, rear: 0.6 },
  hardtop: { front: 0, rear: 0 },
  other: { front: 0.5, rear: 0.5 },
};

type GenericAeroTemplate = {
  componentType: AeroComponentType;
  sizeClass: AeroSizeClass;
  usageClass: AeroUsageClass;
  position: string;
  deltaCdMin: number;
  deltaCdMax: number;
  frontDownforceKg160Min: number;
  frontDownforceKg160Max: number;
  rearDownforceKg160Min: number;
  rearDownforceKg160Max: number;
  dragImpactPercentMin: number;
  dragImpactPercentMax: number;
  notes: string;
};

export const GENERIC_AERO_TEMPLATES: GenericAeroTemplate[] = [
  {
    componentType: "front_splitter",
    sizeClass: "medium",
    usageClass: "sport",
    position: "front",
    deltaCdMin: 0.005,
    deltaCdMax: 0.015,
    frontDownforceKg160Min: 6,
    frontDownforceKg160Max: 15,
    rearDownforceKg160Min: 0,
    rearDownforceKg160Max: 2,
    dragImpactPercentMin: 1,
    dragImpactPercentMax: 4,
    notes: "Generic medium splitter estimate; affected by protrusion, ride height and sealing.",
  },
  {
    componentType: "front_lip",
    sizeClass: "small",
    usageClass: "street",
    position: "front",
    deltaCdMin: 0,
    deltaCdMax: 0.008,
    frontDownforceKg160Min: 2,
    frontDownforceKg160Max: 8,
    rearDownforceKg160Min: 0,
    rearDownforceKg160Max: 1,
    dragImpactPercentMin: 0,
    dragImpactPercentMax: 3,
    notes: "Mild front lip estimate; usually smaller than a real splitter.",
  },
  {
    componentType: "rear_wing",
    sizeClass: "medium",
    usageClass: "sport",
    position: "rear",
    deltaCdMin: 0.02,
    deltaCdMax: 0.05,
    frontDownforceKg160Min: 0,
    frontDownforceKg160Max: 2,
    rearDownforceKg160Min: 20,
    rearDownforceKg160Max: 45,
    dragImpactPercentMin: 5,
    dragImpactPercentMax: 15,
    notes: "Generic rear wing estimate; strongly affected by profile, chord, angle and endplates.",
  },
  {
    componentType: "rear_spoiler",
    sizeClass: "small",
    usageClass: "street",
    position: "rear",
    deltaCdMin: 0,
    deltaCdMax: 0.01,
    frontDownforceKg160Min: 0,
    frontDownforceKg160Max: 1,
    rearDownforceKg160Min: 3,
    rearDownforceKg160Max: 10,
    dragImpactPercentMin: 0,
    dragImpactPercentMax: 3,
    notes: "Generic rear lip spoiler estimate with mild effect.",
  },
  {
    componentType: "diffuser",
    sizeClass: "medium",
    usageClass: "sport",
    position: "rear",
    deltaCdMin: 0,
    deltaCdMax: 0.02,
    frontDownforceKg160Min: 0,
    frontDownforceKg160Max: 2,
    rearDownforceKg160Min: 5,
    rearDownforceKg160Max: 20,
    dragImpactPercentMin: 0,
    dragImpactPercentMax: 6,
    notes: "Generic diffuser estimate; meaningful only with managed underbody airflow.",
  },
  {
    componentType: "flat_floor",
    sizeClass: "medium",
    usageClass: "sport",
    position: "underbody",
    deltaCdMin: -0.01,
    deltaCdMax: 0.005,
    frontDownforceKg160Min: 4,
    frontDownforceKg160Max: 10,
    rearDownforceKg160Min: 6,
    rearDownforceKg160Max: 15,
    dragImpactPercentMin: -3,
    dragImpactPercentMax: 2,
    notes: "Generic flat floor estimate; can reduce drag and support diffuser flow.",
  },
  {
    componentType: "side_skirt",
    sizeClass: "medium",
    usageClass: "street",
    position: "side",
    deltaCdMin: 0,
    deltaCdMax: 0.008,
    frontDownforceKg160Min: 0,
    frontDownforceKg160Max: 3,
    rearDownforceKg160Min: 0,
    rearDownforceKg160Max: 3,
    dragImpactPercentMin: 0,
    dragImpactPercentMax: 3,
    notes: "Generic side skirt estimate; mainly controls side leakage and underbody flow.",
  },
  {
    componentType: "other",
    sizeClass: "small",
    usageClass: "cosmetic",
    position: "unknown",
    deltaCdMin: 0,
    deltaCdMax: 0.002,
    frontDownforceKg160Min: 0,
    frontDownforceKg160Max: 1,
    rearDownforceKg160Min: 0,
    rearDownforceKg160Max: 1,
    dragImpactPercentMin: 0,
    dragImpactPercentMax: 1,
    notes: "Cosmetic component estimate; aerodynamic effect is likely negligible.",
  },
];

function numberOrNull(value: unknown): number | null {
  if (value == null || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(String(value).replace(",", ".").trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function midpoint(min: number, max: number): number {
  return (min + max) / 2;
}

function mmToM(value: unknown): number | null {
  const mm = numberOrNull(value);
  return mm != null && mm > 0 ? mm / 1000 : null;
}

function dynamicPressureAt160(): number {
  const speedMs = AFTERMARKET_AERO_REFERENCE_SPEED_KMH / 3.6;
  return 0.5 * AIR_DENSITY_KG_M3 * speedMs ** 2;
}

function rowMode(row: AeroBodyComponentRow): AeroEstimateMode {
  return row.aeroEstimateMode ?? "generic";
}

function rowComponentType(row: AeroBodyComponentRow): AeroComponentType {
  return row.aeroComponentType ?? "other";
}

function rowSizeClass(row: AeroBodyComponentRow): AeroSizeClass {
  return row.aeroSizeClass ?? "medium";
}

function rowUsageClass(row: AeroBodyComponentRow): AeroUsageClass {
  return row.aeroUsageClass ?? "sport";
}

function rowFunctionType(row: AeroBodyComponentRow): AeroFunctionType {
  return row.aeroFunctionType ?? "unknown";
}

function templateFor(row: AeroBodyComponentRow): GenericAeroTemplate {
  const componentType = rowComponentType(row);
  const sizeClass = rowSizeClass(row);
  const usageClass = rowUsageClass(row);
  const isCosmetic = usageClass === "cosmetic" || rowFunctionType(row) === "cosmetic";
  if (isCosmetic) {
    return GENERIC_AERO_TEMPLATES.find((template) => template.componentType === "other")!;
  }
  return (
    GENERIC_AERO_TEMPLATES.find(
      (template) =>
        template.componentType === componentType &&
        template.sizeClass === sizeClass &&
        template.usageClass === usageClass,
    ) ??
    GENERIC_AERO_TEMPLATES.find(
      (template) => template.componentType === componentType && template.sizeClass === sizeClass,
    ) ??
    GENERIC_AERO_TEMPLATES.find((template) => template.componentType === componentType) ??
    GENERIC_AERO_TEMPLATES.find((template) => template.componentType === "other")!
  );
}

function scaleTemplate(template: GenericAeroTemplate, row: AeroBodyComponentRow): GenericAeroTemplate {
  const sizeClass = rowSizeClass(row);
  const usageClass = rowUsageClass(row);
  const sizeScale = sizeClass === "small" ? 0.65 : sizeClass === "large" ? 1.35 : 1;
  const usageScale =
    usageClass === "cosmetic" ? 0.2 : usageClass === "street" ? 0.75 : usageClass === "track" ? 1.35 : 1;
  return {
    ...template,
    sizeClass,
    usageClass,
    deltaCdMin: template.deltaCdMin * sizeScale * (usageClass === "track" ? 1.2 : 1),
    deltaCdMax: template.deltaCdMax * sizeScale * (usageClass === "track" ? 1.25 : 1),
    frontDownforceKg160Min: template.frontDownforceKg160Min * sizeScale * usageScale,
    frontDownforceKg160Max: template.frontDownforceKg160Max * sizeScale * usageScale,
    rearDownforceKg160Min: template.rearDownforceKg160Min * sizeScale * usageScale,
    rearDownforceKg160Max: template.rearDownforceKg160Max * sizeScale * usageScale,
    dragImpactPercentMin: template.dragImpactPercentMin * sizeScale,
    dragImpactPercentMax: template.dragImpactPercentMax * sizeScale * (usageClass === "track" ? 1.2 : 1),
  };
}

function buildEffectFromRange(
  row: AeroBodyComponentRow,
  range: {
    deltaCdMin: number;
    deltaCdMax: number;
    frontDownforceKg160Min: number;
    frontDownforceKg160Max: number;
    rearDownforceKg160Min: number;
    rearDownforceKg160Max: number;
    dragImpactPercentMin?: number;
    dragImpactPercentMax?: number;
    calculationMethod: string;
    notes: string;
    effectModelType: "generic_template" | "parametric";
  },
): AeroComponentEffect {
  return {
    componentPlannerId: row.id,
    componentLabel: row.label,
    speed_kmh: AFTERMARKET_AERO_REFERENCE_SPEED_KMH,
    delta_cd: midpoint(range.deltaCdMin, range.deltaCdMax),
    delta_cd_min: range.deltaCdMin,
    delta_cd_max: range.deltaCdMax,
    delta_front_downforce_kg: midpoint(range.frontDownforceKg160Min, range.frontDownforceKg160Max),
    delta_front_downforce_kg_min: range.frontDownforceKg160Min,
    delta_front_downforce_kg_max: range.frontDownforceKg160Max,
    delta_rear_downforce_kg: midpoint(range.rearDownforceKg160Min, range.rearDownforceKg160Max),
    delta_rear_downforce_kg_min: range.rearDownforceKg160Min,
    delta_rear_downforce_kg_max: range.rearDownforceKg160Max,
    delta_drag_percent:
      range.dragImpactPercentMin != null && range.dragImpactPercentMax != null
        ? midpoint(range.dragImpactPercentMin, range.dragImpactPercentMax)
        : null,
    delta_drag_percent_min: range.dragImpactPercentMin ?? null,
    delta_drag_percent_max: range.dragImpactPercentMax ?? null,
    data_source_type: "estimated",
    confidence_level: "low",
    effect_model_type: range.effectModelType,
    calculation_method: range.calculationMethod,
    source_name: range.effectModelType === "parametric" ? "User dimensions" : "Generic aero template",
    notes: range.notes,
    is_estimated: true,
  };
}

export function buildGenericAeroEffect(row: AeroBodyComponentRow): AeroComponentEffect {
  const template = scaleTemplate(templateFor(row), row);
  return buildEffectFromRange(row, {
    ...template,
    calculationMethod: "Generic component template range at 160 km/h; scaled by speed squared",
    notes: template.notes,
    effectModelType: "generic_template",
  });
}

function wingClRange(angleDeg: number | null, hasEndplates: boolean, functionType: AeroFunctionType) {
  const angle = angleDeg ?? 8;
  let min = 0.4;
  let max = 0.7;
  if (angle > 6 && angle <= 12) {
    min = 0.7;
    max = 1;
  } else if (angle > 12 && angle <= 18) {
    min = 1;
    max = 1.3;
  } else if (angle > 18) {
    min = 0.8;
    max = 1.15;
  }
  const multiplier = (hasEndplates ? 1.1 : 1) * (functionType === "track" ? 1.05 : 1);
  return { min: min * multiplier, max: max * multiplier };
}

function wingCdRange(angleDeg: number | null): { min: number; max: number } {
  const angle = angleDeg ?? 8;
  if (angle <= 6) return { min: 0.01, max: 0.025 };
  if (angle <= 12) return { min: 0.02, max: 0.05 };
  if (angle <= 18) return { min: 0.04, max: 0.08 };
  return { min: 0.06, max: 0.11 };
}

function splitterEfficiencyRange(row: AeroBodyComponentRow): { min: number; max: number } {
  const usage = rowUsageClass(row);
  let min = 0.25;
  let max = 0.4;
  if (usage === "cosmetic" || rowFunctionType(row) === "cosmetic") {
    min = 0.1;
    max = 0.25;
  } else if (usage === "sport") {
    min = 0.4;
    max = 0.6;
  } else if (usage === "track") {
    min = 0.6;
    max = 0.85;
  }
  const boost = (row.hasSideFences ? 0.05 : 0) + (row.sealedToUndertray ? 0.1 : 0);
  return { min: clamp(min + boost, 0.05, 0.9), max: clamp(max + boost, 0.1, 0.95) };
}

function estimateWing(row: AeroBodyComponentRow): AeroComponentEffect | null {
  const widthM = mmToM(row.widthMm);
  const chordM = mmToM(row.chordMm);
  if (widthM == null || chordM == null) return null;
  const areaM2 = widthM * chordM;
  const cl = wingClRange(numberOrNull(row.angleDeg), row.hasEndplates, rowFunctionType(row));
  const q = dynamicPressureAt160();
  const minKg = (q * areaM2 * cl.min) / GRAVITY_MS2;
  const maxKg = (q * areaM2 * cl.max) / GRAVITY_MS2;
  const cd = wingCdRange(numberOrNull(row.angleDeg));
  return buildEffectFromRange(row, {
    deltaCdMin: cd.min,
    deltaCdMax: cd.max,
    frontDownforceKg160Min: 0,
    frontDownforceKg160Max: 2,
    rearDownforceKg160Min: minKg,
    rearDownforceKg160Max: maxKg,
    dragImpactPercentMin: 4,
    dragImpactPercentMax: 16,
    calculationMethod: "Rear wing: F = 0.5 * rho * v^2 * area * estimated Cl",
    notes: `Wing area ${areaM2.toFixed(3)} m2; Cl range ${cl.min.toFixed(2)}-${cl.max.toFixed(2)}.`,
    effectModelType: "parametric",
  });
}

function estimateSplitter(row: AeroBodyComponentRow): AeroComponentEffect | null {
  const widthM = mmToM(row.widthMm);
  const protrusionM = mmToM(row.protrusionMm);
  if (widthM == null || protrusionM == null) return null;
  const areaM2 = widthM * protrusionM;
  const efficiency = splitterEfficiencyRange(row);
  const q = dynamicPressureAt160();
  const minKg = (q * areaM2 * efficiency.min) / GRAVITY_MS2;
  const maxKg = (q * areaM2 * efficiency.max) / GRAVITY_MS2;
  return buildEffectFromRange(row, {
    deltaCdMin: 0.004,
    deltaCdMax: row.sealedToUndertray ? 0.014 : 0.02,
    frontDownforceKg160Min: minKg,
    frontDownforceKg160Max: maxKg,
    rearDownforceKg160Min: 0,
    rearDownforceKg160Max: Math.max(1, maxKg * 0.12),
    dragImpactPercentMin: 1,
    dragImpactPercentMax: row.sealedToUndertray ? 4 : 6,
    calculationMethod: "Splitter: dynamic pressure * plan area * efficiency range",
    notes: `Splitter area ${areaM2.toFixed(3)} m2; efficiency ${efficiency.min.toFixed(2)}-${efficiency.max.toFixed(2)}.`,
    effectModelType: "parametric",
  });
}

function diffuserScore(row: AeroBodyComponentRow): number {
  const widthM = mmToM(row.widthMm) ?? 1.2;
  const lengthM = mmToM(row.lengthMm) ?? 0.5;
  const rampAngle = numberOrNull(row.rampAngleDeg) ?? 10;
  const groundClearanceMm = numberOrNull(row.groundClearanceMm);
  const widthFactor = clamp(widthM / 1.4, 0.6, 1.15);
  const lengthFactor = clamp(lengthM / 0.8, 0.55, 1.2);
  const angleFactor =
    rampAngle >= 5 && rampAngle <= 7
      ? 1
      : rampAngle >= 8 && rampAngle <= 12
        ? 0.85
        : rampAngle > 15
          ? 0.35
          : rampAngle >= 13
            ? 0.6
            : 0.7;
  const flatFloorFactor = row.startsFromFlatFloor ? 1.25 : 0.7;
  const rideHeightFactor =
    groundClearanceMm == null
      ? 0.85
      : groundClearanceMm < 45
        ? 0.65
        : groundClearanceMm <= 130
          ? 1
          : groundClearanceMm > 160
            ? 0.7
            : 0.85;
  const strakes = numberOrNull(row.strakesCount) ?? 0;
  const strakesFactor = strakes > 0 ? clamp(1 + strakes * 0.03, 1, 1.15) : 0.9;
  return clamp(widthFactor * lengthFactor * angleFactor * flatFloorFactor * rideHeightFactor * strakesFactor, 0.15, 1.25);
}

function diffuserBaseRange(row: AeroBodyComponentRow): { min: number; max: number } {
  switch (rowUsageClass(row)) {
    case "cosmetic":
      return { min: 0, max: 3 };
    case "street":
      return { min: 5, max: 10 };
    case "track":
      return { min: 20, max: 45 };
    default:
      return { min: 10, max: 20 };
  }
}

function estimateDiffuser(row: AeroBodyComponentRow): AeroComponentEffect {
  const score = diffuserScore(row);
  const base = diffuserBaseRange(row);
  const rearMin = base.min * score;
  const rearMax = base.max * score;
  const cdMax = row.startsFromFlatFloor ? 0.01 : 0.025;
  return buildEffectFromRange(row, {
    deltaCdMin: row.startsFromFlatFloor ? -0.004 : 0,
    deltaCdMax: cdMax,
    frontDownforceKg160Min: 0,
    frontDownforceKg160Max: Math.max(1, rearMax * 0.1),
    rearDownforceKg160Min: rearMin,
    rearDownforceKg160Max: rearMax,
    dragImpactPercentMin: row.startsFromFlatFloor ? -1 : 0,
    dragImpactPercentMax: row.startsFromFlatFloor ? 4 : 8,
    calculationMethod: "Diffuser efficiency score from width, length, ramp angle, floor, ride height and strakes",
    notes: `Diffuser score ${score.toFixed(2)}; ramp angle ${numberOrNull(row.rampAngleDeg) ?? 10} deg.`,
    effectModelType: "parametric",
  });
}

export function buildParametricAeroEffect(row: AeroBodyComponentRow): AeroComponentEffect | null {
  switch (rowComponentType(row)) {
    case "rear_wing":
      return estimateWing(row);
    case "front_splitter":
    case "front_lip":
      return estimateSplitter(row);
    case "diffuser":
      return estimateDiffuser(row);
    default:
      return buildGenericAeroEffect(row);
  }
}

export function buildAftermarketAeroEffect(row: AeroBodyComponentRow): AeroComponentEffect | null {
  if (rowFunctionType(row) === "cosmetic" || rowUsageClass(row) === "cosmetic") {
    return buildGenericAeroEffect(row);
  }
  if (rowMode(row) === "parametric") {
    return buildParametricAeroEffect(row) ?? buildGenericAeroEffect(row);
  }
  return buildGenericAeroEffect(row);
}

export function isAeroAffectingComponent(row: AeroBodyComponentRow): boolean {
  return rowFunctionType(row) !== "cosmetic" && rowComponentType(row) !== "other";
}
