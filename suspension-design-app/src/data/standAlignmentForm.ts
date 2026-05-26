/** Date normalizate pentru raport geometrie / stand 3D (introducere manuală). */

export interface StandFrontCornerForm {
  camberDeg: string;
  toeMin: string;
  casterDeg: string;
}

export interface StandRearCornerForm {
  camberDeg: string;
  toeMin: string;
}

export interface StandAlignmentForm {
  frontLeft: StandFrontCornerForm;
  frontRight: StandFrontCornerForm;
  rearLeft: StandRearCornerForm;
  rearRight: StandRearCornerForm;
  totalToeFrontMin: string;
  totalToeRearMin: string;
  thrustAngleDeg: string;
  /** Ampatament (wheelbase), mm */
  wheelbaseMm: string;
  /** Ecartament față (track width front), mm */
  trackFrontMm: string;
  /** Ecartament spate (track width rear), mm */
  trackRearMm: string;
}

export const EMPTY_FRONT_CORNER: StandFrontCornerForm = {
  camberDeg: "",
  toeMin: "",
  casterDeg: "",
};

export const EMPTY_REAR_CORNER: StandRearCornerForm = {
  camberDeg: "",
  toeMin: "",
};

export function createEmptyStandAlignmentForm(): StandAlignmentForm {
  return {
    frontLeft: { ...EMPTY_FRONT_CORNER },
    frontRight: { ...EMPTY_FRONT_CORNER },
    rearLeft: { ...EMPTY_REAR_CORNER },
    rearRight: { ...EMPTY_REAR_CORNER },
    totalToeFrontMin: "",
    totalToeRearMin: "",
    thrustAngleDeg: "",
    wheelbaseMm: "",
    trackFrontMm: "",
    trackRearMm: "",
  };
}

/** Ghidaje diagramă SVG (viewBox 0–100). */
export interface StandDiagramGuideState {
  frontY: number;
  rearY: number;
  symmetryY1: number;
  symmetryY2: number;
  thrustFrontY: number;
}

export const DEFAULT_STAND_DIAGRAM_GUIDE: StandDiagramGuideState = {
  frontY: 19.75,
  rearY: 78,
  symmetryY1: 14,
  symmetryY2: 88,
  thrustFrontY: 14,
};

/** Snapshot salvat în localStorage împreună cu restul configurației suspensie. */
export interface StandAlignmentSnapshotPersisted {
  form: StandAlignmentForm;
  targets: StandAlignmentForm;
  diagramGuides: StandDiagramGuideState;
  toleranceDegStr: string;
  toleranceMinStr: string;
  toleranceMmStr: string;
}

export function mergeStandAlignmentForm(prev: StandAlignmentForm, patch: Partial<StandAlignmentForm>): StandAlignmentForm {
  return {
    frontLeft: patch.frontLeft ? { ...prev.frontLeft, ...patch.frontLeft } : prev.frontLeft,
    frontRight: patch.frontRight ? { ...prev.frontRight, ...patch.frontRight } : prev.frontRight,
    rearLeft: patch.rearLeft ? { ...prev.rearLeft, ...patch.rearLeft } : prev.rearLeft,
    rearRight: patch.rearRight ? { ...prev.rearRight, ...patch.rearRight } : prev.rearRight,
    totalToeFrontMin: patch.totalToeFrontMin !== undefined ? patch.totalToeFrontMin : prev.totalToeFrontMin,
    totalToeRearMin: patch.totalToeRearMin !== undefined ? patch.totalToeRearMin : prev.totalToeRearMin,
    thrustAngleDeg: patch.thrustAngleDeg !== undefined ? patch.thrustAngleDeg : prev.thrustAngleDeg,
    wheelbaseMm: patch.wheelbaseMm !== undefined ? patch.wheelbaseMm : prev.wheelbaseMm,
    trackFrontMm: patch.trackFrontMm !== undefined ? patch.trackFrontMm : prev.trackFrontMm,
    trackRearMm: patch.trackRearMm !== undefined ? patch.trackRearMm : prev.trackRearMm,
  };
}

export type StandToleranceKind = "deg" | "min" | "mm";

export function parseLocaleFloat(raw: string): number | null {
  const t = raw.trim().replace(",", ".");
  if (t === "" || t === "-" || t === "+") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/**
 * Diagonală între două huburi în mm: √((x₂−x₁)² + (y₂−y₁)²).
 * Convenție stand: stânga = FL→RR, dreapta = FR→RL.
 */
export function standDiagonalMmFromHubs(
  x1Mm: number,
  y1Mm: number,
  x2Mm: number,
  y2Mm: number,
): number {
  const dx = x2Mm - x1Mm;
  const dy = y2Mm - y1Mm;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Model dreptunghiular (punți paralele): ampatament W, ecartament față T →
 * ambele diagonale au lungimea √(W² + T²) mm (FL–RR și FR–RL coincid).
 */
export function standBodyDiagonalsFromWheelbaseTrackMm(
  wheelbaseMm: number,
  trackFrontMm: number,
): { leftMm: number; rightMm: number } | null {
  if (!(wheelbaseMm > 0) || !(trackFrontMm > 0)) return null;
  const fl = { x: 0, y: 0 };
  const fr = { x: trackFrontMm, y: 0 };
  const rl = { x: 0, y: wheelbaseMm };
  const rr = { x: trackFrontMm, y: wheelbaseMm };
  const leftMm = standDiagonalMmFromHubs(fl.x, fl.y, rr.x, rr.y);
  const rightMm = standDiagonalMmFromHubs(fr.x, fr.y, rl.x, rl.y);
  return { leftMm, rightMm };
}

export type StandMetricStatus = "ok" | "bad" | "ref";

export function standMetricStatus(
  current: string,
  target: string,
  tol: number,
  kind: StandToleranceKind,
): StandMetricStatus {
  if (!(tol > 0) || !Number.isFinite(tol)) return "ref";
  const c = parseLocaleFloat(current);
  const tgt = parseLocaleFloat(target);
  if (c === null) return "ref";
  const t0 = tgt ?? 0;
  const delta = Math.abs(c - t0);
  const within = kind === "min" ? delta <= tol : delta <= tol;
  return within ? "ok" : "bad";
}

export function standStatusClass(s: StandMetricStatus): string {
  if (s === "ok") return "border-emerald-500/45 text-emerald-100/95";
  if (s === "bad") return "border-rose-500/55 text-rose-100/95";
  /* ref / fără măsură: contur mov (rubrică) */
  return "border-violet-500/45 text-neutral-300";
}

export function standStatusFillClass(s: StandMetricStatus): string {
  if (s === "ok") return "fill-emerald-400/90";
  if (s === "bad") return "fill-rose-400/90";
  return "fill-neutral-500/80";
}

export function standDeltaLabel(current: string, target: string): string {
  const c = parseLocaleFloat(current);
  if (c === null) return "—";
  const t = parseLocaleFloat(target) ?? 0;
  const d = c - t;
  if (Math.abs(d) < 1e-9) return "0";
  return d.toFixed(3).replace(/\.?0+$/, "") || "0";
}
