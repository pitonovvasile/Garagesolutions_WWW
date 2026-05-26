import type { SuspensionGoalId } from "./suspensionCatalog";
import type { VehicleDefinition } from "../lib/vehicleTypes";

/** Rich garage row — keyed by geometric preset id; extend with CMS later. */
export interface VehicleGarageProfile {
  vehicleId: string;
  make: string;
  model: string;
  chassis: string;
  years: string;
  frontSuspensionType: string;
  rearSuspensionType: string;
  stockAlignment: string;
  adjustability: string;
  notes: string;
}

const PROFILES: Record<string, VehicleGarageProfile> = {
  "bmw-e46": {
    vehicleId: "bmw-e46",
    make: "BMW",
    model: "3 Series",
    chassis: "E46",
    years: "1998–2006",
    frontSuspensionType: "MacPherson strut",
    rearSuspensionType: "Multi-link",
    stockAlignment: "Camber −0.8° to −1.2° F · Toe 0 to +3′ total R",
    adjustability: "Front camber via eccentric / plates · rear limited",
    notes: "Popular track baseline; rear toe sensitive to bush wear.",
  },
  "generic-dw": {
    vehicleId: "generic-dw",
    make: "—",
    model: "Generic DW template",
    chassis: "Template",
    years: "—",
    frontSuspensionType: "Double wishbone",
    rearSuspensionType: "Double wishbone",
    stockAlignment: "Neutral template",
    adjustability: "Full shims / links (template)",
    notes: "Use for non-catalog cars; confirm hardware with alignment shop.",
  },
  "generic-mp": {
    vehicleId: "generic-mp",
    make: "—",
    model: "Generic MacPherson template",
    chassis: "Template",
    years: "—",
    frontSuspensionType: "MacPherson strut",
    rearSuspensionType: "MacPherson (template rear)",
    stockAlignment: "Neutral template",
    adjustability: "Strut / plate / eccentric",
    notes: "Rear layout is illustrative only.",
  },
};

export function getGarageProfile(vehicle: VehicleDefinition): VehicleGarageProfile {
  return (
    PROFILES[vehicle.id] ?? {
      vehicleId: vehicle.id,
      make: "—",
      model: vehicle.label,
      chassis: vehicle.label,
      years: "—",
      frontSuspensionType: vehicle.front.type.replace("_", " "),
      rearSuspensionType: vehicle.rear.type.replace("_", " "),
      stockAlignment: "See OEM manual",
      adjustability: "Varies",
      notes: "",
    }
  );
}

export const GOAL_OPTIONS: { id: SuspensionGoalId; label: string; hint: string }[] = [
  { id: "street", label: "Street", hint: "Safe daily, moderate drop" },
  { id: "track", label: "Track", hint: "Grip & heat management" },
  { id: "drift", label: "Drift", hint: "Front bite, rear predictability" },
  { id: "fast_road", label: "Fast road", hint: "B-road pace, still civil" },
  { id: "comfort", label: "Comfort", hint: "OEM+ damping, soft springs" },
  { id: "stance", label: "Stance", hint: "Visual fitment first" },
  { id: "balanced", label: "Balanced", hint: "Jack of all trades" },
];

export interface AxleAlignmentTarget {
  camberDeg: number;
  toeTotalMinutes?: number;
  casterDeg?: number;
}

export interface GoalPresetBundle {
  id: string;
  label: string;
  goal: SuspensionGoalId;
  alignmentSummary: string;
  /** Optional numeric targets for Stock / Current / Target UI (per axle). */
  targetFront?: AxleAlignmentTarget;
  targetRear?: AxleAlignmentTarget;
}

/** Goal presets: alignment narrative + targets only — hardware is user-entered in the store. */
export const GOAL_PRESETS: GoalPresetBundle[] = [
  {
    id: "street-daily",
    label: "Street daily",
    goal: "street",
    alignmentSummary: "Front camber −1.0° ±0.2° · Toe 0 to +4′ total · Rear near-zero toe",
    targetFront: { camberDeg: -1.0, toeTotalMinutes: 3, casterDeg: 6.2 },
    targetRear: { camberDeg: -1.25, toeTotalMinutes: 4 },
  },
  {
    id: "track-grip",
    label: "Track grip",
    goal: "track",
    alignmentSummary: "Front camber −2.5° to −3.2° (track pad) · Rear −1.8° camber · Minimal front toe-out",
    targetFront: { camberDeg: -2.85, toeTotalMinutes: -4, casterDeg: 6.8 },
    targetRear: { camberDeg: -1.85, toeTotalMinutes: 6 },
  },
  {
    id: "drift-angle",
    label: "Drift angle",
    goal: "drift",
    alignmentSummary: "Maximize caster within arm limits · Front camber −3° to −4° · Slight rear toe-in",
    targetFront: { camberDeg: -3.5, toeTotalMinutes: 0, casterDeg: 7.2 },
    targetRear: { camberDeg: -1.5, toeTotalMinutes: 8 },
  },
  {
    id: "fast-road",
    label: "Fast road",
    goal: "fast_road",
    alignmentSummary: "Front −1.4° to −1.8° · Small rear negative camber · Street-safe toe",
    targetFront: { camberDeg: -1.55, toeTotalMinutes: 2 },
    targetRear: { camberDeg: -1.45, toeTotalMinutes: 4 },
  },
  {
    id: "comfort-tour",
    label: "Comfort tour",
    goal: "comfort",
    alignmentSummary: "Near OEM camber/toe · prioritize ride height that preserves bump travel",
    targetFront: { camberDeg: -0.95, toeTotalMinutes: 4, casterDeg: 6.0 },
    targetRear: { camberDeg: -1.2, toeTotalMinutes: 5 },
  },
  {
    id: "stance-show",
    label: "Stance / show",
    goal: "stance",
    alignmentSummary: "Fitment-led; expect less bump travel — align for tire wear, not max static camber",
    targetFront: { camberDeg: -2.2, toeTotalMinutes: 2 },
    targetRear: { camberDeg: -1.8, toeTotalMinutes: 6 },
  },
  {
    id: "balanced-all",
    label: "Balanced OEM+",
    goal: "balanced",
    alignmentSummary: "Front −1.2° to −1.6° · neutral rear toe · small front toe-in for stability",
    targetFront: { camberDeg: -1.35, toeTotalMinutes: 3, casterDeg: 6.3 },
    targetRear: { camberDeg: -1.35, toeTotalMinutes: 4 },
  },
];

export function presetsForGoal(goal: SuspensionGoalId): GoalPresetBundle[] {
  return GOAL_PRESETS.filter((p) => p.goal === goal);
}

export function getPresetById(id: string): GoalPresetBundle | undefined {
  return GOAL_PRESETS.find((p) => p.id === id);
}

/**
 * Flux „tur”: trei preset-uri de aliniere țintă aplicate pe rând (Street daily → Balanced → Track grip).
 * Ordinea e stabilă; `presetTourCursor` din store indică următorul indice din această listă.
 */
export const PRESET_TOUR_SEQUENCE_IDS = ["street-daily", "balanced-all", "track-grip"] as const;
