import type { PerformanceBuildType } from "../store/performanceStore";
import type { PerformanceOeBaseline } from "./performanceOeBaseline";

export type PerformanceCurvePoint = {
  rpm: number;
  oePower: number;
  estPower: number;
  dynoPower: number;
  oeTorque: number;
  estTorque: number;
  boost: number;
  afr: number;
};

export type PerformanceReadinessAxis = {
  subject: string;
  value: number;
};

export type PerformanceCurveModel = {
  oeHp: number;
  oeTorque: number;
  targetHp: number;
  targetTorque: number;
  dynoHp: number;
  weightKg: number;
  redlineRpm: number;
  points: PerformanceCurvePoint[];
  peaks: {
    estPowerHp: number;
    estPowerRpm: number;
    estTorqueNm: number;
    estTorqueRpm: number;
    peakBoostBar: number;
    maxAfr: string;
    redlineRpm: number;
  };
  readiness: PerformanceReadinessAxis[];
  overallReadinessPct: number;
  powerGainHp: number;
  powerGainPct: number;
  torqueGainNm: number;
  torqueGainPct: number;
  powerToWeight: number;
  powerToWeightTarget: number;
  drivetrainLoadPct: number;
  wheelTorqueNm: number;
  clutchLoadPct: number;
  gearboxLoadPct: number;
};

function parseNumberFromText(text: string, unitPattern: RegExp): number | null {
  const m = text.match(unitPattern);
  if (!m?.[1]) return null;
  const n = Number(m[1].replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export function parseHpFromText(text: string): number | null {
  return (
    parseNumberFromText(text, /(\d+(?:\.\d+)?)\s*hp\b/i) ??
    parseNumberFromText(text, /(\d+(?:\.\d+)?)\s*cp\b/i)
  );
}

export function parseNmFromText(text: string): number | null {
  return parseNumberFromText(text, /(\d+(?:\.\d+)?)\s*nm\b/i);
}

export function parseKgFromText(text: string): number | null {
  return parseNumberFromText(text, /(\d+(?:\.\d+)?)\s*kg\b/i);
}

export function parseRpmFromText(text: string): number | null {
  return parseNumberFromText(text, /(\d+(?:\.\d+)?)\s*rpm\b/i);
}

function bell(rpm: number, peakRpm: number, peak: number, spread: number): number {
  const x = (rpm - peakRpm) / spread;
  return peak * Math.exp(-0.5 * x * x);
}

function isDieselHint(fuel: string, engine: string): boolean {
  const blob = `${fuel} ${engine}`.toLowerCase();
  return /\bdiesel\b|\d\.\d+d\b|\bm57|\bn57|\bn47|\bm47|tdi|cdi/.test(blob);
}

function estimateTorqueFromHp(hp: number, diesel: boolean): number {
  if (diesel) return Math.round(hp * 2.35);
  return Math.round(hp * 1.12);
}

function readinessForBuild(
  buildType: PerformanceBuildType,
  budget: string,
): { axes: PerformanceReadinessAxis[]; overall: number } {
  const budgetBoost = budget === "High" ? 8 : budget === "Low" ? -6 : 0;
  const turboBoost = buildType === "Turbo" ? 6 : buildType === "NA" ? -4 : 2;
  const clamp = (n: number) => Math.max(28, Math.min(92, Math.round(n)));

  const axes: PerformanceReadinessAxis[] = [
    { subject: "Engine Internals", value: clamp(72 + budgetBoost) },
    { subject: "Fuel System", value: clamp(48 + budgetBoost * 0.6) },
    { subject: "Air / Boost", value: clamp(80 + turboBoost) },
    { subject: "Cooling", value: clamp(61 + budgetBoost * 0.4) },
    { subject: "ECU & Control", value: clamp(55 + budgetBoost * 0.5) },
    { subject: "Drivetrain", value: clamp(68 + budgetBoost * 0.3) },
  ];
  const overall = Math.round(axes.reduce((s, a) => s + a.value, 0) / axes.length);
  return { axes, overall };
}

export function buildPerformanceCurveModel(input: {
  baseline: PerformanceOeBaseline;
  targetHp: number;
  buildType: PerformanceBuildType;
  budgetLevel: string;
  engineLabel?: string;
}): PerformanceCurveModel {
  const { baseline, targetHp, buildType, budgetLevel, engineLabel = "" } = input;

  let oeHp = parseHpFromText(baseline.power) ?? parseHpFromText(engineLabel);
  if (oeHp == null) oeHp = 0;
  let oeTorque = parseNmFromText(baseline.torque);
  if (oeTorque == null && oeHp > 0) {
    oeTorque = estimateTorqueFromHp(oeHp, isDieselHint(baseline.fuel, engineLabel));
  } else if (oeTorque == null) {
    oeTorque = 0;
  }
  const weightKg = parseKgFromText(baseline.weight) ?? 0;
  const parsedRedline = parseRpmFromText(baseline.redline);
  const diesel = isDieselHint(baseline.fuel, engineLabel);

  const oePeakRpm = diesel ? 4000 : 6000;
  const estPeakRpm = diesel ? 4400 : 5900;
  const torquePeakRpm = diesel ? 2000 : 4200;
  const redlineRpm = parsedRedline ?? 0;

  const targetTorque = estimateTorqueFromHp(targetHp, diesel);
  const dynoHp = Math.round(targetHp * 0.968);

  const points: PerformanceCurvePoint[] = [];
  for (let rpm = 1000; rpm <= 7000; rpm += 250) {
    const oePower = bell(rpm, oePeakRpm, oeHp, diesel ? 900 : 1100);
    const estPower = bell(rpm, estPeakRpm, targetHp, diesel ? 950 : 1050);
    const dynoPower = estPower * (dynoHp / targetHp);
    const oeTorqueCurve = bell(rpm, torquePeakRpm, oeTorque, diesel ? 700 : 900);
    const estTorqueCurve = bell(rpm, torquePeakRpm + 200, targetTorque, diesel ? 750 : 850);
    const boost =
      buildType === "Turbo" || buildType === "Supercharged"
        ? Math.max(0, bell(rpm, 4500, 0.85, 1200) * (rpm > 1800 ? 1 : rpm / 1800))
        : 0;
    const afr = boost > 0.1 ? 11.6 + (0.85 - boost) * 0.8 : 14.2 - (rpm / 7000) * 0.5;

    points.push({
      rpm,
      oePower: Math.round(oePower),
      estPower: Math.round(estPower),
      dynoPower: Math.round(dynoPower),
      oeTorque: Math.round(oeTorqueCurve),
      estTorque: Math.round(estTorqueCurve),
      boost: Number(boost.toFixed(2)),
      afr: Number(afr.toFixed(1)),
    });
  }

  const peaks = {
    estPowerHp: targetHp,
    estPowerRpm: estPeakRpm,
    estTorqueNm: targetTorque,
    estTorqueRpm: torquePeakRpm + 200,
    peakBoostBar: buildType === "Turbo" || buildType === "Supercharged" ? 0.85 : 0,
    maxAfr: "11.6 : 1",
    redlineRpm,
  };

  const { axes, overall } = readinessForBuild(buildType, budgetLevel);
  const powerGainHp = targetHp - oeHp;
  const powerGainPct = oeHp > 0 ? Math.round((powerGainHp / oeHp) * 100) : 0;
  const torqueGainNm = targetTorque - oeTorque;
  const torqueGainPct = oeTorque > 0 ? Math.round((torqueGainNm / oeTorque) * 100) : 0;
  const powerToWeight = targetHp > 0 && weightKg > 0 ? Number((weightKg / targetHp).toFixed(2)) : 0;
  const powerToWeightTarget =
    targetHp > 0 && weightKg > 0 ? Number((weightKg / (targetHp * 1.05)).toFixed(1)) : 0;

  const loadBase = Math.min(92, 52 + powerGainPct * 0.18 + (buildType === "Turbo" ? 8 : 0));

  return {
    oeHp,
    oeTorque,
    targetHp,
    targetTorque,
    dynoHp,
    weightKg,
    redlineRpm,
    points,
    peaks,
    readiness: axes,
    overallReadinessPct: overall,
    powerGainHp,
    powerGainPct,
    torqueGainNm,
    torqueGainPct,
    powerToWeight,
    powerToWeightTarget,
    drivetrainLoadPct: Math.round(loadBase),
    wheelTorqueNm: Math.round(targetTorque * 3.6),
    clutchLoadPct: Math.min(96, Math.round(loadBase + 8)),
    gearboxLoadPct: Math.min(92, Math.round(loadBase - 4)),
  };
}

export function tooltipAtRpm(
  model: PerformanceCurveModel,
  rpm: number,
): { power: number; torque: number; boost: number; afr: number } | null {
  const pt = model.points.reduce((best, p) =>
    Math.abs(p.rpm - rpm) < Math.abs(best.rpm - rpm) ? p : best,
  );
  return { power: pt.estPower, torque: pt.estTorque, boost: pt.boost, afr: pt.afr };
}
