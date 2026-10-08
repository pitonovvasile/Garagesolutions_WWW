import type { PerformanceCurveModel } from "./performanceCurveModel";
import type { PerformanceOeBaseline } from "./performanceOeBaseline";
import {
  buildPerformanceSubsystemPanels,
  readinessStatusClass,
  type PerformanceSubsystemPanel,
  type ReadinessTone,
} from "./performanceSystemReadiness";
import type { PerformanceBuildType, PerformanceReliability } from "../store/performanceStore";

export type LimitingSystemItem = {
  rank: number;
  name: string;
  status: string;
  tone: ReadinessTone;
};

export type PriorityPartItem = {
  label: string;
  optionCount: number;
};

export type PerformanceSetupAssistantModel = {
  targetSummary: string;
  reliability: string;
  verdictMessage: string;
  verdictProgressPct: number;
  verdictAchievable: boolean;
  limitingSystems: LimitingSystemItem[];
  criticalParts: PriorityPartItem[];
  recommendedParts: PriorityPartItem[];
};

const LIMITING_MAP: Record<
  string,
  { status: string; tone: ReadinessTone; rank: number }
> = {
  fuel: { status: "INSUFFICIENT", tone: "critical", rank: 1 },
  ecu: { status: "REQUIRED", tone: "critical", rank: 2 },
  sensors: { status: "REQUIRED", tone: "critical", rank: 3 },
  cooling: { status: "RECOMMENDED", tone: "good", rank: 4 },
  drivetrain: { status: "BORDERLINE", tone: "borderline", rank: 5 },
};

function limitingFromPanel(panel: PerformanceSubsystemPanel): LimitingSystemItem | null {
  const rule = LIMITING_MAP[panel.id];
  if (!rule) return null;
  if (panel.id === "drivetrain" && panel.status.tone !== "borderline" && panel.status.tone !== "upgrade") {
    return null;
  }
  if (panel.id === "cooling" && panel.status.tone === "good") {
    return { rank: rule.rank, name: panel.title, status: rule.status, tone: rule.tone };
  }
  if (panel.id === "fuel" || panel.id === "ecu" || panel.id === "sensors") {
    return { rank: rule.rank, name: panel.title, status: rule.status, tone: rule.tone };
  }
  if (panel.id === "drivetrain") {
    return { rank: rule.rank, name: "Clutch", status: rule.status, tone: rule.tone };
  }
  if (panel.id === "cooling" && panel.status.tone !== "inactive") {
    return { rank: rule.rank, name: panel.title, status: rule.status, tone: rule.tone };
  }
  return null;
}

function buildPriorityParts(
  buildType: PerformanceBuildType,
  targetHp: number,
  turbo: boolean,
): { critical: PriorityPartItem[]; recommended: PriorityPartItem[] } {
  const injectorSize = turbo ? (targetHp >= 400 ? "1000cc+" : "750cc+") : "550cc+";
  const pumpFlow = turbo ? "340 lph+" : "220 lph+";

  const critical: PriorityPartItem[] = [
    { label: `Injectors ${injectorSize}`, optionCount: turbo ? 3 : 2 },
    { label: `Fuel Pump ${pumpFlow}`, optionCount: turbo ? 4 : 3 },
    { label: "Wideband Lambda", optionCount: 6 },
  ];

  if (turbo) {
    critical.push({ label: "3 Bar MAP Sensor", optionCount: 5 });
  }

  const recommended: PriorityPartItem[] = [];
  if (turbo) {
    recommended.push({ label: "Intercooler Upgrade", optionCount: 8 });
  }
  recommended.push(
    { label: "ECU Calibration / Standalone", optionCount: 7 },
    { label: "Clutch Upgrade", optionCount: 5 },
  );
  if (turbo || buildType === "Hybrid") {
    recommended.push({ label: "Oil Cooler", optionCount: 6 });
  }

  return { critical, recommended };
}

export function buildPerformanceSetupAssistant(input: {
  model: PerformanceCurveModel;
  baseline: PerformanceOeBaseline;
  buildType: PerformanceBuildType;
  fuel: string;
  reliability: PerformanceReliability;
  targetHp: number;
}): PerformanceSetupAssistantModel {
  const { model, baseline, buildType, fuel, reliability, targetHp } = input;
  const turbo = buildType === "Turbo" || buildType === "Supercharged";

  const panels = buildPerformanceSubsystemPanels({ model, baseline, buildType, fuel, reliability });
  const limitingSystems = panels
    .map(limitingFromPanel)
    .filter((x): x is LimitingSystemItem => x != null)
    .sort((a, b) => a.rank - b.rank);

  const { critical, recommended } = buildPriorityParts(buildType, targetHp, turbo);

  const achievable = model.overallReadinessPct >= 55;
  const verdictMessage = achievable
    ? "Target achievable with upgrades"
    : "Target needs major system upgrades";

  return {
    targetSummary: `${targetHp} hp · ${model.targetTorque} Nm · ${buildType} · ${fuel}`,
    reliability,
    verdictMessage,
    verdictProgressPct: model.overallReadinessPct,
    verdictAchievable: achievable,
    limitingSystems,
    criticalParts: critical,
    recommendedParts: recommended,
  };
}

export { readinessStatusClass };
