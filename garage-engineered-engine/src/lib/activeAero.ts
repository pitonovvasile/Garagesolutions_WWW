import type {
  AeroComponentEffect,
  AeroConfidenceLevel,
  AeroDataSourceType,
} from "./aerodynamicImpact";

export const ACTIVE_AERO_REFERENCE_SPEED_KMH = 160;

export type ActiveAeroComponent = {
  id: string;
  name: string;
  componentType: string;
  position: string;
  isActiveAero: boolean;
  description: string | null;
  modes: ActiveAeroMode[];
};

export type ActiveAeroMode = {
  id: string;
  aeroComponentId: string;
  name: string;
  modeType: string;
  angleDeg: number | null;
  deploymentPercent: number | null;
  isDefault: boolean;
  description: string | null;
  effects: ActiveAeroModeEffect[];
};

export type ActiveAeroModeEffect = {
  id: string;
  aeroComponentModeId: string;
  speedKmh: number;
  deltaCd: number | null;
  deltaFrontDownforceKg: number | null;
  deltaRearDownforceKg: number | null;
  confidenceLevel: AeroConfidenceLevel;
  dataSourceType: AeroDataSourceType;
  calculationMethod: string | null;
  sourceName: string | null;
};

export type SelectedActiveAeroMode = {
  component: ActiveAeroComponent;
  mode: ActiveAeroMode;
};

export type ActiveAeroSummary = {
  deltaCd: number | null;
  frontDownforceKg: number | null;
  rearDownforceKg: number | null;
  totalDownforceKg: number | null;
  sourceTypes: string[];
  confidenceLevels: string[];
};

function effect(
  id: string,
  modeId: string,
  values: {
    deltaCd: number;
    frontKg?: number;
    rearKg?: number;
    method: string;
  },
): ActiveAeroModeEffect {
  return {
    id,
    aeroComponentModeId: modeId,
    speedKmh: ACTIVE_AERO_REFERENCE_SPEED_KMH,
    deltaCd: values.deltaCd,
    deltaFrontDownforceKg: values.frontKg ?? 0,
    deltaRearDownforceKg: values.rearKg ?? 0,
    confidenceLevel: "low",
    dataSourceType: "estimated",
    calculationMethod: values.method,
    sourceName: "Garage Solutions active aero fallback",
  };
}

export const DEFAULT_ACTIVE_AERO_COMPONENTS: ActiveAeroComponent[] = [
  {
    id: "active-rear-wing",
    name: "Active Rear Wing",
    componentType: "rear_wing",
    position: "rear",
    isActiveAero: true,
    description: "Rear wing with high-downforce, balanced and low-drag DRS modes.",
    modes: [
      {
        id: "active-rear-wing-high-downforce",
        aeroComponentId: "active-rear-wing",
        name: "High Downforce / DRS OFF",
        modeType: "high_downforce",
        angleDeg: 14,
        deploymentPercent: 100,
        isDefault: true,
        description: "Cornering / braking / stability",
        effects: [
          effect("active-rear-wing-high-downforce-effect", "active-rear-wing-high-downforce", {
            deltaCd: 0.045,
            rearKg: 45,
            method: "Fallback DRS OFF estimate at 160 km/h; force values scale with speed squared",
          }),
        ],
      },
      {
        id: "active-rear-wing-balanced",
        aeroComponentId: "active-rear-wing",
        name: "Balanced",
        modeType: "balanced",
        angleDeg: 8,
        deploymentPercent: 70,
        isDefault: false,
        description: "Mixed road / fast bends",
        effects: [
          effect("active-rear-wing-balanced-effect", "active-rear-wing-balanced", {
            deltaCd: 0.03,
            rearKg: 32,
            method: "Fallback intermediate rear-wing estimate at 160 km/h; force values scale with speed squared",
          }),
        ],
      },
      {
        id: "active-rear-wing-low-drag",
        aeroComponentId: "active-rear-wing",
        name: "DRS / Low Drag",
        modeType: "low_drag",
        angleDeg: 2,
        deploymentPercent: 100,
        isDefault: false,
        description: "Straight-line speed / acceleration",
        effects: [
          effect("active-rear-wing-low-drag-effect", "active-rear-wing-low-drag", {
            deltaCd: 0.018,
            rearKg: 18,
            method: "Fallback DRS ON estimate at 160 km/h; force values scale with speed squared",
          }),
        ],
      },
    ],
  },
  {
    id: "active-front-lip",
    name: "Active Front Lip",
    componentType: "front_lip",
    position: "front",
    isActiveAero: true,
    description: "Deployable front lip with street, sport and track positions.",
    modes: [
      {
        id: "active-front-lip-retracted",
        aeroComponentId: "active-front-lip",
        name: "Retracted",
        modeType: "retracted",
        angleDeg: 0,
        deploymentPercent: 0,
        isDefault: true,
        description: "Clearance / low drag",
        effects: [
          effect("active-front-lip-retracted-effect", "active-front-lip-retracted", {
            deltaCd: 0,
            frontKg: 0,
            method: "Fallback retracted front lip reference at 160 km/h",
          }),
        ],
      },
      {
        id: "active-front-lip-street",
        aeroComponentId: "active-front-lip",
        name: "Street",
        modeType: "street",
        angleDeg: 4,
        deploymentPercent: 35,
        isDefault: false,
        description: "Street stability",
        effects: [
          effect("active-front-lip-street-effect", "active-front-lip-street", {
            deltaCd: 0.003,
            frontKg: 4,
            method: "Fallback street front lip estimate at 160 km/h; force values scale with speed squared",
          }),
        ],
      },
      {
        id: "active-front-lip-sport",
        aeroComponentId: "active-front-lip",
        name: "Sport",
        modeType: "sport",
        angleDeg: 8,
        deploymentPercent: 70,
        isDefault: false,
        description: "Sport front grip",
        effects: [
          effect("active-front-lip-sport-effect", "active-front-lip-sport", {
            deltaCd: 0.008,
            frontKg: 10,
            method: "Fallback sport front lip estimate at 160 km/h; force values scale with speed squared",
          }),
        ],
      },
      {
        id: "active-front-lip-track",
        aeroComponentId: "active-front-lip",
        name: "Track",
        modeType: "track",
        angleDeg: 12,
        deploymentPercent: 100,
        isDefault: false,
        description: "Track front axle load",
        effects: [
          effect("active-front-lip-track-effect", "active-front-lip-track", {
            deltaCd: 0.015,
            frontKg: 18,
            method: "Fallback track front lip estimate at 160 km/h; force values scale with speed squared",
          }),
        ],
      },
    ],
  },
];

function round(value: number | null, digits = 3): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  const m = 10 ** digits;
  return Math.round(value * m) / m;
}

function primaryEffect(mode: ActiveAeroMode): ActiveAeroModeEffect | null {
  return mode.effects[0] ?? null;
}

export function scaleActiveAeroForce(
  valueAtReferenceSpeedKg: number | null,
  speedKmh: number,
  referenceSpeedKmh = ACTIVE_AERO_REFERENCE_SPEED_KMH,
): number | null {
  if (valueAtReferenceSpeedKg == null || !Number.isFinite(valueAtReferenceSpeedKg)) return null;
  if (!Number.isFinite(speedKmh) || !Number.isFinite(referenceSpeedKmh) || referenceSpeedKmh <= 0) return null;
  return valueAtReferenceSpeedKg * (Math.max(0, speedKmh) / referenceSpeedKmh) ** 2;
}

export function getActiveAeroModeEffect(mode: ActiveAeroMode): ActiveAeroModeEffect | null {
  return primaryEffect(mode);
}

export function activeAeroModeToComponentEffect(
  selected: SelectedActiveAeroMode,
): AeroComponentEffect | null {
  const modeEffect = primaryEffect(selected.mode);
  if (!modeEffect) return null;
  return {
    componentPlannerId: selected.component.id,
    componentLabel: `${selected.component.name}: ${selected.mode.name}`,
    speed_kmh: modeEffect.speedKmh,
    delta_cd: modeEffect.deltaCd,
    delta_front_downforce_kg: modeEffect.deltaFrontDownforceKg,
    delta_rear_downforce_kg: modeEffect.deltaRearDownforceKg,
    confidence_level: modeEffect.confidenceLevel,
    data_source_type: modeEffect.dataSourceType,
    calculation_method: modeEffect.calculationMethod,
    source_name: modeEffect.sourceName,
    effect_model_type: selected.component.isActiveAero ? "active_aero_mode" : "validated",
    is_estimated: String(modeEffect.dataSourceType).toLowerCase() === "estimated",
  };
}

export function summarizeActiveAeroModes(
  selectedModes: SelectedActiveAeroMode[],
  speedKmh: number,
): ActiveAeroSummary {
  let deltaCd = 0;
  let hasDeltaCd = false;
  let front = 0;
  let rear = 0;
  let hasFront = false;
  let hasRear = false;
  const sourceTypes = new Set<string>();
  const confidenceLevels = new Set<string>();

  for (const selected of selectedModes) {
    const modeEffect = primaryEffect(selected.mode);
    if (!modeEffect) continue;
    if (modeEffect.deltaCd != null) {
      deltaCd += modeEffect.deltaCd;
      hasDeltaCd = true;
    }
    const scaledFront = scaleActiveAeroForce(
      modeEffect.deltaFrontDownforceKg,
      speedKmh,
      modeEffect.speedKmh,
    );
    const scaledRear = scaleActiveAeroForce(
      modeEffect.deltaRearDownforceKg,
      speedKmh,
      modeEffect.speedKmh,
    );
    if (scaledFront != null) {
      front += scaledFront;
      hasFront = true;
    }
    if (scaledRear != null) {
      rear += scaledRear;
      hasRear = true;
    }
    sourceTypes.add(String(modeEffect.dataSourceType));
    confidenceLevels.add(String(modeEffect.confidenceLevel));
  }

  const total = hasFront || hasRear ? front + rear : null;
  return {
    deltaCd: hasDeltaCd ? round(deltaCd, 4) : null,
    frontDownforceKg: hasFront ? round(front, 1) : null,
    rearDownforceKg: hasRear ? round(rear, 1) : null,
    totalDownforceKg: total == null ? null : round(total, 1),
    sourceTypes: [...sourceTypes],
    confidenceLevels: [...confidenceLevels],
  };
}

export function modePurpose(mode: ActiveAeroMode): string {
  if (mode.description?.trim()) return mode.description.trim();
  switch (mode.modeType) {
    case "high_downforce":
      return "Cornering / braking";
    case "low_drag":
      return "Straight-line speed";
    case "track":
      return "Track grip";
    case "sport":
      return "Sport balance";
    case "street":
      return "Street stability";
    case "retracted":
      return "Clearance / low drag";
    default:
      return "Mode-specific aero response";
  }
}

export function modeDragImpact(mode: ActiveAeroMode): string {
  if (mode.modeType === "low_drag" || mode.modeType === "retracted") return "Reduced";
  const modeEffect = primaryEffect(mode);
  const deltaCd = modeEffect?.deltaCd;
  if (deltaCd == null) return "Not available";
  if (deltaCd <= 0.004) return "Slightly increased";
  if (deltaCd <= 0.018) return "Reduced";
  if (deltaCd <= 0.032) return "Moderate";
  return "High";
}

export function modeStabilityImpact(component: ActiveAeroComponent, mode: ActiveAeroMode): string {
  if (mode.modeType === "low_drag") return "Reduced rear stability";
  if (mode.modeType === "retracted") return "Minimal";
  if (component.componentType === "rear_wing") {
    return mode.modeType === "high_downforce" ? "High rear stability" : "Rear stability";
  }
  if (component.componentType === "front_lip" || component.componentType === "front_splitter") {
    return mode.modeType === "track" ? "High front stability" : "Front stability";
  }
  return "Active aero stability";
}
