import { useId, useMemo, useState, type ReactNode } from "react";
import {
  ChassisTopDownWeightBalanceView,
  ChassisTopDownWireframeShell,
} from "./aero/ChassisTopDownWireframe";
import { AERO_BODY_MATERIAL_TEXTURES } from "./aero/MaterialSwatch";
import {
  AERO_BODY_MATERIALS,
  formatAeroBodyWeight,
  type AeroBodyComponentRow,
} from "../data/aeroBodyComponents";
import {
  AERO_BODY_MOUNTING,
  deriveComponentConfidence,
  formatComponentSourceDetail,
  formatInstallStatusLabel,
  getActiveRecommendations,
  materialLabel,
  priorityLabel,
  priorityTone,
} from "../data/aeroBodyRightPanel";
import { buildAeroBodyWeightImpact, formatSignedKg } from "../lib/aeroBodyWeightImpact";
import { useAeroBodyPlannerStore } from "../store/aeroBodyPlannerStore";
import { useSuspensionAssistantStore } from "../store/suspensionAssistantStore";
import type { AeroBodyPlannerTabId } from "../data/aeroBodyComponents";

function Pill({ children, tone = "good" }: { children: ReactNode; tone?: "good" | "warn" | "neutral" }) {
  const cls =
    tone === "good"
      ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-300"
      : tone === "warn"
        ? "border-amber-500/35 bg-amber-500/10 text-amber-200"
        : "border-white/10 bg-white/5 text-neutral-400";
  return (
    <span className={`inline-flex rounded-full border px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wide ${cls}`}>
      {children}
    </span>
  );
}

function componentHeroMaterial(row: AeroBodyComponentRow) {
  if (row.installStatus === "installed") return row.material;
  if (row.upgradePlan === "planned") return row.planMaterial;
  return row.material;
}

const MATERIAL_HERO_TEXTURES = AERO_BODY_MATERIAL_TEXTURES;

function MaterialHeroTexture({ src }: { src: string }) {
  return (
    <div className="relative h-24 overflow-hidden rounded-lg border border-white/10 shadow-inner">
      <img src={src} alt="" className="h-full w-full object-cover object-center" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/10" />
    </div>
  );
}

function ComponentHero({ row }: { row: AeroBodyComponentRow }) {
  const heroMaterial = componentHeroMaterial(row);
  const mat = AERO_BODY_MATERIALS.find((m) => m.id === heroMaterial) ?? AERO_BODY_MATERIALS[4]!;
  const textureSrc = MATERIAL_HERO_TEXTURES[heroMaterial];

  if (textureSrc) {
    return <MaterialHeroTexture src={textureSrc} />;
  }

  return (
    <div
      className={`flex h-24 items-center justify-center rounded-lg border border-white/10 bg-gradient-to-br ${mat.swatch} shadow-inner`}
    >
      <span className="text-4xl text-white/20" aria-hidden>
        {row.icon}
      </span>
    </div>
  );
}

function AttributeTile({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/[0.08] bg-black/25 px-2 py-1.5">
      <p className="text-[8px] uppercase tracking-wide text-neutral-500">
        <span className="mr-0.5" aria-hidden>
          {icon}
        </span>
        {label}
      </p>
      <p className="mt-0.5 text-[9px] font-medium leading-snug text-neutral-200">{value}</p>
    </div>
  );
}

function ComponentDetailsSection({ row }: { row: AeroBodyComponentRow }) {
  const confidence = deriveComponentConfidence(row);
  const source = formatComponentSourceDetail(row);
  const mounting = AERO_BODY_MOUNTING[row.id] ?? "—";
  const status = formatInstallStatusLabel(row);

  return (
    <section className="rounded-lg border border-white/10 bg-[#080c11]/90 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-neutral-300">Component details</p>
        <button
          type="button"
          className="rounded border border-white/10 px-1.5 py-0.5 text-[8px] text-neutral-500 transition hover:border-cyan-500/30 hover:text-cyan-200"
          aria-label="Edit component in table"
        >
          ✎
        </button>
      </div>
      <ComponentHero row={row} />
      <p className="mt-2 text-[12px] font-semibold text-white">{row.label}</p>
      <dl className="mt-2 space-y-1.5 text-[10px]">
        <div className="flex justify-between gap-2">
          <dt className="text-neutral-500">Current material</dt>
          <dd className="text-neutral-200">{row.installStatus === "installed" ? materialLabel(row.material) : "—"}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-neutral-500">Weight</dt>
          <dd className="tabular-nums text-neutral-200">{formatAeroBodyWeight(row)}</dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt className="text-neutral-500">Source</dt>
          <dd>
            <Pill tone={source.includes("User Input") ? "good" : "neutral"}>{source}</Pill>
          </dd>
        </div>
        {confidence ? (
          <div className="flex items-center justify-between gap-2">
            <dt className="text-neutral-500">Confidence</dt>
            <dd>
              <Pill tone="good">{confidence}</Pill>
            </dd>
          </div>
        ) : null}
      </dl>
      <div className="mt-2.5 grid grid-cols-2 gap-1.5">
        <AttributeTile icon="≋" label="Aero role" value={row.aeroRole.split(" / ")[0] ?? row.aeroRole} />
        <AttributeTile icon="❄" label="Cooling role" value={row.coolingRole === "None" ? "None" : row.coolingRole.split(" / ")[0]!} />
        <AttributeTile icon="⚙" label="Mounting" value={mounting} />
        <AttributeTile
          icon={status === "Installed" ? "✓" : status === "Planned" ? "◌" : "✕"}
          label="Status"
          value={status}
        />
      </div>
    </section>
  );
}

function WeightBalanceSection({ components }: { components: AeroBodyComponentRow[] }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const sectionBodyId = useId();
  const vehicleMassManual = useSuspensionAssistantStore((s) => s.vehicleMassManual);
  const vehicleArchitectureManual = useSuspensionAssistantStore((s) => s.vehicleArchitectureManual);
  const impact = useMemo(
    () => buildAeroBodyWeightImpact(components, vehicleMassManual, vehicleArchitectureManual),
    [components, vehicleMassManual, vehicleArchitectureManual],
  );
  const savingsTone = impact.potentialSavingsKg <= 0 ? "text-emerald-400" : "text-amber-400";
  const deltaTone = "text-emerald-400";
  const balTone = impact.balanceImpact.includes("Rear") ? "text-amber-300" : "text-emerald-400";

  const referenceDisplay =
    impact.vehicleReferenceMassKg != null
      ? `${impact.vehicleReferenceMassKg} kg`
      : "—";

  return (
    <section className="rounded-lg border border-white/10 bg-[#080c11]/90 p-3">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 rounded-md border border-transparent px-0.5 py-0.5 text-left transition hover:border-white/10 hover:bg-white/[0.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400/70"
        aria-expanded={isExpanded}
        aria-controls={sectionBodyId}
        onClick={() => setIsExpanded((v) => !v)}
      >
        <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-neutral-300">
          Weight &amp; balance impact
        </span>
        <span
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-white/10 bg-white/[0.03] text-[12px] font-semibold leading-none text-neutral-300"
          aria-hidden="true"
        >
          {isExpanded ? "-" : "+"}
        </span>
      </button>
      <div id={sectionBodyId} hidden={!isExpanded}>
        <div className="mt-2">
          <ChassisTopDownWeightBalanceView />
        </div>
        <dl className="mt-2 space-y-1 text-[10px]">
          <div className="flex justify-between gap-2">
            <dt className="text-neutral-500">Vehicle reference mass</dt>
            <dd className="text-right">
              <span className="tabular-nums text-neutral-200">{referenceDisplay}</span>
              {impact.vehicleMassSource !== "missing" ? (
                <span className="mt-0.5 block text-[8px] text-neutral-600">{impact.vehicleMassSourceLabel}</span>
              ) : null}
            </dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="max-w-[11rem] text-neutral-500">
              Body panels (installed)
              <span className="mt-0.5 block text-[8px] font-normal normal-case tracking-normal text-neutral-600">
                Doar inventar — deja în masa vehiculului, nu se adună la referință
              </span>
            </dt>
            <dd className="shrink-0 tabular-nums text-neutral-400">{impact.trackedBodyPanelsKg} kg</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-neutral-500">Potential savings</dt>
            <dd className={`tabular-nums font-medium ${savingsTone}`}>{formatSignedKg(impact.potentialSavingsKg)}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-neutral-500">Front axle change</dt>
            <dd className={`tabular-nums ${deltaTone}`}>{formatSignedKg(impact.frontAxleChangeKg)}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-neutral-500">Rear axle change</dt>
            <dd className={`tabular-nums ${deltaTone}`}>{formatSignedKg(impact.rearAxleChangeKg)}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-neutral-500">CG impact</dt>
            <dd className="text-emerald-400">{impact.cgImpact}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-neutral-500">Balance impact</dt>
            <dd className={balTone}>{impact.balanceImpact}</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}

type AirflowStabilityProfile = {
  dragCoefficient: string;
  frontDownforceKg: number;
  rearDownforceKg: number;
  aeroBalance: string;
  stabilityImpact: string;
  coolingImpact: string;
  dragImpact: string;
  frontLevel: string;
  rearLevel: string;
};

const AERO_PROFILE_WEIGHTS: Record<
  string,
  { front?: number; rear?: number; drag?: number; stability?: number; cooling?: number; underbody?: number }
> = {
  hood: { drag: -0.2, cooling: 0.8 },
  "front-bumper": { front: 1.1, drag: 0.3, cooling: 1 },
  "front-splitter": { front: 2.4, drag: 0.4, stability: 1.2, underbody: 0.4 },
  "rear-bumper": { rear: 0.7, drag: 0.2 },
  "rear-diffuser": { rear: 2.5, drag: -0.3, stability: 1.5, underbody: 1.7 },
  trunk: { rear: 0.3 },
  spoiler: { rear: 2.8, drag: 0.8, stability: 1.5 },
  "side-skirts": { front: 0.4, rear: 0.6, drag: -0.2, stability: 0.9, underbody: 1.2 },
  "front-fenders": { drag: 0.2, stability: 0.2 },
  "rear-fenders": { drag: 0.2, stability: 0.2 },
  undertray: { front: 0.8, rear: 0.9, drag: -0.7, stability: 1.3, cooling: 0.4, underbody: 1.8 },
  widebody: { drag: 0.9, stability: 0.6, cooling: 0.5 },
};

function activeAeroFactor(row: AeroBodyComponentRow): number {
  if (row.installStatus === "installed") return 1;
  if (row.upgradePlan === "planned") return 0.75;
  return 0;
}

function qualitativeAeroLevel(score: number): string {
  if (score >= 3.8) return "High";
  if (score >= 1.6) return "Medium";
  if (score > 0) return "Low";
  return "Neutral";
}

function buildAirflowStabilityProfile(components: AeroBodyComponentRow[]): AirflowStabilityProfile {
  let front = 0;
  let rear = 0;
  let drag = 0;
  let stability = 0;
  let cooling = 0;
  let underbody = 0;

  for (const row of components) {
    const factor = activeAeroFactor(row);
    if (factor <= 0) continue;

    const weights = AERO_PROFILE_WEIGHTS[row.id] ?? {};
    front += (weights.front ?? 0) * factor;
    rear += (weights.rear ?? 0) * factor;
    drag += (weights.drag ?? 0) * factor;
    stability += (weights.stability ?? 0) * factor;
    cooling += (weights.cooling ?? 0) * factor;
    underbody += (weights.underbody ?? 0) * factor;
  }

  const frontDownforceKg = front <= 0 ? 0 : Math.round(6 + front * 7);
  const rearDownforceKg = rear <= 0 ? 0 : Math.round(7 + rear * 8);
  const rawCd = 0.32 + drag * 0.012 - underbody * 0.006;
  const clampedCd = Math.max(0.28, Math.min(0.42, rawCd));
  const balanceDelta = rearDownforceKg - frontDownforceKg;

  return {
    dragCoefficient: clampedCd.toFixed(2),
    frontDownforceKg,
    rearDownforceKg,
    aeroBalance: balanceDelta > 8 ? "Slightly Rear" : balanceDelta < -8 ? "Slightly Front" : "Neutral",
    stabilityImpact: stability + underbody >= 1.5 ? "Improved" : "Neutral",
    coolingImpact: cooling >= 1.2 ? "Improved" : "Neutral",
    dragImpact: drag > 0.45 ? "Slightly Increased" : drag < -0.3 ? "Reduced" : "Neutral",
    frontLevel: qualitativeAeroLevel(front),
    rearLevel: qualitativeAeroLevel(rear),
  };
}

function formatSignedSpeedKg(value: number): string {
  if (value === 0) return "0 kg @ 160 km/h";
  return `${value > 0 ? "+" : ""}${value} kg @ 160 km/h`;
}

type AirflowTrace = {
  d: string;
  stroke: string;
  width: number;
  opacity?: number;
};

const CHASSIS_AIRFLOW_TRACES: AirflowTrace[] = [
  { d: "M50 -2 C49 9 48 18 48.5 28 C49.2 41 50.8 51 50 64 C49.4 76 49.8 88 50 103", stroke: "url(#aeroFlowCenterGradient)", width: 0.72, opacity: 0.95 },
  { d: "M43 -2 C43.4 9 44.2 17 45.8 27 C48.2 42 49 53 47.2 64 C45.7 75 43.8 88 42.5 103", stroke: "url(#aeroFlowCenterGradient)", width: 0.58, opacity: 0.82 },
  { d: "M57 -2 C56.6 9 55.8 17 54.2 27 C51.8 42 51 53 52.8 64 C54.3 75 56.2 88 57.5 103", stroke: "url(#aeroFlowCenterGradient)", width: 0.58, opacity: 0.82 },
  { d: "M35 -2 C38 10 40 18 42 27 C44.5 38 45.4 50 43 62 C40.8 73 37.2 87 33 103", stroke: "url(#aeroFlowWarmGradient)", width: 0.66, opacity: 0.9 },
  { d: "M65 -2 C62 10 60 18 58 27 C55.5 38 54.6 50 57 62 C59.2 73 62.8 87 67 103", stroke: "url(#aeroFlowWarmGradient)", width: 0.66, opacity: 0.9 },
  { d: "M27 -2 C31 11 36 20 40 31 C44 43 43.4 55 39.5 66 C35.5 78 28.2 91 20 103", stroke: "url(#aeroFlowWarmGradient)", width: 0.54, opacity: 0.78 },
  { d: "M73 -2 C69 11 64 20 60 31 C56 43 56.6 55 60.5 66 C64.5 78 71.8 91 80 103", stroke: "url(#aeroFlowWarmGradient)", width: 0.54, opacity: 0.78 },
  { d: "M18 -2 C24 9 31 18 37.5 29 C45 42 43.8 56 37.5 68 C31.2 80 20.5 92 9 103", stroke: "url(#aeroFlowSideGradient)", width: 0.48, opacity: 0.72 },
  { d: "M82 -2 C76 9 69 18 62.5 29 C55 42 56.2 56 62.5 68 C68.8 80 79.5 92 91 103", stroke: "url(#aeroFlowSideGradient)", width: 0.48, opacity: 0.72 },
  { d: "M10 -2 C18 8 28 18 35 31 C42 44 39.5 57 31.4 69.5 C23.2 82 10.5 93.5 -2 102", stroke: "url(#aeroFlowSideGradient)", width: 0.42, opacity: 0.66 },
  { d: "M90 -2 C82 8 72 18 65 31 C58 44 60.5 57 68.6 69.5 C76.8 82 89.5 93.5 102 102", stroke: "url(#aeroFlowSideGradient)", width: 0.42, opacity: 0.66 },
  { d: "M2 4 C13 12 27 21 34.5 34 C42 47 37.2 60 27 72 C16.5 84.5 2.5 94 -8 100", stroke: "url(#aeroFlowCoolGradient)", width: 0.36, opacity: 0.6 },
  { d: "M98 4 C87 12 73 21 65.5 34 C58 47 62.8 60 73 72 C83.5 84.5 97.5 94 108 100", stroke: "url(#aeroFlowCoolGradient)", width: 0.36, opacity: 0.6 },
  { d: "M-4 15 C10 20 25 29 31 42 C37 55 28 69 15.5 79 C6.5 86 -1 92 -7 98", stroke: "url(#aeroFlowCoolGradient)", width: 0.34, opacity: 0.5 },
  { d: "M104 15 C90 20 75 29 69 42 C63 55 72 69 84.5 79 C93.5 86 101 92 107 98", stroke: "url(#aeroFlowCoolGradient)", width: 0.34, opacity: 0.5 },
];

const CHASSIS_AIRFLOW_WAKE_TRACES: AirflowTrace[] = [
  { d: "M22 76 C31 82 40 83.5 49 87.5 C58 91.5 67.5 90.5 79 97", stroke: "#ff5a1f", width: 1.15, opacity: 0.42 },
  { d: "M78 76 C69 82 60 83.5 51 87.5 C42 91.5 32.5 90.5 21 97", stroke: "#ff8a00", width: 0.92, opacity: 0.34 },
  { d: "M31 70 C39 76 45 77.5 50 82 C55 77.5 61 76 69 70", stroke: "#f43f1c", width: 0.78, opacity: 0.42 },
];

function AirflowTracePath({ d, stroke, width, opacity = 1 }: AirflowTrace) {
  return (
    <path
      d={d}
      fill="none"
      stroke={stroke}
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity={opacity}
      vectorEffect="non-scaling-stroke"
    />
  );
}

function AirflowStabilityDiagram() {
  return (
    <div className="mt-2">
      <ChassisTopDownWireframeShell compact borderTone="neutral" fitFullFrame>
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          role="img"
          aria-label="Top-down chassis with separated aerodynamic airflow overlay"
        >
          <defs>
            <linearGradient id="aeroFlowCoolGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#7dd3fc" />
              <stop offset="42%" stopColor="#5eead4" />
              <stop offset="100%" stopColor="#a3e635" />
            </linearGradient>
            <linearGradient id="aeroFlowSideGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#67e8f9" />
              <stop offset="34%" stopColor="#84cc16" />
              <stop offset="76%" stopColor="#d9f99d" />
              <stop offset="100%" stopColor="#facc15" />
            </linearGradient>
            <linearGradient id="aeroFlowCenterGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#a3e635" />
              <stop offset="36%" stopColor="#bef264" />
              <stop offset="70%" stopColor="#facc15" />
              <stop offset="100%" stopColor="#fb923c" />
            </linearGradient>
            <linearGradient id="aeroFlowWarmGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#bef264" />
              <stop offset="48%" stopColor="#facc15" />
              <stop offset="76%" stopColor="#fb923c" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>
            <linearGradient id="aeroUnderbodyWash" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.03" />
              <stop offset="40%" stopColor="#84cc16" stopOpacity="0.16" />
              <stop offset="78%" stopColor="#facc15" stopOpacity="0.13" />
              <stop offset="100%" stopColor="#fb923c" stopOpacity="0.03" />
            </linearGradient>
            <radialGradient id="aeroRearWakeGlow" cx="50%" cy="77%" r="44%">
              <stop offset="0%" stopColor="#fb923c" stopOpacity="0.36" />
              <stop offset="48%" stopColor="#ef4444" stopOpacity="0.16" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
            </radialGradient>
            <filter id="aeroFlowGlow" x="-25%" y="-8%" width="150%" height="116%">
              <feGaussianBlur stdDeviation="0.85" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="aeroWakeBlur" x="-25%" y="-25%" width="150%" height="150%">
              <feGaussianBlur stdDeviation="1.8" />
            </filter>
          </defs>

          <path d="M34 8 C29 23 29.5 71 37 92 L63 92 C70.5 71 71 23 66 8 Z" fill="url(#aeroUnderbodyWash)" />
          <ellipse cx="50" cy="86" rx="33" ry="11.5" fill="url(#aeroRearWakeGlow)" filter="url(#aeroWakeBlur)" />

          <g filter="url(#aeroFlowGlow)">
            <g opacity="0.72">
              {CHASSIS_AIRFLOW_WAKE_TRACES.map((trace) => (
                <AirflowTracePath key={trace.d} {...trace} />
              ))}
            </g>
            {CHASSIS_AIRFLOW_TRACES.map((trace) => (
              <AirflowTracePath key={trace.d} {...trace} />
            ))}
          </g>
        </svg>
      </ChassisTopDownWireframeShell>
    </div>
  );
}

function AeroImpactMetricRow({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-neutral-500">{label}</dt>
      <dd className={`text-right tabular-nums ${tone ?? "text-neutral-200"}`}>{value}</dd>
    </div>
  );
}

function AirflowStabilityProfileSection({ components }: { components: AeroBodyComponentRow[] }) {
  const profile = useMemo(() => buildAirflowStabilityProfile(components), [components]);

  return (
    <section className="rounded-lg border border-white/10 bg-[#080c11]/90 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-neutral-300">
          Airflow &amp; stability profile
        </p>
        <span className="rounded border border-cyan-500/25 bg-cyan-500/10 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wide text-cyan-200">
          Concept map
        </span>
      </div>

      <AirflowStabilityDiagram />

      <div className="mt-2 rounded-md border border-white/[0.08] bg-black/25 p-2">
        <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-neutral-300">Aerodynamic impact</p>
        <dl className="mt-2 space-y-1 text-[10px]">
          <AeroImpactMetricRow label="Estimated drag coefficient" value={`${profile.dragCoefficient} Cd`} tone="text-cyan-200" />
          <AeroImpactMetricRow
            label="Front downforce change"
            value={formatSignedSpeedKg(profile.frontDownforceKg)}
            tone="text-emerald-300"
          />
          <AeroImpactMetricRow
            label="Rear downforce change"
            value={formatSignedSpeedKg(profile.rearDownforceKg)}
            tone="text-emerald-300"
          />
          <AeroImpactMetricRow label="Front downforce" value={profile.frontLevel} />
          <AeroImpactMetricRow label="Rear downforce" value={profile.rearLevel} />
          <AeroImpactMetricRow label="Aero balance" value={profile.aeroBalance} tone="text-amber-200" />
          <AeroImpactMetricRow label="Stability impact" value={profile.stabilityImpact} tone="text-emerald-300" />
          <AeroImpactMetricRow label="Cooling impact" value={profile.coolingImpact} />
          <AeroImpactMetricRow label="Drag impact" value={profile.dragImpact} tone="text-amber-200" />
        </dl>
      </div>
    </section>
  );
}

function RecommendationsSection({
  components,
  onViewAll,
}: {
  components: AeroBodyComponentRow[];
  onViewAll: () => void;
}) {
  const items = useMemo(() => getActiveRecommendations(components, 5), [components]);

  return (
    <section className="rounded-lg border border-white/10 bg-[#080c11]/90 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-neutral-300">
          Active recommendations <span className="text-neutral-600">(top 5)</span>
        </p>
        <button
          type="button"
          onClick={onViewAll}
          className="text-[8px] font-semibold uppercase tracking-wide text-cyan-400/90 hover:text-cyan-200"
        >
          View all
        </button>
      </div>
      <ol className="mt-2 space-y-2">
        {items.map((item, index) => (
          <li key={item.id} className="flex gap-2">
            <span className="mt-0.5 w-3 shrink-0 text-[9px] tabular-nums text-neutral-600">{index + 1}.</span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span
                  className={`rounded border px-1 py-0.5 text-[7px] font-bold uppercase tracking-wide ${priorityTone(item.priority)}`}
                >
                  {priorityLabel(item.priority)}
                </span>
                <span className="text-[10px] font-medium text-neutral-100">{item.title}</span>
              </div>
              <p className="mt-0.5 text-[9px] text-neutral-500">{item.detail}</p>
            </div>
          </li>
        ))}
        {items.length === 0 ? (
          <li className="text-[10px] text-neutral-500">No open recommendations — body setup looks complete.</li>
        ) : null}
      </ol>
    </section>
  );
}

export function AeroRightPanel() {
  const components = useAeroBodyPlannerStore((s) => s.components);
  const selectedComponentId = useAeroBodyPlannerStore((s) => s.selectedComponentId);
  const setActiveTab = useAeroBodyPlannerStore((s) => s.setActiveTab);

  const selected =
    components.find((c) => c.id === selectedComponentId) ?? components[0] ?? null;

  function goToTab(tab: AeroBodyPlannerTabId) {
    setActiveTab(tab);
    document.getElementById(`aero-center-${tab}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    document.getElementById("aero-center-planner")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (!selected) return null;

  return (
    <aside
      id="aero-right-panel"
      className="flex w-[360px] shrink-0 flex-col gap-2.5 overflow-y-auto border-l border-white/10 bg-[#0b0f14] p-3"
    >
      <ComponentDetailsSection row={selected} />
      <WeightBalanceSection components={components} />
      <AirflowStabilityProfileSection components={components} />
      <RecommendationsSection components={components} onViewAll={() => goToTab("search-upgrades")} />
    </aside>
  );
}
