import type { VehicleArchitectureManual } from "../data/vehicleArchitectureManual";
import type { SetupAssistantSection, TracedText } from "./vehicleDynamicsTypes";

export function synthesizeSetupAssistant(input: {
  arch: VehicleArchitectureManual;
  rollFrontFrac: number | null;
  liveCamberDeg: number;
  differential: string;
  tireType: string;
  aeroFrontBal: number | null;
  springRateNmm: number;
  damperCoeff: number;
}): SetupAssistantSection {
  let u = 0;
  let o = 0;
  if (input.arch.drivetrain === "FWD") u += 2;
  if (input.arch.drivetrain === "RWD") o += 1;
  if (input.rollFrontFrac != null && input.rollFrontFrac > 0.54) u += 2;
  if (input.rollFrontFrac != null && input.rollFrontFrac < 0.46) o += 2;
  if (input.liveCamberDeg < -2.8) o += 1;
  if (input.liveCamberDeg > -0.3 && input.liveCamberDeg < 0.4) u += 1;
  const diffL = input.differential.toLowerCase();
  if (diffL.includes("weld")) o += 2;
  if (diffL.includes("limited")) o += 1;
  const tireL = input.tireType.toLowerCase();
  if (tireL.includes("semi") || tireL.includes("slick")) o += 1;
  if (input.aeroFrontBal != null && input.aeroFrontBal > 0.56) u += 1;
  if (input.aeroFrontBal != null && input.aeroFrontBal < 0.44) o += 1;

  const us = Math.min(5, u);
  const os = Math.min(5, o);
  const bias =
    us > os + 1 ? "Understeer tendency: higher" : os > us + 1 ? "Oversteer / rotation tendency: higher" : "Understeer / oversteer tendency: balanced (coarse)";

  const stability: TracedText = {
    value:
      input.arch.layout.includes("Front") && input.arch.enginePosition.includes("Front")
        ? "Stability: medium-high (front mass bias)"
        : input.arch.layout.includes("Mid")
          ? "Stability: medium (quick yaw response)"
          : "Stability: context-dependent (check architecture table)",
    source: "estimated",
    simulated: false,
    formula: "weighted heuristics on architecture strings",
    inputs: `${input.arch.layout}, ${input.arch.enginePosition}`,
    confidence: "low",
    explanation: "Stabilitate percepută calitativă — nu simulare.",
  };

  const traction: TracedText = {
    value:
      diffL.includes("limited") || diffL.includes("weld")
        ? "Traction: good potential (diff helps transfer)"
        : "Traction: moderate (open diff traction split sensitivity)",
    source: "estimated",
    simulated: false,
    formula: "diff string heuristics",
    inputs: input.differential,
    confidence: "low",
    explanation: "Fără model aderență suprafață.",
  };

  const rotationTendency: TracedText = {
    value:
      os >= 3
        ? "Rotation tendency: sharp (geometry + tire + aero cues)"
        : os <= 1
          ? "Rotation tendency: mild"
          : "Rotation tendency: moderate",
    source: "estimated",
    simulated: false,
    formula: "aggregate oversteer cues",
    inputs: `osScore=${os}`,
    confidence: "low",
    explanation: "Scoruri discrete — nu yaw rate.",
  };

  const steeringResponse: TracedText = {
    value:
      input.springRateNmm >= 46 && input.damperCoeff >= 1.1
        ? "Steering response: crisp (stiffer vertical stack in session inputs)"
        : "Steering response: moderate (softer vertical stack in session inputs)",
    source: "estimated",
    simulated: false,
    formula: "thresholds on springRateNmm and damper coeff",
    inputs: `k=${input.springRateNmm}, c=${input.damperCoeff}`,
    confidence: "low",
    explanation: "Proxy percepție — fără mapă direcție.",
  };

  const responsiveness: TracedText = {
    value:
      tireL.includes("slick") || tireL.includes("semi")
        ? "Responsiveness: high (grippy tire class sharpens transient response)"
        : "Responsiveness: moderate (street-biased tire class in footer)",
    source: "estimated",
    simulated: false,
    formula: "tireType string heuristics",
    inputs: input.tireType,
    confidence: "low",
    explanation: "Separat de direcție — se referă la construirea forțe laterală percepută.",
  };

  const compliance: TracedText = {
    value:
      input.springRateNmm < 38
        ? "Compliance: higher (softer springs in session)"
        : input.springRateNmm > 48
          ? "Compliance: lower (firmer springs in session)"
          : "Compliance: medium",
    source: "estimated",
    simulated: false,
    formula: "bands on springRateNmm",
    inputs: String(input.springRateNmm),
    confidence: "low",
    explanation: "Nu include caroserie / cauciucuri.",
  };

  const confidence: TracedText = {
    value: "Confidence in synthesis: low — rule stack only, no tire forces or lap model.",
    source: "estimated",
    simulated: false,
    formula: "n/a",
    inputs: "aggregate heuristics",
    confidence: "low",
    explanation: "Transparență: acest rezumat nu echivalează date pe circuit.",
  };

  const tireWearRisk: TracedText = {
    value:
      input.liveCamberDeg < -3.6
        ? "Tire wear risk: higher (aggressive negative camber in live sketch)"
        : input.liveCamberDeg < -2.2
          ? "Tire wear risk: moderate (track-biased camber band)"
          : "Tire wear risk: lower (milder camber band in sketch)",
    source: "estimated",
    simulated: false,
    formula: "bands on live camberDeg",
    inputs: String(input.liveCamberDeg),
    confidence: "low",
    explanation: "Nu include toe sau presiune.",
  };

  const understeerOversteer: TracedText = {
    value: bias,
    source: "estimated",
    simulated: false,
    formula: "compare understeerScore vs oversteerScore heuristics",
    inputs: `u=${us}, o=${os}`,
    confidence: "low",
    explanation: "Balans șasiu sintetic — verifică pe circuit / telemetrie.",
  };

  const summaryLines = [
    understeerOversteer.value,
    stability.value,
    traction.value,
    rotationTendency.value,
    steeringResponse.value,
    responsiveness.value,
    compliance.value,
    tireWearRisk.value,
    confidence.value,
  ];

  return {
    understeerOversteer,
    stability,
    traction,
    responsiveness,
    compliance,
    confidence,
    tireWearRisk,
    steeringResponse,
    rotationTendency,
    summaryLines,
  };
}
