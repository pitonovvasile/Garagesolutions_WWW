import type { VehicleFooterAeroManual } from "../data/vehicleFooterTechnicalManual";
import { parseNonNegFloat } from "./manualParsers";
import type { AeroSection, TracedScalar, TracedText } from "./vehicleDynamicsTypes";

export function computeAeroSection(a: VehicleFooterAeroManual): AeroSection {
  const f = parseNonNegFloat(a.frontDownforceN);
  const r = parseNonNegFloat(a.rearDownforceN);
  const tManual = parseNonNegFloat(a.totalDownforceN);
  const t = tManual != null ? tManual : f != null && r != null ? f + r : null;

  let bal: number | null = null;
  if (t != null && t > 0 && f != null) bal = f / t;
  else if (t != null && t > 0 && f != null && r != null) bal = f / (f + r);

  const frontAeroBalance: TracedScalar = {
    value: bal,
    display: bal != null ? `${(bal * 100).toFixed(1)}% front` : "—",
    source: "declared",
    simulated: false,
    formula: "frontDownforce / totalDownforce (manual fields)",
    inputs: `front=${a.frontDownforceN}, rear=${a.rearDownforceN}, total=${a.totalDownforceN}`,
    confidence: t != null && t > 0 ? "medium" : "n/a",
    explanation: "Balans aero static din valori introduse — fără CFD sau mapă viteză.",
  };

  const rideSens = parseNonNegFloat(a.rideHeightSensPctPerMm);
  const pitchSensitivity: TracedText = {
    value:
      rideSens != null && rideSens > 2
        ? "Higher declared ride-height sensitivity: aero balance may feel more pitch-sensitive as rake changes."
        : "Moderate/low declared ride-height sensitivity in manual field — pitch effects still not dynamically simulated.",
    source: "declared",
    simulated: false,
    formula: "qualitative threshold on rideHeightSensPctPerMm",
    inputs: a.rideHeightSensPctPerMm,
    confidence: "low",
    explanation: "Nu este simulată dinamica longitudinală — doar interpretare pe scalar manual.",
  };

  const stabilityModifiers: TracedText = {
    value:
      bal != null && bal > 0.55
        ? "More front downforce bias: tends to stabilize entry and front grip perception."
        : bal != null && bal < 0.45
          ? "More rear downforce bias: tends to stabilize traction exits and rear confidence."
          : "Near-neutral aero balance in manual numbers — combine with ride height and rake context mentally.",
    source: "estimated",
    simulated: false,
    formula: "bands on frontAeroBalance",
    inputs: frontAeroBalance.display,
    confidence: "low",
    explanation: "Aero outputs remain estimates versus on-track aero map.",
  };

  return {
    frontAeroBalance,
    pitchSensitivity,
    stabilityModifiers,
  };
}
