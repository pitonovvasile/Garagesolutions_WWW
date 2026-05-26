const G = 9.80665;

export function parsePositiveFloat(s: string): number | null {
  const n = Number(String(s).trim().replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

export function parseNonNegFloat(s: string): number | null {
  const n = Number(String(s).trim().replace(",", "."));
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

/** `"52 / 48"` → front fraction 0.52 */
export function parseWeightDistributionFr(s: string): { front: number; rear: number } | null {
  const m = String(s)
    .trim()
    .match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/);
  if (!m) return null;
  const a = Number(m[1]);
  const b = Number(m[2]);
  if (!Number.isFinite(a) || !Number.isFinite(b) || a + b <= 0) return null;
  const t = a + b;
  return { front: a / t, rear: b / t };
}

/** `"62 / 68"` kg F/R unsprung per axle (total per axle side pair — simplified). */
export function parseUnsprungPairKg(s: string): { front: number | null; rear: number | null } {
  const m = String(s)
    .trim()
    .match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/);
  if (!m) return { front: null, rear: null };
  const f = Number(m[1]);
  const r = Number(m[2]);
  return {
    front: Number.isFinite(f) && f >= 0 ? f : null,
    rear: Number.isFinite(r) && r >= 0 ? r : null,
  };
}

export function totalMassKgFromManual(mass: {
  totalWeightKg: string;
  curbWeightKg: string;
  fuelMassKg: string;
}): number | null {
  const t = parsePositiveFloat(mass.totalWeightKg);
  if (t != null) return t;
  const c = parsePositiveFloat(mass.curbWeightKg);
  const f = parseNonNegFloat(mass.fuelMassKg) ?? 0;
  if (c != null) return c + f;
  return null;
}

export { G };

export function parsePercentToken(s: string): number | null {
  const m = String(s).trim().match(/^(\d+(?:\.\d+)?)\s*%$/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

export function parseGearAggressivenessScore(finalDrive: string, gear1: string): number | null {
  const fd = parsePositiveFloat(finalDrive);
  const g1 = parsePositiveFloat(gear1);
  if (fd == null || g1 == null) return null;
  return fd * g1;
}
