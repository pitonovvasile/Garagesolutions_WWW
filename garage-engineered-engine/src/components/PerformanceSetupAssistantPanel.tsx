import { useMemo, type ReactNode } from "react";
import { useGarageCars } from "../hooks/useGarageCars";
import { usePerformanceOeBaseline } from "../hooks/usePerformanceOeBaseline";
import { buildPerformanceCurveModel } from "../lib/performanceCurveModel";
import {
  buildPerformanceSetupAssistant,
  readinessStatusClass,
} from "../lib/performanceSetupAssistant";
import { usePerformanceStore } from "../store/performanceStore";
import { useSuspensionStore } from "../store/suspensionStore";

function PanelCard({
  title,
  titleClass = "text-neutral-400",
  children,
  actionLabel,
  onAction,
}: {
  title?: string;
  titleClass?: string;
  children: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <section className="rounded-lg border border-white/10 bg-[#080c11]/90">
      {title ? (
        <h3
          className={[
            "border-b border-white/[0.06] px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.14em]",
            titleClass,
          ].join(" ")}
        >
          {title}
        </h3>
      ) : null}
      <div className="px-3 py-2.5">{children}</div>
      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="mx-3 mb-3 w-[calc(100%-1.5rem)] rounded-md border border-white/10 bg-black/20 py-1.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-neutral-300 transition hover:border-amber-500/30 hover:bg-amber-500/10 hover:text-amber-100"
        >
          {actionLabel}
        </button>
      ) : null}
    </section>
  );
}

export function PerformanceSetupAssistantPanel() {
  const garageCars = useGarageCars();
  const garageCarIndex = useSuspensionStore((s) => s.garageCarIndex);
  const linkedCar =
    garageCarIndex !== null && garageCarIndex >= 0 && garageCarIndex < garageCars.length
      ? garageCars[garageCarIndex]!
      : null;

  const targetHp = usePerformanceStore((s) => s.targetPowerHp);
  const buildType = usePerformanceStore((s) => s.buildType);
  const budgetLevel = usePerformanceStore((s) => s.budgetLevel);
  const fuel = usePerformanceStore((s) => s.fuel);
  const reliability = usePerformanceStore((s) => s.reliability);
  const setTargetModalOpen = usePerformanceStore((s) => s.setTargetModalOpen);
  const setActiveCenterTab = usePerformanceStore((s) => s.setActiveCenterTab);

  const { baseline } = usePerformanceOeBaseline(linkedCar);

  const model = useMemo(
    () =>
      buildPerformanceCurveModel({
        baseline,
        targetHp,
        buildType,
        budgetLevel,
        engineLabel: linkedCar?.engine ?? "",
      }),
    [baseline, targetHp, buildType, budgetLevel, linkedCar?.engine],
  );

  const assistant = useMemo(
    () =>
      buildPerformanceSetupAssistant({
        model,
        baseline,
        buildType,
        fuel,
        reliability,
        targetHp,
      }),
    [model, baseline, buildType, fuel, reliability, targetHp],
  );

  return (
    <aside
      id="perf-setup-assistant"
      className="flex w-[360px] shrink-0 flex-col gap-3 overflow-y-auto border-l border-white/10 bg-[#0b0f14] p-3"
    >
      <header className="shrink-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-100">
          Setup assistant
        </p>
        <p className="mt-0.5 text-[10px] text-neutral-500">Target based performance build</p>
      </header>

      <PanelCard title="Target active" titleClass="text-cyan-400/90">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-semibold leading-snug text-neutral-100">
              {assistant.targetSummary}
            </p>
            <p className="mt-1 text-[10px] text-neutral-500">{assistant.reliability}</p>
          </div>
          <button
            type="button"
            onClick={() => setTargetModalOpen(true)}
            className="shrink-0 rounded border border-white/10 px-2 py-0.5 text-[8px] font-semibold uppercase tracking-wide text-neutral-400 transition hover:border-amber-500/35 hover:text-amber-200"
          >
            Edit
          </button>
        </div>
      </PanelCard>

      <PanelCard>
        <div className="flex items-start gap-2.5">
          <div
            className={[
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border",
              assistant.verdictAchievable
                ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-400"
                : "border-amber-500/40 bg-amber-500/15 text-amber-400",
            ].join(" ")}
            aria-hidden
          >
            {assistant.verdictAchievable ? (
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.895 3.893 7.48-9.825a.75.75 0 011.05-.143z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <span className="text-sm font-bold">!</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p
              className={[
                "text-[9px] font-semibold uppercase tracking-[0.14em]",
                assistant.verdictAchievable ? "text-emerald-400" : "text-amber-400",
              ].join(" ")}
            >
              Build verdict
            </p>
            <p className="mt-1 text-[11px] font-medium text-neutral-100">{assistant.verdictMessage}</p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className={[
                  "h-full rounded-full transition-all",
                  assistant.verdictAchievable ? "bg-emerald-500" : "bg-amber-500",
                ].join(" ")}
                style={{ width: `${Math.max(8, Math.min(100, assistant.verdictProgressPct))}%` }}
              />
            </div>
          </div>
        </div>
      </PanelCard>

      <PanelCard
        title="Limiting systems"
        titleClass="text-orange-400/90"
        actionLabel="View details"
        onAction={() => setActiveCenterTab(2)}
      >
        <ol className="space-y-1.5">
          {assistant.limitingSystems.map((item) => (
            <li key={item.rank} className="flex items-baseline justify-between gap-2 text-[10px]">
              <span className="text-neutral-400">
                {item.rank}. {item.name}
              </span>
              <span className={`shrink-0 font-semibold uppercase tracking-wide ${readinessStatusClass(item.tone)}`}>
                {item.status}
              </span>
            </li>
          ))}
        </ol>
      </PanelCard>

      <PanelCard
        title="Next priority parts"
        titleClass="text-emerald-400/90"
        actionLabel="View all recommendations"
        onAction={() => setActiveCenterTab(6)}
      >
        <div className="space-y-3">
          <div>
            <p className="mb-1.5 text-[8px] font-semibold uppercase tracking-[0.12em] text-red-400/90">Critical</p>
            <ul className="space-y-1">
              {assistant.criticalParts.map((part) => (
                <li key={part.label} className="flex items-baseline justify-between gap-2 text-[10px]">
                  <span className="text-neutral-200">{part.label}</span>
                  <span className="shrink-0 text-[9px] uppercase tracking-wide text-neutral-500">
                    ({part.optionCount} options)
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-1.5 text-[8px] font-semibold uppercase tracking-[0.12em] text-emerald-400/90">
              Recommended
            </p>
            <ul className="space-y-1">
              {assistant.recommendedParts.map((part) => (
                <li key={part.label} className="flex items-baseline justify-between gap-2 text-[10px]">
                  <span className="text-neutral-200">{part.label}</span>
                  <span className="shrink-0 text-[9px] uppercase tracking-wide text-neutral-500">
                    ({part.optionCount} options)
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </PanelCard>
    </aside>
  );
}
