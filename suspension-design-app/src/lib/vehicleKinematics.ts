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

/**
 * Camber lateral din geometria live (°), **nu** valoare de banc.
 * Preferă `axle.camberTop` → `axle.camberBottom` după `applyBumpTravel`:
 * `atan2(top.x − bottom.x, top.y − bottom.y)` în grade.
 * Fallback: vector vechi `wheel_center` → `control_arm_outer` dacă lipsesc punctele preset.
 */
export function calculateCamberDeg(pts: VehiclePointMap, axle: AxlePreset): number {
  const top = pts[axle.camberTop];
  const bottom = pts[axle.camberBottom];
  if (top && bottom) {
    const dx = top.x - bottom.x;
    const dy = top.y - bottom.y;
    if (Math.abs(dx) < 1e-9 && Math.abs(dy) < 1e-9) return 0;
    return (Math.atan2(dx, dy) * 180) / Math.PI;
  }
  const wc = pts.wheel_center;
  const o = pts.control_arm_outer;
  if (!wc || !o) return 0;
  const dx = o.x - wc.x;
  const dy = o.y - wc.y;
  if (Math.abs(dy) < 1e-9) return 0;
  return (-(Math.atan2(dx, dy) * 180) / Math.PI);
}

const DT_MM = 0.25;

function motionRatioFromLength(
  basePts: VehiclePointMap,
  lengthFn: (p: VehiclePointMap) => number | null,
  centerTravelMm: number,
): number {
  const p0 = applyBumpTravel(basePts, centerTravelMm);
  const p1 = applyBumpTravel(basePts, centerTravelMm + DT_MM);
  const L0 = lengthFn(p0);
  const L1 = lengthFn(p1);
  if (L0 == null || L1 == null) return 0;
  const dL = L1 - L0;
  return dL / DT_MM;
}

/** MR = Δ component length / Δ wheel travel (vertical bump model), centered on `centerTravelMm`. */
export function calculateMrSpring(
  basePts: VehiclePointMap,
  layout: LayoutType,
  centerTravelMm = 0,
): number {
  void layout;
  return motionRatioFromLength(basePts, springLength, centerTravelMm);
}

export function calculateMrDamper(
  basePts: VehiclePointMap,
  layout: LayoutType,
  centerTravelMm = 0,
): number {
  if (layout === "coilover") {
    return calculateMrSpring(basePts, layout, centerTravelMm);
  }
  return motionRatioFromLength(basePts, damperLength, centerTravelMm);
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

export type KinematicWarningLevel = "ok" | "warn" | "error";

/** Per-link visualization severity for the 2D suspension viewport. */
export interface SegmentKinematicWarnings {
  lowerArm: KinematicWarningLevel;
  upperArm: KinematicWarningLevel;
  spring: KinematicWarningLevel;
  damper: KinematicWarningLevel;
  strut: KinematicWarningLevel;
  knuckleTie: KinematicWarningLevel;
}

function bumpLevel(
  current: KinematicWarningLevel,
  next: KinematicWarningLevel,
): KinematicWarningLevel {
  const rank = { ok: 0, warn: 1, error: 2 };
  return rank[next] > rank[current] ? next : current;
}

const MR_WARN_LO = 0.07;
const MR_WARN_HI = 1.92;
const MR_ERR_LO = 0.035;
const MR_ERR_HI = 2.55;
const MIN_ARM_SPAN_MM = 8;
const MIN_SPRING_LENGTH_MM = 12;
const CAMBER_WARN_DEG = 11;
const CAMBER_ERR_DEG = 17;

function levelForMotionRatio(mr: number): KinematicWarningLevel {
  if (!Number.isFinite(mr)) return "error";
  if (mr < MR_ERR_LO || mr > MR_ERR_HI) return "error";
  if (mr < MR_WARN_LO || mr > MR_WARN_HI) return "warn";
  return "ok";
}

/** Flags degenerate geometry, missing links, extreme camber, and out-of-range motion ratios. */
export function getSegmentKinematicWarnings(
  basePts: VehiclePointMap,
  livePts: VehiclePointMap,
  axle: AxlePreset,
): SegmentKinematicWarnings {
  const w: SegmentKinematicWarnings = {
    lowerArm: "ok",
    upperArm: "ok",
    spring: "ok",
    damper: "ok",
    strut: "ok",
    knuckleTie: "ok",
  };

  const ci = livePts.control_arm_inner;
  const co = livePts.control_arm_outer;
  if (ci && co && distance2(ci, co) < MIN_ARM_SPAN_MM) w.lowerArm = "error";

  const ui = livePts.upper_arm_inner;
  const uo = livePts.upper_arm_outer;
  if (axle.type !== "macpherson" && ui && uo && distance2(ui, uo) < MIN_ARM_SPAN_MM) {
    w.upperArm = "error";
  }

  const Ls = springLength(livePts);
  if (Ls == null) w.spring = "error";
  else if (Ls < MIN_SPRING_LENGTH_MM) w.spring = bumpLevel(w.spring, "warn");

  const Ld = damperLength(livePts);
  if (axle.layout === "separate") {
    if (Ld == null) w.damper = "error";
    else if (Ld < MIN_SPRING_LENGTH_MM) w.damper = bumpLevel(w.damper, "warn");
  }

  const mrSpring = calculateMrSpring(basePts, axle.layout, 0);
  const mrDamper = calculateMrDamper(basePts, axle.layout, 0);
  w.spring = bumpLevel(w.spring, levelForMotionRatio(mrSpring));
  if (axle.layout === "separate") {
    w.damper = bumpLevel(w.damper, levelForMotionRatio(mrDamper));
  } else {
    w.damper = bumpLevel(w.damper, levelForMotionRatio(mrDamper));
  }

  const cam = Math.abs(calculateCamberDeg(livePts, axle));
  if (cam > CAMBER_ERR_DEG) {
    w.lowerArm = bumpLevel(w.lowerArm, "error");
    w.upperArm = bumpLevel(w.upperArm, "error");
    w.strut = bumpLevel(w.strut, "error");
    w.knuckleTie = bumpLevel(w.knuckleTie, "error");
  } else if (cam > CAMBER_WARN_DEG) {
    w.lowerArm = bumpLevel(w.lowerArm, "warn");
    w.upperArm = bumpLevel(w.upperArm, "warn");
    w.strut = bumpLevel(w.strut, "warn");
    w.knuckleTie = bumpLevel(w.knuckleTie, "warn");
  }

  return w;
}

export function analyzeAxle(
  basePts: VehiclePointMap,
  livePts: VehiclePointMap,
  axle: AxlePreset,
  springRateNmm: number,
  damperLinearCoeff: number,
  travelMm: number,
): VehicleAnalysis {
  const camberDeg = calculateCamberDeg(livePts, axle);
  const Ls = springLength(livePts);
  const Ld = damperLength(livePts);
  let mrSpring = calculateMrSpring(basePts, axle.layout, travelMm);
  let mrDamper = calculateMrDamper(basePts, axle.layout, travelMm);
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

/** Camber gain (°/mm) around `travelMm` using symmetric finite difference on live bump model. */
export function camberGainRateDegPerMm(
  basePts: VehiclePointMap,
  axle: AxlePreset,
  travelMm: number,
  halfSpanMm = 3,
): number {
  const lo = travelMm - halfSpanMm;
  const hi = travelMm + halfSpanMm;
  const cLo = calculateCamberDeg(applyBumpTravel(basePts, lo), axle);
  const cHi = calculateCamberDeg(applyBumpTravel(basePts, hi), axle);
  return (cHi - cLo) / (hi - lo);
}

export function classifyCamberGainRate(rateDegPerMm: number): "low" | "moderate" | "aggressive" {
  const a = Math.abs(rateDegPerMm);
  if (a < 0.012) return "low";
  if (a < 0.035) return "moderate";
  return "aggressive";
}

export function getAxlePreset(vehicle: VehicleDefinition, end: "front" | "rear"): AxlePreset {
  return end === "front" ? vehicle.front : vehicle.rear;
}

/** Axis-aligned bounds in mm over bump travel; use for stable orthographic framing. */
export function computeSuspensionEnvelopeMm(
  base: VehiclePointMap,
  travelMinMm = -50,
  travelMaxMm = 50,
  paddingMm = 140,
): { minX: number; maxX: number; minY: number; maxY: number } | null {
  const steps = 10;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (let i = 0; i <= steps; i++) {
    const t = travelMinMm + ((travelMaxMm - travelMinMm) * i) / steps;
    const live = applyBumpTravel(base, t);
    for (const k of Object.keys(live) as VehiclePointKey[]) {
      const v = live[k];
      if (!v) continue;
      minX = Math.min(minX, v.x);
      maxX = Math.max(maxX, v.x);
      minY = Math.min(minY, v.y);
      maxY = Math.max(maxY, v.y);
    }
  }
  if (!Number.isFinite(minX)) return null;
  return {
    minX: minX - paddingMm,
    maxX: maxX + paddingMm,
    minY: minY - paddingMm,
    maxY: maxY + paddingMm,
  };
}
