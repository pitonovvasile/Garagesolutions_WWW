import type { GarageOptimizationPriorities } from "../data/garageOptimizationPriorities";
import type { VehicleFooterAeroManual } from "../data/vehicleFooterTechnicalManual";

export type AeroRiskLevel = "Low" | "Medium" | "High" | "Good";

export type AeroSummarySnapshot = {
  frontDownforceN: number;
  rearDownforceN: number;
  totalDownforceN: number;
  frontBalancePct: number;
  rearBalancePct: number;
  dragImpactPct: number;
  coolingScorePct: number;
  clearanceRisk: AeroRiskLevel;
  stabilityScore: AeroRiskLevel;
  rideHeightSensitivity: AeroRiskLevel;
  rakeSensitivity: AeroRiskLevel;
};

function parseNum(raw: string, fallback = 0): number {
  const n = Number(String(raw).replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : fallback;
}

function rhSensLevel(value: number): AeroRiskLevel {
  if (value >= 2) return "High";
  if (value >= 1) return "Medium";
  return "Low";
}

function stabilityFromBalance(frontPct: number): AeroRiskLevel {
  if (frontPct >= 35 && frontPct <= 45) return "Good";
  if (frontPct >= 30 && frontPct <= 50) return "Medium";
  return "High";
}

/** Derive footer aero summary metrics from manual aero inputs + workspace priorities. */
export function buildAeroSummarySnapshot(
  aero: VehicleFooterAeroManual,
  priorities: GarageOptimizationPriorities,
): AeroSummarySnapshot {
  const front = parseNum(aero.frontDownforceN);
  const rear = parseNum(aero.rearDownforceN);
  const total = parseNum(aero.totalDownforceN, front + rear) || front + rear;
  const frontBalancePct = total > 0 ? Math.round((front / total) * 100) : parseNum(aero.aeroBalancePct, 50);
  const rearBalancePct = Math.max(0, 100 - frontBalancePct);
  const rh = parseNum(aero.rideHeightSensPctPerMm);

  const dragImpactPct = Math.max(0, Math.round(12 - priorities.aeroEfficiency / 12));

  return {
    frontDownforceN: front,
    rearDownforceN: rear,
    totalDownforceN: total,
    frontBalancePct,
    rearBalancePct,
    dragImpactPct,
    coolingScorePct: priorities.cooling,
    clearanceRisk: rh >= 2.5 ? "High" : rh >= 1.5 ? "Medium" : "Low",
    stabilityScore: stabilityFromBalance(frontBalancePct),
    rideHeightSensitivity: rhSensLevel(rh),
    rakeSensitivity: frontBalancePct < 40 || frontBalancePct > 48 ? "Medium" : "Low",
  };
}

export function aeroRiskTone(level: AeroRiskLevel): "good" | "warn" | "bad" | "neutral" {
  switch (level) {
    case "Good":
    case "Low":
      return "good";
    case "Medium":
      return "warn";
    case "High":
      return "bad";
    default:
      return "neutral";
  }
}
