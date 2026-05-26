import type { MetricDebugBlock, MetricSource } from "../lib/metricProvenance";
import { SOURCE_HINT, SOURCE_SHORT } from "../lib/metricProvenance";

const BADGE: Record<MetricSource, string> = {
  derived: "border-emerald-500/35 bg-emerald-500/10 text-emerald-200/95",
  declared: "border-sky-500/30 bg-sky-500/10 text-sky-200/95",
  estimated: "border-amber-500/35 bg-amber-500/10 text-amber-100/95",
  placeholder: "border-white/10 bg-white/5 text-neutral-500",
  manual: "border-violet-500/35 bg-violet-500/12 text-violet-100/95",
};

export function MetricTraceRow({
  label,
  value,
  source,
  explanation,
  simulated,
  engineeringDebug,
  debug,
}: {
  label: string;
  value: string;
  source: MetricSource;
  /** One short line under the row. */
  explanation: string;
  /** True only if value comes from geometry/solver path (not catalog-only). */
  simulated: boolean;
  engineeringDebug: boolean;
  debug?: MetricDebugBlock;
}) {
  const simLabel = simulated ? "simulated: yes" : "simulated: no";
  return (
    <div className="border-b border-white/5 py-1.5 text-xs last:border-0">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-neutral-500">{label}</span>
            <span
              className={[
                "shrink-0 rounded border px-1 py-px text-[8px] font-semibold uppercase tracking-wide",
                BADGE[source],
              ].join(" ")}
              title={SOURCE_HINT[source]}
            >
              {SOURCE_SHORT[source]}
            </span>
            <span
              className="text-[8px] text-neutral-600"
              title={simulated ? "Driven by geometry path" : "Not from live geometry"}
            >
              ({simLabel})
            </span>
          </div>
          <p className="mt-0.5 text-[9px] leading-snug text-neutral-500">{explanation}</p>
        </div>
        <span className="shrink-0 font-mono text-neutral-100 tabular-nums">{value}</span>
      </div>
      {engineeringDebug && debug ? (
        <div className="mt-1.5 rounded border border-white/10 bg-black/40 px-2 py-1.5 font-mono text-[9px] leading-relaxed text-neutral-400">
          <div>
            <span className="text-neutral-500">formula:</span> {debug.formula}
          </div>
          <div>
            <span className="text-neutral-500">inputs:</span> {debug.inputs}
          </div>
          <div>
            <span className="text-neutral-500">confidence:</span> {debug.confidence}
          </div>
          <div>
            <span className="text-neutral-500">kinematic core:</span> {debug.kinematicallySimulated ? "yes" : "no"}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** Compact cell for OEM alignment table (value + badge + title). */
export function MetricTraceCell({
  value,
  source,
  title,
}: {
  value: string;
  source: MetricSource;
  title: string;
}) {
  return (
    <div className="font-mono" title={title}>
      <div>{value}</div>
      <div
        className={[
          "mt-0.5 inline-block rounded border px-1 py-px text-[7px] font-semibold uppercase tracking-wide",
          BADGE[source],
        ].join(" ")}
      >
        {SOURCE_SHORT[source]}
      </div>
    </div>
  );
}
