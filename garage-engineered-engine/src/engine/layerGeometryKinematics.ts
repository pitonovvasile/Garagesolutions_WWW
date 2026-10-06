import type { AxlePreset } from "../lib/vehicleTypes";
import type { VehiclePointMap } from "../lib/vehicleTypes";
import {
  analyzeAxle,
  applyBumpTravel,
  camberGainRateDegPerMm,
  classifyCamberGainRate,
  sampleCamberVsTravel,
} from "../lib/vehicleKinematics";
import type { KinematicsTraceForAxle } from "./vehicleDynamicsTypes";

export function buildKinematicsTraceForAxle(
  end: "front" | "rear",
  basePts: VehiclePointMap,
  livePts: VehiclePointMap,
  axle: AxlePreset,
  springRateNmm: number,
  damperLinearCoeff: number,
  travelMm: number,
): KinematicsTraceForAxle {
  const kin = analyzeAxle(basePts, livePts, axle, springRateNmm, damperLinearCoeff, travelMm);
  const gain = camberGainRateDegPerMm(basePts, axle, travelMm);
  const gainClass = classifyCamberGainRate(gain);
  const chart = sampleCamberVsTravel(basePts, axle, -50, 50, 36);

  const topKey = axle.camberTop;
  const botKey = axle.camberBottom;

  return {
    axle: end,
    camberDeg: {
      value: kin.camberDeg,
      display: `${kin.camberDeg.toFixed(2)}°`,
      source: "derived",
      simulated: true,
      formula: "atan2(top.x - bottom.x, top.y - bottom.y) * 180/π",
      inputs: `travelMm=${travelMm}, top=${topKey}, bottom=${botKey}`,
      confidence: "medium",
      explanation:
        "Camber din punctele preset după `applyBumpTravel` — geometric live, diferit de valorile OEM declarate în tabel.",
    },
    camberGainDegPerMm: {
      value: gain,
      display: `${gain.toFixed(4)} °/mm`,
      source: "derived",
      simulated: true,
      formula: "(camber(travel+h) − camber(travel−h)) / (2h), h=3 mm",
      inputs: `travelMm=${travelMm}`,
      confidence: "medium",
      explanation: "Pantă locală camber vs travel în jurul cursorului — derivată din aceeași geometrie bump.",
    },
    camberGainClass: {
      value: `${gainClass} (${Math.abs(gain).toFixed(4)} °/mm)`,
      source: "estimated",
      simulated: false,
      formula: "threshold bands on |d(camber)/d(travel)|",
      inputs: `|rate|=${Math.abs(gain).toFixed(5)}`,
      confidence: "low",
      explanation: "Clasificare euristică (low / moderate / aggressive), nu model de contact anvelope.",
    },
    springLengthMm: {
      value: kin.springLengthMm,
      display: kin.springLengthMm != null ? `${kin.springLengthMm.toFixed(1)} mm` : "—",
      source: "derived",
      simulated: true,
      formula: "distance(spring_mount_chassis, spring_mount_arm) on live points",
      inputs: `travelMm=${travelMm}`,
      confidence: kin.springLengthMm != null ? "medium" : "n/a",
      explanation: "Lungime coardă 2D pe hardpoint-uri după bump — nu include deformări elastice.",
    },
    damperLengthMm: {
      value: kin.damperLengthMm,
      display: kin.damperLengthMm != null ? `${kin.damperLengthMm.toFixed(1)} mm` : "—",
      source: "derived",
      simulated: true,
      formula: "distance(damper_mount_chassis, damper_mount_arm) on live points",
      inputs: `travelMm=${travelMm}, layout=${axle.layout}`,
      confidence: kin.damperLengthMm != null ? "medium" : "n/a",
      explanation: "Lungime amortizor din geometrie live unde punctele există.",
    },
    mrSpring: {
      value: kin.mrSpring,
      display: kin.mrSpring.toFixed(4),
      source: "derived",
      simulated: true,
      formula: "(L_spring(travel+Δ) − L_spring(travel)) / Δ, Δ=0.25 mm",
      inputs: `travelMm=${travelMm}`,
      confidence: "medium",
      explanation: "MR resort din diferențe finite pe modelul bump vertical — nu analiză instant center completă.",
    },
    mrDamper: {
      value: kin.mrDamper,
      display: kin.mrDamper.toFixed(4),
      source: "derived",
      simulated: true,
      formula:
        axle.layout === "coilover"
          ? "same chord as spring (coilover path)"
          : "(L_damper(travel+Δ) − L_damper(travel)) / Δ, Δ=0.25 mm",
      inputs: `travelMm=${travelMm}, layout=${axle.layout}`,
      confidence: "medium",
      explanation: "MR amortizor distinct față de resort când layout=separate; altfel partajat pe coilover.",
    },
    wheelRateNmm: {
      value: kin.wheelRateNmm,
      display: `${kin.wheelRateNmm.toFixed(1)} N/mm`,
      source: "estimated",
      simulated: false,
      formula: "springRateNmm * mrSpring²",
      inputs: `springRateNmm=${springRateNmm}, mrSpring=${kin.mrSpring.toFixed(4)}`,
      confidence: "low",
      explanation: "Scalare statică simplificată — fără rigiditate articulații / bare transversale.",
    },
    dampingAtWheelRel: {
      value: kin.dampingAtWheel,
      display: kin.dampingAtWheel.toFixed(3),
      source: "estimated",
      simulated: false,
      formula: "damperLinearCoeff * mrDamper²",
      inputs: `coeff=${damperLinearCoeff}, mrDamper=${kin.mrDamper.toFixed(4)}`,
      confidence: "low",
      explanation: "Indice relativ scalat cu MR² — nu forță amortizor sau curgere ulei.",
    },
    camberVsTravelChart: chart,
  };
}

export function liveForAxle(base: VehiclePointMap, travelMm: number): VehiclePointMap {
  return applyBumpTravel(base, travelMm);
}
