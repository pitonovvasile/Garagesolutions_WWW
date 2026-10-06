import type { PerformanceSubsystemPanel, ReadinessRow } from "../lib/performanceSystemReadiness";
import { readinessStatusClass } from "../lib/performanceSystemReadiness";
import { usePerformanceStore, type PerformanceViewMode } from "../store/performanceStore";

function rowValueClass(tone: ReadinessRow["tone"]): string {
  if (tone === "bad") return "text-red-400";
  if (tone === "warn") return "text-orange-400";
  if (tone === "muted") return "text-neutral-500";
  return "text-neutral-200";
}

export function PerformanceSubsystemPanelCard({
  panel,
  compact = false,
}: {
  panel: PerformanceSubsystemPanel;
  compact?: boolean;
}) {
  return (
    <article className="flex h-full min-w-[8.75rem] max-w-[11rem] flex-1 flex-col border-r border-white/[0.07] bg-[#080c11]/80 last:border-r-0">
      <div className={`flex shrink-0 flex-col gap-1 border-b border-white/[0.06] ${compact ? "px-2 py-1.5" : "px-2.5 py-2"}`}>
        <div className="flex items-start gap-1.5">
          <span className="text-sm leading-none text-cyan-500/80" aria-hidden>
            {panel.glyph}
          </span>
          <h3 className="min-w-0 text-[8px] font-semibold uppercase leading-tight tracking-[0.08em] text-neutral-200">
            {panel.title}
          </h3>
        </div>
        <p className={`text-[8px] font-bold uppercase tracking-wide ${readinessStatusClass(panel.status.tone)}`}>
          {panel.status.label}
        </p>
      </div>

      <div className={`min-h-0 flex-1 overflow-y-auto ${compact ? "px-2 py-1" : "px-2.5 py-1.5"}`}>
        <dl className="space-y-1">
          {panel.rows.map((row) => (
            <div key={`${panel.id}-${row.label}`}>
              <dt className="text-[7px] font-semibold uppercase tracking-wide text-neutral-500">{row.label}</dt>
              <dd className={`text-[8px] font-medium leading-snug ${rowValueClass(row.tone)}`}>{row.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className={`shrink-0 border-t border-white/[0.06] ${compact ? "p-1.5" : "p-2"}`}>
        <button
          type="button"
          className="w-full rounded border border-cyan-500/30 bg-cyan-500/10 py-1 text-[7px] font-semibold uppercase tracking-wide text-cyan-100 transition hover:bg-cyan-500/20"
        >
          {panel.actionLabel}
        </button>
      </div>
    </article>
  );
}

function PerformanceViewModeToggle() {
  const viewMode = usePerformanceStore((s) => s.viewMode);
  const setViewMode = usePerformanceStore((s) => s.setViewMode);
  const modes: { id: PerformanceViewMode; label: string }[] = [
    { id: "simple", label: "Simple" },
    { id: "technical", label: "Technical" },
    { id: "expert", label: "Expert" },
  ];

  return (
    <div className="flex items-center gap-1 rounded border border-white/10 p-0.5">
      <span className="px-1 text-[7px] font-semibold uppercase tracking-wide text-neutral-500">View</span>
      {modes.map((m) => (
        <button
          key={m.id}
          type="button"
          onClick={() => setViewMode(m.id)}
          className={[
            "rounded px-1.5 py-0.5 text-[7px] font-semibold uppercase tracking-wide transition",
            viewMode === m.id
              ? "bg-cyan-500/20 text-cyan-100 ring-1 ring-cyan-400/35"
              : "text-neutral-500 hover:text-neutral-300",
          ].join(" ")}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}

export function PerformanceSystemReadinessToolbar() {
  return (
    <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-white/10 bg-[#060910] px-2 py-1.5">
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-[8px] text-neutral-500">
        <span className="font-semibold uppercase tracking-wide text-neutral-400">Status legend</span>
        <span className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Ready</span>
        <span className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400/70" /> Good</span>
        <span className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-orange-400" /> Upgrade</span>
        <span className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-red-400" /> Critical</span>
        <span className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-neutral-500" /> Missing data</span>
      </div>
      <p className="hidden max-w-md text-center text-[8px] leading-snug text-neutral-600 lg:block">
        Calculations are estimates based on provided data and part specifications. Actual results may vary.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <PerformanceViewModeToggle />
        <button
          type="button"
          className="rounded border border-white/10 bg-black/30 px-2 py-1 text-[8px] font-semibold uppercase tracking-wide text-neutral-400 hover:border-cyan-500/35 hover:text-cyan-200"
        >
          Export report
        </button>
        <button
          type="button"
          className="rounded border border-cyan-500/35 bg-cyan-500/10 px-2 py-1 text-[8px] font-semibold uppercase tracking-wide text-cyan-100 hover:bg-cyan-500/20"
        >
          Save setup
        </button>
      </div>
    </div>
  );
}

export function PerformanceSystemReadinessStrip({
  panels,
  compact = false,
}: {
  panels: PerformanceSubsystemPanel[];
  compact?: boolean;
}) {
  return (
    <div
      className={[
        "flex min-h-0 overflow-x-auto overflow-y-hidden border-b border-white/10 bg-[#070a10]",
        compact ? "max-h-[min(34vh,280px)]" : "min-h-[min(52vh,420px)] flex-1",
      ].join(" ")}
    >
      {panels.map((panel) => (
        <PerformanceSubsystemPanelCard key={panel.id} panel={panel} compact={compact} />
      ))}
    </div>
  );
}
