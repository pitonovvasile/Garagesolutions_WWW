import type { VehicleFooterDrivetrainManual } from "../data/vehicleFooterTechnicalManual";
import type { VehicleArchitectureManual } from "../data/vehicleArchitectureManual";
import { parseGearAggressivenessScore, parsePercentToken } from "./manualParsers";
import type { DrivetrainSection, TracedText } from "./vehicleDynamicsTypes";

function diffText(d: string): string {
  const x = d.toLowerCase();
  if (x.includes("open")) return "Open differential: predictable breakaway but inside-wheel spin risk under split traction.";
  if (x.includes("limited")) return "Limited slip: better traction transfer and stronger corner-exit behavior vs open.";
  if (x.includes("weld")) return "Welded / locked: maximum lock and traction transfer bias; harsh turn-in, tire scrub risk.";
  return "Differential type not classified — check manual selection.";
}

function transText(t: string): string {
  const x = t.toLowerCase();
  if (x.includes("manual")) return "Manual: direct driver control; driveline shock possible on aggressive shifts.";
  if (x.includes("sequential")) return "Sequential: faster shifts, sharper torque reapplication.";
  if (x.includes("automatic")) return "Automatic: smoother transitions, softer throttle edges.";
  if (x.includes("dct")) return "DCT / semi-auto: fast shifts with relatively stable torque handoff.";
  return "Transmission behavior: use manual selection as context only.";
}

function lockText(pct: number | null): string {
  if (pct == null) return "Lock percentage not parsed — use LSD notes qualitatively.";
  if (pct < 35) return "Lower lock %: milder traction transfer, closer to open diff manners.";
  if (pct < 65) return "Mid lock %: stronger traction transfer with moderate power-on steer effects.";
  return "High lock %: aggressive traction transfer, more power-oversteer tendency, harsher driveline.";
}

export function computeDrivetrainSection(
  d: VehicleFooterDrivetrainManual,
  arch: VehicleArchitectureManual,
): DrivetrainSection {
  const lockPct = parsePercentToken(d.lockPercentage);
  const gearScore = parseGearAggressivenessScore(d.finalDrive, d.gearRatio1);

  const differentialBehavior: TracedText = {
    value: diffText(d.differential),
    source: "declared",
    simulated: false,
    formula: "rule map on differential string",
    inputs: d.differential,
    confidence: "low",
    explanation: "Comportament calitativ — fără model cuplu diferențial.",
  };

  const lockEffect: TracedText = {
    value: lockText(lockPct),
    source: lockPct != null ? "declared" : "placeholder",
    simulated: false,
    formula: "threshold bands on parsed lock %",
    inputs: d.lockPercentage,
    confidence: "low",
    explanation: "Procentaj declarat din footer — fără mapare cuplu.",
  };

  const gearAggressiveness: TracedText = {
    value:
      gearScore == null
        ? "—"
        : gearScore > 11.5
          ? "Shorter overall gearing feel: more aggressive acceleration response, higher traction sensitivity."
          : "Longer overall gearing feel: smoother delivery, less aggressive tip-in.",
    source: gearScore != null ? "estimated" : "placeholder",
    simulated: false,
    formula: "proxy = finalDrive * gearRatio1 (higher → shorter effective gearing feel)",
    inputs: `finalDrive=${d.finalDrive}, gear1=${d.gearRatio1}`,
    confidence: "low",
    explanation: "Proxy scalar — nu include masa vehiculului sau pierderi.",
  };

  const transmissionBehavior: TracedText = {
    value: transText(d.transmissionType),
    source: "declared",
    simulated: false,
    formula: "rule map on transmission type string",
    inputs: d.transmissionType,
    confidence: "low",
    explanation: "Interpretare șofer — nu latență schimbător simulată.",
  };

  const drivetrainBias: TracedText = {
    value:
      arch.drivetrain === "FWD"
        ? "FWD bias: front axle saturation under combined grip + power; understeer tendency under power."
        : arch.drivetrain === "RWD"
          ? "RWD bias: rear axle traction sets limit for exits; friendlier rotation if rear grip is managed."
          : arch.drivetrain === "AWD" || arch.drivetrain === "4WD"
            ? "AWD/4WD bias: traction advantage with added understeer feel when front axle is loaded."
            : "Drivetrain bias: unspecified.",
    source: "estimated",
    simulated: false,
    formula: "architecture drivetrain string heuristics",
    inputs: arch.drivetrain,
    confidence: "low",
    explanation: "Reguli arhitectură — nu tren de rulare simulat.",
  };

  const tractionSummary: TracedText = {
    value: [differentialBehavior.value, lockEffect.value].join(" "),
    source: "estimated",
    simulated: false,
    formula: "combine diff + lock heuristics",
    inputs: `${d.differential}, ${d.lockPercentage}`,
    confidence: "low",
    explanation: "Sumar tracțiune calitativ.",
  };

  const powerDeliverySummary: TracedText = {
    value: [transmissionBehavior.value, gearAggressiveness.value === "—" ? "" : gearAggressiveness.value]
      .filter(Boolean)
      .join(" "),
    source: "estimated",
    simulated: false,
    formula: "transmission + gearing proxy",
    inputs: `${d.transmissionType}, ${d.finalDrive}`,
    confidence: "low",
    explanation: "Livrare putere percepție — nu dyno.",
  };

  return {
    differentialBehavior,
    lockEffect,
    gearAggressiveness,
    transmissionBehavior,
    drivetrainBias,
    tractionSummary,
    powerDeliverySummary,
  };
}
