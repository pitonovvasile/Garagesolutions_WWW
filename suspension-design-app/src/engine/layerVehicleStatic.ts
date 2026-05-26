import type { VehicleArchitectureManual } from "../data/vehicleArchitectureManual";
import type { VehicleMassManual } from "../data/vehicleDimensionsMassManual";
import {
  G,
  parseWeightDistributionFr,
  parseUnsprungPairKg,
  totalMassKgFromManual,
} from "./manualParsers";
import type { TracedScalar, TracedText, VehicleStaticSection } from "./vehicleDynamicsTypes";

function archNote(a: VehicleArchitectureManual): string {
  const { layout, drivetrain, enginePosition } = a;
  const bits: string[] = [];
  if (layout.includes("Front") && enginePosition.includes("Front")) {
    bits.push("front-heavy / front-engine packaging tends toward stable straight-line behavior and understeer bias at the limit");
  }
  if (layout.includes("Rear")) {
    bits.push("rear-engine mass bias can add rotation and pendulum yaw sensitivity");
  }
  if (layout.includes("Mid")) {
    bits.push("mid-engine layouts often feel quick to rotate with high yaw response");
  }
  if (drivetrain === "AWD" || drivetrain === "4WD") {
    bits.push("AWD/4WD improves traction delivery but adds front packaging and steering-feel tradeoffs");
  }
  if (drivetrain === "FWD") {
    bits.push("FWD tends toward power-on understeer as the front axle carries both drive and steer");
  }
  if (drivetrain === "RWD") {
    bits.push("RWD separates steer and drive axles — rotation-friendly but rear traction sensitive on throttle");
  }
  return bits.length ? bits.join("; ") + "." : "Architecture inputs are neutral — add more specific layout/engine notes for richer guidance.";
}

export function computeVehicleStaticSection(
  arch: VehicleArchitectureManual,
  mass: VehicleMassManual,
): VehicleStaticSection {
  const dist = parseWeightDistributionFr(arch.weightDistribution);
  const mKg = totalMassKgFromManual(mass);

  const totalMassKg: TracedScalar = {
    value: mKg,
    display: mKg != null ? `${mKg.toFixed(1)} kg` : "—",
    source: mKg != null ? "declared" : "placeholder",
    simulated: false,
    formula: "totalWeightKg (manual) or curbWeightKg + fuelMassKg",
    inputs: `totalWeightKg=${mass.totalWeightKg}, curb=${mass.curbWeightKg}, fuelMass=${mass.fuelMassKg}`,
    confidence: mKg != null ? "medium" : "n/a",
    explanation:
      mKg != null
        ? "Masă totală din câmpurile manuale Vehicul — folosită pentru sarcini statice pe osie."
        : "Lipsesc valori numerice valide pentru masă totală.",
  };

  let frontAxleLoadN: TracedScalar;
  let rearAxleLoadN: TracedScalar;

  if (mKg != null && dist) {
    const fN = mKg * dist.front * G;
    const rN = mKg * dist.rear * G;
    frontAxleLoadN = {
      value: fN,
      display: `${(fN / 1000).toFixed(2)} kN`,
      source: "derived",
      simulated: false,
      formula: "totalMassKg * frontWeightFraction * g",
      inputs: `m=${mKg}, frontFrac=${dist.front.toFixed(3)}, g=${G}`,
      confidence: "medium",
      explanation: "Sarcină statică estimată pe puntea față din masă manuală și repartizare manuală.",
    };
    rearAxleLoadN = {
      value: rN,
      display: `${(rN / 1000).toFixed(2)} kN`,
      source: "derived",
      simulated: false,
      formula: "totalMassKg * rearWeightFraction * g",
      inputs: `m=${mKg}, rearFrac=${dist.rear.toFixed(3)}, g=${G}`,
      confidence: "medium",
      explanation: "Sarcină statică estimată pe puntea spate.",
    };
  } else {
    const ph = "—";
    frontAxleLoadN = {
      value: null,
      display: ph,
      source: "placeholder",
      simulated: false,
      formula: "totalMassKg * frontWeightFraction * g",
      inputs: `weightDistribution=${arch.weightDistribution}, massOk=${Boolean(mKg)}`,
      confidence: "n/a",
      explanation: "Nu se pot calcula sarcini pe osie fără masă totală validă și repartizare `a / b`.",
    };
    rearAxleLoadN = {
      value: null,
      display: ph,
      source: "placeholder",
      simulated: false,
      formula: "totalMassKg * rearWeightFraction * g",
      inputs: `weightDistribution=${arch.weightDistribution}, massOk=${Boolean(mKg)}`,
      confidence: "n/a",
      explanation: "Nu se pot calcula sarcini pe osie fără masă totală validă și repartizare `a / b`.",
    };
  }

  const balanceBias: TracedText = {
    value:
      dist != null
        ? `Front ${(dist.front * 100).toFixed(1)}% / rear ${(dist.rear * 100).toFixed(1)}%`
        : "—",
    source: dist != null ? "declared" : "placeholder",
    simulated: false,
    formula: "normalized split from manual weightDistribution string",
    inputs: arch.weightDistribution,
    confidence: dist != null ? "medium" : "n/a",
    explanation:
      dist != null
        ? "Bias static longitudinal din câmpul manual — nu include transfer lateral / longitudinal dinamic."
        : "Repartizare manuală invalidă sau lipsă.",
  };

  const architectureBehavior: TracedText = {
    value: archNote(arch),
    source: "estimated",
    simulated: false,
    formula: "rule-based heuristics from layout + drivetrain + enginePosition strings",
    inputs: `${arch.layout}, ${arch.drivetrain}, ${arch.enginePosition}`,
    confidence: "low",
    explanation: "Notă comportamentală calitativă — nu este simulare dinamică.",
  };

  const uns = parseUnsprungPairKg(mass.unsprungMassFrKg);
  const cornerWeights: TracedText = {
    value:
      mKg != null && dist != null && uns.front != null && uns.rear != null
        ? "Per-corner corner weights: not simulated — only axle-level static split and unsprung totals are available."
        : "Corner weights: not simulated — insufficient per-corner mass data (use axle loads as reference).",
    source: "placeholder",
    simulated: false,
    formula: "n/a (no per-corner sprung mass model)",
    inputs: `unsprungMassFrKg=${mass.unsprungMassFrKg}`,
    confidence: "n/a",
    explanation:
      "Aplicația nu distribuie sarcina pe fiecare colț; sarcinile pe osie mai sus sunt singura estimare numerică.",
  };

  return {
    totalMassKg,
    frontAxleLoadN,
    rearAxleLoadN,
    balanceBias,
    architectureBehavior,
    cornerWeights,
  };
}
