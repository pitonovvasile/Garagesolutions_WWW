import { useMemo, useState } from "react";
import type { AeroBodyComponentRow } from "../../data/aeroBodyComponents";
import { useVehicleAerodynamicData } from "../../hooks/useVehicleAerodynamicData";
import {
  calculateAerodynamicImpact,
  type AeroComponentEffect,
  type AeroMetricRange,
  type AerodynamicImpactResult,
} from "../../lib/aerodynamicImpact";
import type { SavedGarageCar } from "../../lib/garageStorage";

const speedInputClass =
  "w-20 rounded border border-white/10 bg-[#0b0f14] px-1.5 py-0.5 text-right text-[10px] tabular-nums text-neutral-200 outline-none focus:border-cyan-400/45";

function fmt(value: number | null, digits: number, suffix = ""): string {
  if (value == null || !Number.isFinite(value)) return "Not available";
  return `${value.toFixed(digits)}${suffix}`;
}

function fmtCompact(value: number | null, suffix = ""): string {
  if (value == null || !Number.isFinite(value)) return "Not available";
  return `${value % 1 === 0 ? value.toFixed(0) : value.toFixed(1)}${suffix}`;
}

function fmtRange(range: AeroMetricRange | null, suffix = ""): string | null {
  if (!range) return null;
  if (Math.abs(range.max - range.min) < 0.05) return fmtCompact(range.min, suffix);
  return `${fmtCompact(range.min)}-${fmtCompact(range.max, suffix)}`;
}

function fmtDownforceWithRange(
  value: number | null,
  range: AeroMetricRange | null,
  impact: AerodynamicImpactResult,
): string {
  if (!impact.downforceDataAvailable) return "Downforce data unavailable";
  return fmtRange(range, " kg") ?? fmtCompact(value, " kg");
}

function fmtDragForce(impact: AerodynamicImpactResult): string {
  if (impact.dragForceN == null) return "Not available";
  const kg = impact.dragForceKg != null ? ` / ${fmtCompact(impact.dragForceKg, " kg")}` : "";
  return `${fmtCompact(impact.dragForceN, " N")}${kg}`;
}

function metricTone(label: string): string {
  if (label === "Reduced" || label === "Balanced stability" || label === "Neutral") return "text-emerald-300";
  if (label.includes("increased") || label === "Increased") return "text-amber-300";
  if (label.includes("unavailable") || label === "Not available") return "text-neutral-500";
  return "text-cyan-200";
}

function MetricTile({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string;
  detail?: string;
  tone?: string;
}) {
  return (
    <div className="min-w-0 rounded-md border border-white/[0.08] bg-black/25 px-2 py-1.5">
      <p className="text-[8px] font-semibold uppercase tracking-wide text-neutral-500">{label}</p>
      <p className={`mt-0.5 truncate text-[11px] font-semibold tabular-nums ${tone ?? "text-neutral-100"}`}>{value}</p>
      {detail ? <p className="mt-0.5 truncate text-[8px] text-neutral-600">{detail}</p> : null}
    </div>
  );
}

function effectBadgeLabel(effectModelType: string | null | undefined): string {
  switch (effectModelType) {
    case "known_product":
      return "Known Aftermarket Estimate";
    case "generic_template":
      return "Generic Low-Confidence Estimate";
    case "parametric":
      return "Manual Dimension Estimate";
    case "validated":
      return "Validated Estimate";
    default:
      return "Aftermarket Estimate";
  }
}

function effectBadgeClass(effectModelType: string | null | undefined): string {
  switch (effectModelType) {
    case "known_product":
      return "border-cyan-500/30 bg-cyan-500/10 text-cyan-200";
    case "validated":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
    case "parametric":
      return "border-amber-500/30 bg-amber-500/10 text-amber-200";
    default:
      return "border-white/10 bg-white/[0.04] text-neutral-300";
  }
}

function scaledEffectRange(effect: AeroComponentEffect, key: "front" | "rear", speedKmh: number): string {
  const referenceSpeed = Number(effect.speed_kmh ?? 160) || 160;
  const scale = (Math.max(0, speedKmh) / referenceSpeed) ** 2;
  const minRaw =
    key === "front" ? effect.delta_front_downforce_kg_min : effect.delta_rear_downforce_kg_min;
  const maxRaw =
    key === "front" ? effect.delta_front_downforce_kg_max : effect.delta_rear_downforce_kg_max;
  const exactRaw =
    key === "front" ? effect.delta_front_downforce_kg : effect.delta_rear_downforce_kg;
  const exact = exactRaw == null ? null : Number(exactRaw);
  const min = minRaw == null ? exact : Number(minRaw);
  const max = maxRaw == null ? exact : Number(maxRaw);
  if (min == null && max == null) return "0 kg";
  const range = {
    min: Number.isFinite(min ?? NaN) ? (min ?? 0) * scale : 0,
    max: Number.isFinite(max ?? NaN) ? (max ?? 0) * scale : Number.isFinite(min ?? NaN) ? (min ?? 0) * scale : 0,
  };
  return fmtRange(range, " kg") ?? "0 kg";
}

function activeAeroComponents(components: AeroBodyComponentRow[]) {
  return components
    .filter((row) => row.installStatus === "installed" || row.upgradePlan === "planned")
    .map((row) => ({ id: row.id, label: row.label }));
}

export function AerodynamicImpactSection({
  car,
  components,
}: {
  car: SavedGarageCar | null;
  components: AeroBodyComponentRow[];
}) {
  const [speedKmh, setSpeedKmh] = useState(160);
  const { data, loading } = useVehicleAerodynamicData({ car, components, speedKmh });
  const selectedComponents = useMemo(() => activeAeroComponents(components), [components]);
  const impact = useMemo(
    () =>
      calculateAerodynamicImpact({
        baseAeroProfile: data.baseAeroProfile,
        selectedComponents,
        componentEffects: data.componentEffects,
        speedKmh,
      }),
    [data.baseAeroProfile, data.componentEffects, selectedComponents, speedKmh],
  );

  const balanceValue =
    impact.frontAeroBalancePercent != null && impact.rearAeroBalancePercent != null
      ? `${impact.frontAeroBalancePercent.toFixed(1)}% / ${impact.rearAeroBalancePercent.toFixed(1)}%`
      : impact.aeroBalanceLabel;
  const dragDetail =
    impact.deltaCdaPercent != null ? `${impact.deltaCdaPercent > 0 ? "+" : ""}${impact.deltaCdaPercent.toFixed(1)}% CdA` : undefined;
  const confidenceDetail = impact.isEstimated ? "Estimated aerodynamic impact" : data.baseAeroProfile?.source_name ?? undefined;
  const sourceType = impact.sourceSummary || data.error || "Not available";
  const effectModelTypes = [...new Set(data.componentEffects.map((effect) => effect.effect_model_type).filter(Boolean))];
  const profileDetail = [
    data.bodyStyleLabel,
    data.packageLabel ? `${data.packageLabel}${data.packageProfileMatched ? "" : " fallback"}` : null,
  ]
    .filter(Boolean)
    .join(" / ");

  return (
    <section className="rounded-lg border border-white/10 bg-[#080c11]/90 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-200">
            Aerodynamic Impact
          </h2>
          <p className="mt-0.5 text-[9px] text-neutral-600">
            {loading ? "Loading aero data..." : profileDetail || data.error || "Not available"}
          </p>
        </div>
        <label className="flex items-center gap-1.5 text-[8px] font-semibold uppercase tracking-wide text-neutral-500">
          Speed
          <input
            type="number"
            min={0}
            max={400}
            step={5}
            value={speedKmh}
            onChange={(event) => {
              const next = Number(event.target.value);
              setSpeedKmh(Number.isFinite(next) ? Math.max(0, Math.min(400, next)) : 160);
            }}
            className={speedInputClass}
            aria-label="Aerodynamic calculation speed"
          />
          <span className="text-neutral-600">km/h</span>
        </label>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-1.5 md:grid-cols-4">
        <MetricTile label="Cd / Cx" value={fmt(impact.finalCd, 3)} detail={impact.baseCd !== impact.finalCd ? `Base ${fmt(impact.baseCd, 3)}` : undefined} />
        <MetricTile label="Frontal Area" value={fmt(impact.frontalAreaM2, 2, " m2")} />
        <MetricTile label="CdA" value={fmt(impact.finalCda, 3, " m2")} detail={impact.baseCda !== impact.finalCda ? `Base ${fmt(impact.baseCda, 3, " m2")}` : undefined} />
        <MetricTile label={`Drag Force @ ${speedKmh} km/h`} value={fmtDragForce(impact)} />
        <MetricTile
          label={`Front Downforce @ ${speedKmh} km/h`}
          value={fmtDownforceWithRange(impact.frontDownforceKg, impact.frontDownforceRangeKg, impact)}
          tone={impact.downforceDataAvailable ? "text-emerald-300" : "text-neutral-500"}
        />
        <MetricTile
          label={`Rear Downforce @ ${speedKmh} km/h`}
          value={fmtDownforceWithRange(impact.rearDownforceKg, impact.rearDownforceRangeKg, impact)}
          tone={impact.downforceDataAvailable ? "text-emerald-300" : "text-neutral-500"}
        />
        <MetricTile
          label={`Total Downforce @ ${speedKmh} km/h`}
          value={fmtDownforceWithRange(impact.totalDownforceKg, impact.totalDownforceRangeKg, impact)}
          tone={impact.downforceDataAvailable ? "text-emerald-300" : "text-neutral-500"}
        />
        <MetricTile label="Aero Balance" value={balanceValue} detail={impact.aeroBalanceLabel} tone={metricTone(impact.aeroBalanceLabel)} />
        <MetricTile label="Drag Impact" value={impact.dragImpactLabel} detail={dragDetail} tone={metricTone(impact.dragImpactLabel)} />
        <MetricTile label="Stability Impact" value={impact.stabilityImpactLabel} tone={metricTone(impact.stabilityImpactLabel)} />
        <MetricTile label="Aero Confidence" value={String(impact.confidenceLevel)} detail={confidenceDetail} />
        <MetricTile label="Source Type" value={sourceType} detail={impact.calculationMethod ?? undefined} />
      </div>

      <div className="mt-2 flex flex-wrap gap-1">
        {data.baseAeroProfile ? (
          <span className="rounded border border-emerald-500/25 bg-emerald-500/10 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wide text-emerald-200">
            OEM Data
          </span>
        ) : null}
        {effectModelTypes.map((effectModelType) => (
          <span
            key={String(effectModelType)}
            className={`rounded border px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wide ${effectBadgeClass(String(effectModelType))}`}
          >
            {effectBadgeLabel(String(effectModelType))}
          </span>
        ))}
      </div>

      {data.componentEffects.length ? (
        <div className="mt-2 rounded-md border border-white/[0.08] bg-black/20">
          {data.componentEffects.map((effect) => (
            <div
              key={`${effect.componentPlannerId ?? effect.aero_component_id ?? effect.componentLabel}-${effect.effect_model_type}`}
              className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.1fr)] gap-2 border-b border-white/[0.06] px-2 py-1.5 text-[9px] last:border-b-0"
            >
              <span className="truncate font-semibold text-neutral-200">{effect.componentLabel ?? "Aero component"}</span>
              <span className="truncate text-neutral-500">{effectBadgeLabel(effect.effect_model_type)}</span>
              <span className="tabular-nums text-emerald-300">
                F {scaledEffectRange(effect, "front", speedKmh)} / R {scaledEffectRange(effect, "rear", speedKmh)}
              </span>
              <span className="truncate text-neutral-500">{effect.calculation_method ?? effect.source_name ?? "Estimated"}</span>
            </div>
          ))}
        </div>
      ) : null}

      {impact.isEstimated ? (
        <p className="mt-2 text-[9px] leading-relaxed text-amber-200/75">
          Estimated result. Aftermarket aerodynamic effects depend on geometry, ride height, mounting angle and airflow interaction.
        </p>
      ) : null}
    </section>
  );
}
