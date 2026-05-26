import { useMemo, type ReactNode } from "react";
import { ChassisTopDownWeightBalanceView } from "./aero/ChassisTopDownWireframe";
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
      <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-neutral-300">Weight &amp; balance impact</p>
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
      <RecommendationsSection components={components} onViewAll={() => goToTab("search-upgrades")} />
    </aside>
  );
}
