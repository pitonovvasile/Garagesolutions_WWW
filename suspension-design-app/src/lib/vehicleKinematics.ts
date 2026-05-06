import type {
  AxlePreset,
  LayoutType,
  VehicleDefinition,
  VehiclePointKey,
  VehiclePointMap,
} from "./vehicleTypes";
import { BUMP_TRANSLATE_KEYS } from "./vehicleTypes";

function clonePoints(m: VehiclePointMap): VehiclePointMap {
  const o: VehiclePointMap = {};
  for (const k of Object.keys(m) as VehiclePointKey[]) {
    const v = m[k];
    if (v) o[k] = { ...v };
  }
  return o;
}

export function cloneVehiclePoints(m: VehiclePointMap): VehiclePointMap {
  return clonePoints(m);
}

/** Euclidean distance in mm. */
export function distance2(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

/** Positive bump / compression: wheel-side cluster translates up (+Y) in chassis frame. */
export function applyBumpTravel(base: VehiclePointMap, travelMm: number): VehiclePointMap {
  const out = clonePoints(base);
  const dy = travelMm;
  for (const key of BUMP_TRANSLATE_KEYS) {
    const pt = out[key];
    if (pt) out[key] = { x: pt.x, y: pt.y + dy };
  }
  return out;
}

export function springLength(pts: VehiclePointMap): number | null {
  const a = pts.spring_mount_chassis;
  const b = pts.spring_mount_arm;
  if (!a || !b) return null;
  return distance2(a, b);
}

export function damperLength(pts: VehiclePointMap): number | null {
  const a = pts.damper_mount_chassis;
  const b = pts.damper_mount_arm;
  if (!a || !b) return null;
  return distance2(a, b);
}

/** Camber in degrees per user spec. */
export function calculateCamberDeg(pts: VehiclePointMap, axle: AxlePreset): number {
  const top = pts[axle.camberTop];
  const bottom = pts[axle.camberBottom];
  if (!top || !bottom) return 0;
  const dx = top.x - bottom.x;
  const dy = top.y - bottom.y;
  if (Math.abs(dy) < 1e-9) return 0;
  return (Math.atan2(dx, dy) * 180) / Math.PI;
}

const DT_MM = 0.25;

function motionRatioFromLength(
  basePts: VehiclePointMap,
  lengthFn: (p: VehiclePointMap) => number | null,
): number {
  const p0 = applyBumpTravel(basePts, 0);
  const p1 = applyBumpTravel(basePts, DT_MM);
  const L0 = lengthFn(p0);
  const L1 = lengthFn(p1);
  if (L0 == null || L1 == null) return 0;
  const dL = L1 - L0;
  return dL / DT_MM;
}

/** MR = Δ component length / Δ wheel travel (vertical bump model). */
export function calculateMrSpring(basePts: VehiclePointMap, layout: LayoutType): number {
  void layout;
  return motionRatioFromLength(basePts, springLength);
}

export function calculateMrDamper(basePts: VehiclePointMap, layout: LayoutType): number {
  if (layout === "coilover") {
    return calculateMrSpring(basePts, layout);
  }
  return motionRatioFromLength(basePts, damperLength);
}

export function wheelRateNmm(springRateNmm: number, mrSpring: number): number {
  return springRateNmm * mrSpring * mrSpring;
}

export function dampingAtWheel(damperCoeff: number, mrDamper: number): number {
  return damperCoeff * mrDamper * mrDamper;
}

export interface VehicleAnalysis {
  camberDeg: number;
  springLengthMm: number | null;
  damperLengthMm: number | null;
  mrSpring: number;
  mrDamper: number;
  effectiveMr: number;
  wheelRateNmm: number;
  dampingAtWheel: number;
}

export function analyzeAxle(
  basePts: VehiclePointMap,
  livePts: VehiclePointMap,
  axle: AxlePreset,
  springRateNmm: number,
  damperLinearCoeff: number,
  travelMm: number,
): VehicleAnalysis {
  void travelMm;
  const camberDeg = calculateCamberDeg(livePts, axle);
  const Ls = springLength(livePts);
  const Ld = damperLength(livePts);
  let mrSpring = calculateMrSpring(basePts, axle.layout);
  let mrDamper = calculateMrDamper(basePts, axle.layout);
  if (axle.layout === "coilover") {
    const mr = (mrSpring + mrDamper) / 2;
    mrSpring = mr;
    mrDamper = mr;
  }
  const effectiveMr =
    axle.layout === "coilover" ? mrSpring : Math.hypot(mrSpring, mrDamper) / Math.SQRT2;
  return {
    camberDeg,
    springLengthMm: Ls,
    damperLengthMm: Ld,
    mrSpring,
    mrDamper,
    effectiveMr,
    wheelRateNmm: wheelRateNmm(springRateNmm, mrSpring),
    dampingAtWheel: dampingAtWheel(damperLinearCoeff, mrDamper),
  };
}

export function sampleCamberVsTravel(
  basePts: VehiclePointMap,
  axle: AxlePreset,
  fromMm: number,
  toMm: number,
  steps: number,
): { travel: number; camber: number }[] {
  const out: { travel: number; camber: number }[] = [];
  for (let i = 0; i <= steps; i++) {
    const tr = fromMm + ((toMm - fromMm) * i) / steps;
    const live = applyBumpTravel(basePts, tr);
    out.push({ travel: tr, camber: calculateCamberDeg(live, axle) });
  }
  return out;
}

export function getAxlePreset(vehicle: VehicleDefinition, end: "front" | "rear"): AxlePreset {
  return end === "front" ? vehicle.front : vehicle.rear;
}
