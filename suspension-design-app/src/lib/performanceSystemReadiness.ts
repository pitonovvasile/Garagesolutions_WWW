import type { PerformanceOeBaseline } from "./performanceOeBaseline";
import type { PerformanceCurveModel } from "./performanceCurveModel";
import type { PerformanceBuildType, PerformanceReliability } from "../store/performanceStore";

export type ReadinessTone = "good" | "upgrade" | "critical" | "inactive" | "borderline" | "neutral";

export type ReadinessRow = {
  label: string;
  value: string;
  tone?: "normal" | "warn" | "bad" | "muted";
};

export type PerformanceSubsystemPanel = {
  id: string;
  title: string;
  glyph: string;
  status: { label: string; tone: ReadinessTone };
  rows: ReadinessRow[];
  actionLabel: string;
};

const STATUS_CLASS: Record<ReadinessTone, string> = {
  good: "text-emerald-400",
  upgrade: "text-orange-400",
  critical: "text-red-400",
  inactive: "text-neutral-500",
  borderline: "text-amber-400",
  neutral: "text-neutral-400",
};

export function readinessStatusClass(tone: ReadinessTone): string {
  return STATUS_CLASS[tone];
}

export function buildPerformanceSubsystemPanels(input: {
  model: PerformanceCurveModel;
  baseline: PerformanceOeBaseline;
  buildType: PerformanceBuildType;
  fuel: string;
  reliability: PerformanceReliability;
}): PerformanceSubsystemPanel[] {
  const { model, baseline, buildType, fuel, reliability } = input;
  const compression = baseline.compressionRatio;
  const turbo = buildType === "Turbo" || buildType === "Supercharged";
  const targetBoost = model.peaks.peakBoostBar;
  const clutchRating = Math.round(model.oeTorque * 1.05);
  const ethActive = /e85|ethanol|flex/i.test(fuel);

  return [
    {
      id: "engine-internals",
      title: "Engine Internals",
      glyph: "⚙",
      status: { label: "Good", tone: "good" },
      rows: [
        { label: "Compression Ratio", value: compression },
        { label: "Pistons / Rods", value: turbo ? "Forged (rec.)" : "OEM" },
        { label: "Safe Power", value: `${Math.round(model.targetHp * 1.22)} hp` },
        { label: "Safe Torque", value: `${Math.round(model.targetTorque * 1.15)} Nm` },
        { label: "RPM Limit", value: baseline.redline !== "—" ? baseline.redline : "—" },
      ],
      actionLabel: "Details",
    },
    {
      id: "camshaft",
      title: "Camshaft & Timing",
      glyph: "⏱",
      status: { label: "Upgrade", tone: "upgrade" },
      rows: [
        { label: "Profile", value: reliability === "Track" ? "Track" : "Street Sport" },
        { label: "Intake Duration", value: turbo ? "264°" : "248°" },
        { label: "Exhaust Duration", value: turbo ? "272°" : "256°" },
        { label: "Lift", value: turbo ? "10.5 mm" : "9.7 mm" },
        { label: "Overlap", value: turbo ? "32°" : "18°" },
        { label: "Power Band", value: turbo ? "3500–6500 rpm" : "4200–7200 rpm" },
      ],
      actionLabel: "Cam comparison",
    },
    {
      id: "air-boost",
      title: "Air & Boost System",
      glyph: "💨",
      status: turbo ? { label: "Good", tone: "good" } : { label: "Upgrade", tone: "upgrade" },
      rows: turbo
        ? [
            { label: "Turbo", value: "GTX3076R (est.)" },
            { label: "Target Boost", value: `${targetBoost.toFixed(2)} bar` },
            { label: "Airflow", value: "620 kg/h" },
            { label: "Intercooler", value: "Required", tone: "bad" },
            { label: "Charge Pipe", value: "Upgrade" },
            { label: "BOV", value: "Recirc / VTA" },
          ]
        : [
            { label: "Intake", value: "Cold air (planned)" },
            { label: "Target Boost", value: "N/A" },
            { label: "Throttle", value: "OEM" },
            { label: "Intercooler", value: "N/A" },
          ],
      actionLabel: "Details",
    },
    {
      id: "fuel",
      title: "Fuel System",
      glyph: "⛽",
      status: { label: "Critical", tone: "critical" },
      rows: [
        { label: "Fuel Type", value: fuel },
        { label: "Injectors", value: "Insufficient", tone: "bad" },
        { label: "Required Injector Size", value: turbo ? "1000 cc/min" : "550 cc/min" },
        { label: "Fuel Pump", value: "Insufficient", tone: "bad" },
        { label: "Required Pump Flow", value: turbo ? "340 L/h" : "220 L/h" },
        { label: "Fuel Pressure", value: "req. 4.0 bar", tone: "bad" },
      ],
      actionLabel: "Fuel calculator",
    },
    {
      id: "ethanol",
      title: "Ethanol / E85",
      glyph: "🌿",
      status: ethActive ? { label: "Upgrade", tone: "upgrade" } : { label: "Not active", tone: "inactive" },
      rows: [
        { label: "Ethanol Readiness", value: ethActive ? "78%" : "42%" },
        { label: "Ethanol Sensor", value: ethActive ? "Installed" : "Missing", tone: ethActive ? "normal" : "bad" },
        { label: "Flex Fuel ECU", value: ethActive ? "Yes" : "No", tone: ethActive ? "normal" : "muted" },
        { label: "Flex Fuel Lines", value: ethActive ? "Yes" : "No", tone: ethActive ? "normal" : "muted" },
        { label: "Cold Start Strategy", value: ethActive ? "Mapped" : "No", tone: ethActive ? "normal" : "muted" },
      ],
      actionLabel: "Fuel calculator",
    },
    {
      id: "ecu",
      title: "ECU & Control",
      glyph: "🖥",
      status: { label: "Upgrade", tone: "upgrade" },
      rows: [
        { label: "ECU Type", value: "OE Limited" },
        { label: "Tune Required", value: "Yes", tone: "bad" },
        { label: "Boost Control", value: turbo ? "Limited" : "N/A", tone: turbo ? "warn" : "muted" },
        { label: "Launch Control", value: "No", tone: "muted" },
        { label: "Knock Control", value: "Limited", tone: "warn" },
        { label: "Datalogging", value: "No", tone: "muted" },
      ],
      actionLabel: "Details",
    },
    {
      id: "sensors",
      title: "Sensors",
      glyph: "📡",
      status: { label: "Upgrade", tone: "upgrade" },
      rows: [
        { label: "Wideband Lambda", value: "Missing", tone: "bad" },
        { label: "MAP Sensor", value: turbo ? "Upgrade" : "OEM", tone: turbo ? "warn" : "normal" },
        { label: "IAT Sensor", value: "OEM" },
        { label: "EGT", value: turbo ? "Recommended" : "Optional", tone: turbo ? "warn" : "muted" },
        { label: "Fuel Pressure", value: "Missing", tone: "bad" },
        { label: "Knock Sensor", value: "OEM" },
      ],
      actionLabel: "Sensor check",
    },
    {
      id: "exhaust",
      title: "Exhaust",
      glyph: "🔥",
      status: { label: "Good", tone: "good" },
      rows: [
        { label: "Exhaust Manifold", value: turbo ? "Turbo manifold" : "OEM" },
        { label: "Downpipe", value: turbo ? '3.0"' : '2.5" sport' },
        { label: "Catalyst", value: "High-flow / off-road" },
        { label: "Cat-Back", value: '3.0"' },
        { label: "Backpressure", value: "Low" },
      ],
      actionLabel: "Details",
    },
    {
      id: "cooling",
      title: "Cooling System",
      glyph: "🌡",
      status: { label: "Upgrade", tone: "upgrade" },
      rows: [
        { label: "Radiator", value: "Stock" },
        { label: "Intercooler", value: turbo ? "Required" : "N/A", tone: turbo ? "bad" : "muted" },
        { label: "Oil Cooler", value: turbo ? "Recommended" : "Optional", tone: turbo ? "warn" : "muted" },
        { label: "IAT Risk", value: turbo ? "Medium" : "Low", tone: turbo ? "warn" : "normal" },
        { label: "Heat Soak Risk", value: "Medium", tone: "warn" },
      ],
      actionLabel: "Details",
    },
    {
      id: "drivetrain",
      title: "Drivetrain Limit",
      glyph: "⚡",
      status:
        model.targetTorque > clutchRating
          ? { label: "Borderline", tone: "borderline" }
          : { label: "Good", tone: "good" },
      rows: [
        { label: "Clutch Rating", value: `${clutchRating} Nm` },
        {
          label: "Current Torque",
          value: `${model.targetTorque} Nm`,
          tone: model.targetTorque > clutchRating ? "bad" : "normal",
        },
        { label: "Gearbox Rating", value: "550 Nm" },
        { label: "Differential", value: "LSD" },
        {
          label: "Axles",
          value: model.targetTorque > clutchRating ? "Borderline" : "OK",
          tone: model.targetTorque > clutchRating ? "warn" : "normal",
        },
      ],
      actionLabel: "Details",
    },
  ];
}
