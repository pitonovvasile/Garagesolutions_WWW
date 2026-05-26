import { useMemo } from "react";
import { MaterialSwatch } from "./MaterialSwatch";
import {
  AERO_BODY_MATERIALS,
  AERO_BODY_PLANNER_TABS,
  AERO_BODY_SOURCE_BRANDS,
  aeroBodyComponentCounts,
  deriveAeroBodyUpgradeAction,
  formatAeroBodySource,
  formatAeroBodyWeight,
  type AeroBodyComponentRow,
  type AeroBodyInstallStatus,
  type AeroBodyMaterialId,
  type AeroBodyPlannerTabId,
  type AeroBodySourceKind,
  type AeroBodyUpgradeAction,
  type AeroBodyUpgradePlan,
  type AeroBodyVendorKind,
} from "../../data/aeroBodyComponents";
import { useGarageCars } from "../../hooks/useGarageCars";
import { formatSavedCarLabel } from "../../lib/garageStorage";
import type { AeroBodySetupKind } from "../../lib/aeroBodySetupPersistence";
import { useAeroBodyPlannerStore } from "../../store/aeroBodyPlannerStore";
import { useSuspensionStore } from "../../store/suspensionStore";
import { SavedAeroBodySetupsPanel } from "./SavedAeroBodySetupsPanel";

const inputClass =
  "w-full min-w-0 rounded border border-white/10 bg-[#0b0f14] px-1 py-0.5 text-[9px] text-neutral-200 outline-none focus:border-cyan-400/40 disabled:cursor-not-allowed disabled:opacity-40";

function OnCarBadge({ status }: { status: AeroBodyInstallStatus }) {
  if (status === "installed") {
    return <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/15 text-[10px] text-emerald-400">✓</span>;
  }
  return <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-500/15 text-[10px] text-red-400">✕</span>;
}

function PlanBadge({ plan }: { plan: AeroBodyUpgradePlan }) {
  if (plan === "planned") {
    return <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/15 text-[10px] text-amber-400">◌</span>;
  }
  return <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-neutral-500/10 text-[10px] text-neutral-500">—</span>;
}

function CurrentSetupInstallSelect({
  value,
  onChange,
}: {
  value: AeroBodyInstallStatus;
  onChange: (v: AeroBodyInstallStatus) => void;
}) {
  return (
    <div className="flex min-w-[4.5rem] flex-col items-start gap-0.5">
      <OnCarBadge status={value} />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as AeroBodyInstallStatus)}
        onClick={(e) => e.stopPropagation()}
        className={inputClass}
        aria-label="On car status"
      >
        <option value="installed">Installed</option>
        <option value="missing">Missing</option>
      </select>
    </div>
  );
}

function UpgradePlanSelect({
  value,
  onChange,
}: {
  value: AeroBodyUpgradePlan;
  onChange: (v: AeroBodyUpgradePlan) => void;
}) {
  return (
    <div className="flex min-w-[4.5rem] flex-col items-start gap-0.5">
      <PlanBadge plan={value} />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as AeroBodyUpgradePlan)}
        onClick={(e) => e.stopPropagation()}
        className={inputClass}
        aria-label="Upgrade plan"
      >
        <option value="none">None</option>
        <option value="planned">Planned</option>
      </select>
    </div>
  );
}

function WeightInput({
  row,
  onChange,
  forceEditable,
}: {
  row: Pick<AeroBodyComponentRow, "id" | "label" | "weightKg" | "weightPerSide" | "installStatus">;
  onChange: (weightKg: number | null, weightPerSide?: boolean) => void;
  forceEditable?: boolean;
}) {
  const editable = forceEditable ?? row.installStatus !== "missing";
  const showPerSide = row.id.includes("fender") || row.weightPerSide;

  return (
    <div className="flex min-w-[5.5rem] flex-col gap-0.5">
      <input
        type="number"
        min={0}
        step={0.1}
        inputMode="decimal"
        disabled={!editable}
        value={row.weightKg ?? ""}
        placeholder="—"
        onChange={(e) => {
          const raw = e.target.value.trim();
          onChange(raw === "" ? null : Number.parseFloat(raw));
        }}
        onClick={(e) => e.stopPropagation()}
        className={`${inputClass} tabular-nums`}
        aria-label={`Weight for ${row.label}`}
      />
      {showPerSide ? (
        <label className="inline-flex items-center gap-1 text-[8px] text-neutral-500">
          <input
            type="checkbox"
            disabled={!editable}
            checked={row.weightPerSide}
            onChange={(e) => onChange(row.weightKg, e.target.checked)}
            className="h-2.5 w-2.5 rounded border-white/20 bg-[#0b0f14]"
          />
          per side
        </label>
      ) : (
        <span className="text-[8px] tabular-nums text-neutral-600">
          {row.weightKg != null ? formatAeroBodyWeight({ weightKg: row.weightKg, weightPerSide: row.weightPerSide }) : "—"}
        </span>
      )}
    </div>
  );
}

function sourceSelectValue(row: AeroBodyComponentRow): string {
  if (row.sourceKind === "brand" && row.sourceBrandId) return `brand:${row.sourceBrandId}`;
  return `kind:${row.sourceKind}`;
}

function parseSourceSelectValue(value: string): {
  sourceKind: AeroBodySourceKind;
  brandId?: string | null;
} {
  if (value.startsWith("brand:")) {
    return { sourceKind: "brand", brandId: value.slice(6) };
  }
  return { sourceKind: value.slice(5) as AeroBodySourceKind };
}

function SourceSelect({
  row,
  onChange,
}: {
  row: AeroBodyComponentRow;
  onChange: (
    sourceKind: AeroBodySourceKind,
    opts?: { brandId?: string | null; customName?: string },
  ) => void;
}) {
  const editable = row.installStatus !== "missing";
  const display = formatAeroBodySource(row);

  if (!editable) {
    return <span className="text-[9px] text-neutral-500">{display}</span>;
  }

  return (
    <div className="flex min-w-[7rem] flex-col gap-0.5">
      <select
        value={sourceSelectValue(row)}
        onChange={(e) => {
          const parsed = parseSourceSelectValue(e.target.value);
          onChange(parsed.sourceKind, { brandId: parsed.brandId ?? null });
        }}
        className={inputClass}
        aria-label={`Source for ${row.label}`}
      >
        <optgroup label="General">
          <option value="kind:oem">OEM</option>
          <option value="kind:user-input">User Input</option>
          <option value="kind:estimated">Estimated</option>
        </optgroup>
        <optgroup label="Dedicated brands">
          {AERO_BODY_SOURCE_BRANDS.map((brand) => (
            <option key={brand.id} value={`brand:${brand.id}`}>
              {brand.label}
            </option>
          ))}
        </optgroup>
        <optgroup label="Artisan">
          <option value="kind:custom">Custom / Artisan (no brand)</option>
        </optgroup>
      </select>
      {row.sourceKind === "custom" ? (
        <input
          type="text"
          value={row.sourceCustomName}
          placeholder="Name or shop…"
          onChange={(e) => onChange("custom", { customName: e.target.value })}
          className={inputClass}
          aria-label={`Custom source name for ${row.label}`}
        />
      ) : (
        <span className="truncate text-[8px] text-neutral-600">{display}</span>
      )}
    </div>
  );
}

function planVendorSelectValue(row: AeroBodyComponentRow): string {
  if (row.planVendorKind === "brand" && row.planVendorBrandId) return `brand:${row.planVendorBrandId}`;
  return `kind:${row.planVendorKind}`;
}

function parsePlanVendorSelectValue(value: string): {
  planVendorKind: AeroBodyVendorKind;
  brandId?: string | null;
} {
  if (value.startsWith("brand:")) {
    return { planVendorKind: "brand", brandId: value.slice(6) };
  }
  return { planVendorKind: value.slice(5) as AeroBodyVendorKind };
}

function VendorSelect({
  row,
  onChange,
}: {
  row: AeroBodyComponentRow;
  onChange: (
    planVendorKind: AeroBodyVendorKind,
    opts?: { brandId?: string | null; customName?: string },
  ) => void;
}) {
  return (
    <div className="flex min-w-[7rem] flex-col gap-0.5">
      <select
        value={planVendorSelectValue(row)}
        onChange={(e) => {
          const parsed = parsePlanVendorSelectValue(e.target.value);
          onChange(parsed.planVendorKind, { brandId: parsed.brandId ?? null });
        }}
        className={inputClass}
        aria-label={`Vendor for ${row.label}`}
      >
        <option value="kind:oem">OEM</option>
        <optgroup label="Dedicated brands">
          {AERO_BODY_SOURCE_BRANDS.map((brand) => (
            <option key={brand.id} value={`brand:${brand.id}`}>
              {brand.label}
            </option>
          ))}
        </optgroup>
        <option value="kind:custom">Custom / Artisan (no brand)</option>
      </select>
      {row.planVendorKind === "custom" ? (
        <input
          type="text"
          value={row.planVendorCustomName}
          placeholder="Name or shop…"
          onChange={(e) => onChange("custom", { customName: e.target.value })}
          className={inputClass}
          aria-label={`Custom vendor for ${row.label}`}
        />
      ) : null}
    </div>
  );
}

function PlanWeightInput({
  row,
  onChange,
}: {
  row: AeroBodyComponentRow;
  onChange: (weightKg: number | null, weightPerSide?: boolean) => void;
}) {
  const showPerSide = row.id.includes("fender") || row.planWeightPerSide;

  return (
    <div className="flex min-w-[5.5rem] flex-col gap-0.5">
      <input
        type="number"
        min={0}
        step={0.1}
        inputMode="decimal"
        value={row.planWeightKg ?? ""}
        placeholder="—"
        onChange={(e) => {
          const raw = e.target.value.trim();
          onChange(raw === "" ? null : Number.parseFloat(raw));
        }}
        onClick={(e) => e.stopPropagation()}
        className={`${inputClass} tabular-nums`}
        aria-label={`Target weight for ${row.label}`}
      />
      {showPerSide ? (
        <label className="inline-flex items-center gap-1 text-[8px] text-neutral-500">
          <input
            type="checkbox"
            checked={row.planWeightPerSide}
            onChange={(e) => onChange(row.planWeightKg, e.target.checked)}
            className="h-2.5 w-2.5 rounded border-white/20 bg-[#0b0f14]"
          />
          per side
        </label>
      ) : (
        <span className="text-[8px] tabular-nums text-neutral-600">
          {formatAeroBodyWeight({ weightKg: row.planWeightKg, weightPerSide: row.planWeightPerSide })}
        </span>
      )}
    </div>
  );
}

function MaterialSelect({
  value,
  onChange,
  disabled,
}: {
  value: AeroBodyMaterialId;
  onChange: (v: AeroBodyMaterialId) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex min-w-[7.5rem] items-center gap-1.5">
      <MaterialSwatch materialId={value} size="sm" />
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value as AeroBodyMaterialId)}
        onClick={(e) => e.stopPropagation()}
        className="min-w-0 flex-1 appearance-none rounded border border-white/10 bg-[#0b0f14] px-1 py-0.5 text-[9px] text-neutral-200 outline-none focus:border-cyan-400/40 disabled:opacity-50"
      >
        {AERO_BODY_MATERIALS.map((m) => (
          <option key={m.id} value={m.id}>
            {m.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function UpgradeActionButtons({ action }: { action: AeroBodyUpgradeAction }) {
  const base = "rounded border px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wide transition";
  if (action === "keepEdit") {
    return (
      <div className="flex flex-wrap gap-1">
        <button type="button" className={`${base} border-cyan-500/35 bg-cyan-500/10 text-cyan-100 hover:bg-cyan-500/20`}>
          Keep / Edit
        </button>
        <button type="button" className={`${base} border-cyan-500/35 bg-cyan-500/10 text-cyan-100 hover:bg-cyan-500/20`}>
          Search upgrades
        </button>
      </div>
    );
  }
  if (action === "keep") {
    return (
      <div className="flex flex-wrap gap-1">
        <button type="button" className={`${base} border-cyan-500/35 bg-cyan-500/10 text-cyan-100 hover:bg-cyan-500/20`}>
          Keep
        </button>
        <button type="button" className={`${base} border-cyan-500/35 bg-cyan-500/10 text-cyan-100 hover:bg-cyan-500/20`}>
          Search upgrades
        </button>
      </div>
    );
  }
  if (action === "add") {
    return (
      <button type="button" className={`${base} border-violet-500/35 bg-violet-500/10 text-violet-100 hover:bg-violet-500/20`}>
        Add component
      </button>
    );
  }
  return (
    <button type="button" className={`${base} border-amber-500/35 bg-amber-500/10 text-amber-100 hover:bg-amber-500/20`}>
      Evaluate
    </button>
  );
}

function CurrentSetupTable({
  rows,
  selectedId,
  onSelect,
  onInstallStatusChange,
  onMaterialChange,
  onWeightChange,
  onSourceChange,
}: {
  rows: AeroBodyComponentRow[];
  selectedId: string;
  onSelect: (id: string) => void;
  onInstallStatusChange: (id: string, status: AeroBodyInstallStatus) => void;
  onMaterialChange: (id: string, material: AeroBodyMaterialId) => void;
  onWeightChange: (id: string, weightKg: number | null, weightPerSide?: boolean) => void;
  onSourceChange: (
    id: string,
    sourceKind: AeroBodySourceKind,
    opts?: { brandId?: string | null; customName?: string },
  ) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-white/10">
      <table className="min-w-[780px] w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-white/10 bg-black/30 text-[8px] uppercase tracking-wide text-neutral-500">
            {[
              "Component",
              "On car",
              "Current material",
              "Weight",
              "Source",
              "Aero role",
              "Cooling role",
            ].map((h) => (
              <th key={h} className="px-2 py-1.5 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              onClick={() => onSelect(row.id)}
              className={[
                "cursor-pointer border-b border-white/[0.06] transition hover:bg-white/[0.02]",
                selectedId === row.id ? "bg-cyan-500/[0.07] ring-1 ring-inset ring-cyan-500/25" : "",
              ].join(" ")}
            >
              <td className="px-2 py-1.5">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-neutral-100">
                  <span className="text-neutral-500" aria-hidden>
                    {row.icon}
                  </span>
                  {row.label}
                </span>
              </td>
              <td className="px-2 py-1.5">
                <CurrentSetupInstallSelect
                  value={row.installStatus}
                  onChange={(status) => onInstallStatusChange(row.id, status)}
                />
              </td>
              <td className="px-2 py-1.5">
                <MaterialSelect
                  value={row.material}
                  disabled={row.installStatus === "missing"}
                  onChange={(m) => onMaterialChange(row.id, m)}
                />
              </td>
              <td className="px-2 py-1.5">
                <WeightInput row={row} onChange={(w, perSide) => onWeightChange(row.id, w, perSide)} />
              </td>
              <td className="px-2 py-1.5">
                <SourceSelect row={row} onChange={(kind, opts) => onSourceChange(row.id, kind, opts)} />
              </td>
              <td className="max-w-[9rem] px-2 py-1.5 text-[9px] leading-snug text-neutral-400">{row.aeroRole}</td>
              <td className="max-w-[9rem] px-2 py-1.5 text-[9px] leading-snug text-neutral-400">{row.coolingRole}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function UpgradePlannerTable({
  rows,
  selectedId,
  onSelect,
  onUpgradePlanChange,
  onPlanMaterialChange,
  onPlanWeightChange,
  onPlanVendorChange,
}: {
  rows: AeroBodyComponentRow[];
  selectedId: string;
  onSelect: (id: string) => void;
  onUpgradePlanChange: (id: string, plan: AeroBodyUpgradePlan) => void;
  onPlanMaterialChange: (id: string, material: AeroBodyMaterialId) => void;
  onPlanWeightChange: (id: string, weightKg: number | null, weightPerSide?: boolean) => void;
  onPlanVendorChange: (
    id: string,
    planVendorKind: AeroBodyVendorKind,
    opts?: { brandId?: string | null; customName?: string },
  ) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[10px] leading-relaxed text-neutral-500">
        Define target material, weight and vendor for each upgrade. On-car state is read-only — edit mounted parts in{" "}
        <span className="text-neutral-400">Current Body Setup</span>.
      </p>
      <div className="overflow-x-auto rounded-lg border border-white/10">
        <table className="min-w-[860px] w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-white/10 bg-black/30 text-[8px] uppercase tracking-wide text-neutral-500">
              {["Component", "On car", "Upgrade plan", "Material", "Weight", "Vendor", "Upgrade action"].map((h) => (
                <th key={h} className="px-2 py-1.5 font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                onClick={() => onSelect(row.id)}
                className={[
                  "cursor-pointer border-b border-white/[0.06] transition hover:bg-white/[0.02]",
                  selectedId === row.id ? "bg-cyan-500/[0.07] ring-1 ring-inset ring-cyan-500/25" : "",
                ].join(" ")}
              >
                <td className="px-2 py-1.5">
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-neutral-100">
                    <span className="text-neutral-500" aria-hidden>
                      {row.icon}
                    </span>
                    {row.label}
                  </span>
                </td>
                <td className="px-2 py-1.5">
                  <OnCarBadge status={row.installStatus} />
                </td>
                <td className="px-2 py-1.5">
                  <UpgradePlanSelect
                    value={row.upgradePlan}
                    onChange={(plan) => onUpgradePlanChange(row.id, plan)}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <MaterialSelect
                    value={row.planMaterial}
                    onChange={(m) => onPlanMaterialChange(row.id, m)}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <PlanWeightInput row={row} onChange={(w, perSide) => onPlanWeightChange(row.id, w, perSide)} />
                </td>
                <td className="px-2 py-1.5">
                  <VendorSelect row={row} onChange={(kind, opts) => onPlanVendorChange(row.id, kind, opts)} />
                </td>
                <td className="px-2 py-1.5">
                  <UpgradeActionButtons action={deriveAeroBodyUpgradeAction(row)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TabPlaceholder({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/20 p-4">
      <h3 className="text-[11px] font-semibold uppercase tracking-wide text-neutral-200">{title}</h3>
      <p className="mt-2 text-[10px] leading-relaxed text-neutral-500">{body}</p>
    </div>
  );
}

function SaveSetupButton({
  kind,
  onSave,
}: {
  kind: AeroBodySetupKind;
  onSave: (kind: AeroBodySetupKind) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSave(kind)}
      className="inline-flex items-center gap-1 rounded-md border border-cyan-500/35 bg-cyan-500/10 px-2 py-1 text-[8px] font-semibold uppercase tracking-wide text-cyan-100 transition hover:bg-cyan-500/20"
    >
      <span aria-hidden>💾</span>
      Save setup
    </button>
  );
}

export function BodyComponentsMaterialPlanner() {
  const garageCars = useGarageCars();
  const garageCarIndex = useSuspensionStore((s) => s.garageCarIndex);
  const linkedCar =
    garageCarIndex !== null && garageCarIndex >= 0 && garageCarIndex < garageCars.length
      ? garageCars[garageCarIndex]!
      : null;
  const vehicleLabel = linkedCar ? formatSavedCarLabel(linkedCar, garageCarIndex ?? 0) : "No vehicle selected";

  const activeTab = useAeroBodyPlannerStore((s) => s.activeTab);
  const setActiveTab = useAeroBodyPlannerStore((s) => s.setActiveTab);
  const components = useAeroBodyPlannerStore((s) => s.components);
  const setInstallStatus = useAeroBodyPlannerStore((s) => s.setInstallStatus);
  const setUpgradePlan = useAeroBodyPlannerStore((s) => s.setUpgradePlan);
  const setComponentMaterial = useAeroBodyPlannerStore((s) => s.setComponentMaterial);
  const setComponentWeight = useAeroBodyPlannerStore((s) => s.setComponentWeight);
  const setComponentSource = useAeroBodyPlannerStore((s) => s.setComponentSource);
  const setPlanMaterial = useAeroBodyPlannerStore((s) => s.setPlanMaterial);
  const setPlanWeight = useAeroBodyPlannerStore((s) => s.setPlanWeight);
  const setPlanVendor = useAeroBodyPlannerStore((s) => s.setPlanVendor);
  const selectedComponentId = useAeroBodyPlannerStore((s) => s.selectedComponentId);
  const setSelectedComponentId = useAeroBodyPlannerStore((s) => s.setSelectedComponentId);
  const clearMissingComponents = useAeroBodyPlannerStore((s) => s.clearMissingComponents);
  const duplicateSetup = useAeroBodyPlannerStore((s) => s.duplicateSetup);
  const saveSetup = useAeroBodyPlannerStore((s) => s.saveSetup);

  const counts = useMemo(() => aeroBodyComponentCounts(components), [components]);

  const handleSaveSetup = (kind: AeroBodySetupKind) => {
    saveSetup(kind);
  };

  return (
    <div id="aero-center-planner" className="mx-auto flex max-w-6xl flex-col gap-2.5">
      <header className="flex flex-wrap items-start justify-between gap-2 border-b border-white/[0.06] pb-2">
        <div>
          <h1 className="text-sm font-semibold uppercase tracking-[0.12em] text-white sm:text-base">
            Body components &amp; material planner
          </h1>
          <p className="mt-0.5 text-[10px] text-neutral-500">
            Define current body setup, materials, weight and upgrade targets.
          </p>
          <p className="mt-1 text-[9px] text-cyan-300/80">Vehicle: {vehicleLabel}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            className="rounded-md border border-white/10 bg-black/20 px-2 py-1 text-[8px] font-semibold uppercase tracking-wide text-neutral-300 transition hover:border-cyan-500/30 hover:text-cyan-100"
          >
            ↑ Import from other setup
          </button>
          <button
            type="button"
            className="rounded-md border border-white/10 px-2 py-1 text-[10px] text-neutral-500"
            aria-label="More options"
          >
            ⋮
          </button>
        </div>
      </header>

      <nav className="flex flex-wrap gap-1 border-b border-white/[0.06] pb-0" aria-label="Body planner tabs">
        {AERO_BODY_PLANNER_TABS.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              id={`aero-center-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={[
                "rounded-t-md border-b-2 px-2.5 py-1.5 text-[9px] font-semibold uppercase tracking-wide transition",
                active
                  ? "border-cyan-400 text-cyan-100"
                  : "border-transparent text-neutral-500 hover:text-neutral-300",
              ].join(" ")}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>

      {activeTab === "current-setup" ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[10px] leading-relaxed text-neutral-500">
              Document what is physically on the car today — installed parts, materials, weight and source.
            </p>
            <SaveSetupButton kind="current" onSave={handleSaveSetup} />
          </div>
          <CurrentSetupTable
            rows={components}
            selectedId={selectedComponentId}
            onSelect={setSelectedComponentId}
            onInstallStatusChange={setInstallStatus}
            onMaterialChange={setComponentMaterial}
            onWeightChange={setComponentWeight}
            onSourceChange={setComponentSource}
          />
        </>
      ) : activeTab === "upgrade-planner" ? (
        <>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <SaveSetupButton kind="upgrade" onSave={handleSaveSetup} />
          </div>
          <UpgradePlannerTable
          rows={components}
          selectedId={selectedComponentId}
          onSelect={setSelectedComponentId}
          onUpgradePlanChange={setUpgradePlan}
          onPlanMaterialChange={setPlanMaterial}
          onPlanWeightChange={setPlanWeight}
          onPlanVendorChange={setPlanVendor}
        />
        </>
      ) : activeTab === "saved-setups" ? (
        <div id="aero-center-saved">
          <SavedAeroBodySetupsPanel />
        </div>
      ) : (
        <TabPlaceholder
          title="Search upgrades"
          body="Search catalog upgrades compatible with the selected garage vehicle and missing body components."
        />
      )}

      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] pt-2">
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            className="rounded-md border border-cyan-500/35 bg-cyan-500/10 px-2 py-1 text-[8px] font-semibold uppercase tracking-wide text-cyan-100 hover:bg-cyan-500/20"
          >
            + Add component
          </button>
          <button
            type="button"
            onClick={duplicateSetup}
            className="rounded-md border border-white/10 px-2 py-1 text-[8px] font-semibold uppercase tracking-wide text-neutral-300 hover:bg-white/[0.04]"
          >
            Duplicate setup
          </button>
          <button
            type="button"
            onClick={clearMissingComponents}
            className="rounded-md border border-white/10 px-2 py-1 text-[8px] font-semibold uppercase tracking-wide text-neutral-400 hover:bg-white/[0.04]"
          >
            Clear missing
          </button>
        </div>
        <p className="text-[9px] text-neutral-500">
          On car:{" "}
          <span className="font-semibold text-neutral-300">
            {counts.installed}/{counts.total}
          </span>
          <span className="mx-1.5 text-neutral-700">·</span>
          Planned upgrades:{" "}
          <span className="font-semibold text-amber-400/90">{counts.planned}</span>
        </p>
      </footer>
    </div>
  );
}

export type { AeroBodyPlannerTabId };
