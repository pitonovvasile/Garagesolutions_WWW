import type { AeroBodyComponentRow } from "../data/aeroBodyComponents";
import type { VehicleArchitectureManual } from "../data/vehicleArchitectureManual";
import type { VehicleMassManual } from "../data/vehicleDimensionsMassManual";
import { parseWeightDistributionFr, totalMassKgFromManual } from "../engine/manualParsers";

const FRONT_AXLE_IDS = new Set(["hood", "front-bumper", "front-splitter", "front-fenders"]);
const REAR_AXLE_IDS = new Set(["rear-bumper", "rear-diffuser", "trunk", "spoiler", "rear-fenders"]);

function effectiveWeight(row: AeroBodyComponentRow, mode: "current" | "target"): number {
  if (mode === "current") {
    if (row.installStatus !== "installed" || row.weightKg == null) return 0;
    return row.weightPerSide ? row.weightKg * 2 : row.weightKg;
  }
  if (row.installStatus === "installed") {
    if (row.weightKg == null) return 0;
    return row.weightPerSide ? row.weightKg * 2 : row.weightKg;
  }
  if (row.upgradePlan === "planned" && row.planWeightKg != null) {
    return row.planWeightPerSide ? row.planWeightKg * 2 : row.planWeightKg;
  }
  return 0;
}

function axleSplit(id: string, weight: number): { front: number; rear: number } {
  if (FRONT_AXLE_IDS.has(id)) return { front: weight, rear: 0 };
  if (REAR_AXLE_IDS.has(id)) return { front: 0, rear: weight };
  return { front: weight * 0.45, rear: weight * 0.55 };
}

function sumTrackedBodyPanelsKg(components: AeroBodyComponentRow[], mode: "current" | "target"): number {
  let total = 0;
  for (const row of components) {
    total += effectiveWeight(row, mode);
  }
  return total;
}

function balanceFromComponents(components: AeroBodyComponentRow[]): { frontPct: number; rearPct: number } {
  let front = 0;
  let rear = 0;
  for (const row of components) {
    const w = effectiveWeight(row, "current");
    const ax = axleSplit(row.id, w);
    front += ax.front;
    rear += ax.rear;
  }
  const total = front + rear;
  if (total <= 0) return { frontPct: 50, rearPct: 50 };
  return {
    frontPct: Math.round((front / total) * 1000) / 10,
    rearPct: Math.round((rear / total) * 1000) / 10,
  };
}

export type VehicleMassReferenceSource = "measured" | "curb" | "missing";

export function resolveVehicleMassReference(mass: VehicleMassManual): {
  massKg: number | null;
  source: VehicleMassReferenceSource;
  sourceLabel: string;
} {
  const totalTrim = String(mass.totalWeightKg).trim();
  const measured = totalMassKgFromManual(mass);
  if (totalTrim !== "" && measured != null) {
    return { massKg: measured, source: "measured", sourceLabel: "User measured" };
  }
  if (measured != null) {
    return { massKg: measured, source: "curb", sourceLabel: "Curb + fuel (OEM)" };
  }
  return { massKg: null, source: "missing", sourceLabel: "—" };
}

export type AeroBodyWeightImpact = {
  /** Masa vehicul din Vehicle Data (măsurată sau curb+fuel). */
  vehicleReferenceMassKg: number | null;
  vehicleMassSource: VehicleMassReferenceSource;
  vehicleMassSourceLabel: string;
  /** Sumă greutăți panouri caroserie instalate (doar referință). */
  trackedBodyPanelsKg: number;
  potentialSavingsKg: number;
  frontAxleChangeKg: number;
  rearAxleChangeKg: number;
  frontBalancePct: number;
  rearBalancePct: number;
  cgImpact: string;
  balanceImpact: string;
};

export function buildAeroBodyWeightImpact(
  components: AeroBodyComponentRow[],
  vehicleMass: VehicleMassManual,
  vehicleArch: VehicleArchitectureManual,
): AeroBodyWeightImpact {
  const vehicleRef = resolveVehicleMassReference(vehicleMass);
  const trackedCurrent = sumTrackedBodyPanelsKg(components, "current");
  const trackedTarget = sumTrackedBodyPanelsKg(components, "target");

  let currentFront = 0;
  let currentRear = 0;
  let targetFront = 0;
  let targetRear = 0;

  for (const row of components) {
    const cur = effectiveWeight(row, "current");
    const tgt = effectiveWeight(row, "target");
    const curAx = axleSplit(row.id, cur);
    const tgtAx = axleSplit(row.id, tgt);
    currentFront += curAx.front;
    currentRear += curAx.rear;
    targetFront += tgtAx.front;
    targetRear += tgtAx.rear;
  }

  const savings = trackedTarget - trackedCurrent;
  const frontDelta = targetFront - currentFront;
  const rearDelta = targetRear - currentRear;

  const dist = parseWeightDistributionFr(vehicleArch.weightDistribution);
  const componentBal = balanceFromComponents(components);
  const frontBal = dist
    ? Math.round(dist.front * 1000) / 10
    : componentBal.frontPct;
  const rearBal = dist
    ? Math.round(dist.rear * 1000) / 10
    : componentBal.rearPct;

  const targetFrontBal =
    trackedTarget > 0 ? (targetFront / trackedTarget) * 100 : frontBal;
  const balShift = targetFrontBal - frontBal;

  let cgImpact = "Neutral";
  if (savings < -2) cgImpact = "Slightly Lower";
  else if (savings > 2) cgImpact = "Slightly Higher";

  let balanceImpact = "Neutral";
  if (balShift < -1) balanceImpact = "Slightly Rear";
  else if (balShift > 1) balanceImpact = "Slightly Front";

  return {
    vehicleReferenceMassKg:
      vehicleRef.massKg != null ? Math.round(vehicleRef.massKg * 10) / 10 : null,
    vehicleMassSource: vehicleRef.source,
    vehicleMassSourceLabel: vehicleRef.sourceLabel,
    trackedBodyPanelsKg: Math.round(trackedCurrent * 10) / 10,
    potentialSavingsKg: Math.round(savings * 10) / 10,
    frontAxleChangeKg: Math.round(frontDelta * 10) / 10,
    rearAxleChangeKg: Math.round(rearDelta * 10) / 10,
    frontBalancePct: frontBal,
    rearBalancePct: rearBal,
    cgImpact,
    balanceImpact,
  };
}

export function formatSignedKg(value: number): string {
  if (value === 0) return "0 kg";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value} kg`;
}
