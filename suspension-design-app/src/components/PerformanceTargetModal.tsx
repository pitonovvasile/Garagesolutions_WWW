import { useEffect, useState } from "react";
import {
  usePerformanceStore,
  type PerformanceBudgetLevel,
  type PerformanceBuildType,
  type PerformanceReliability,
} from "../store/performanceStore";

const BUILD_TYPES: PerformanceBuildType[] = ["Turbo", "NA", "Supercharged", "Hybrid"];
const RELIABILITY: PerformanceReliability[] = ["OEM+", "Street Performance", "Track"];
const BUDGET: PerformanceBudgetLevel[] = ["Low", "Medium", "High"];

export function PerformanceTargetModal() {
  const open = usePerformanceStore((s) => s.targetModalOpen);
  const setOpen = usePerformanceStore((s) => s.setTargetModalOpen);
  const buildType = usePerformanceStore((s) => s.buildType);
  const fuel = usePerformanceStore((s) => s.fuel);
  const targetPowerHp = usePerformanceStore((s) => s.targetPowerHp);
  const reliability = usePerformanceStore((s) => s.reliability);
  const budgetLevel = usePerformanceStore((s) => s.budgetLevel);
  const setBuildType = usePerformanceStore((s) => s.setBuildType);
  const setFuel = usePerformanceStore((s) => s.setFuel);
  const setTargetPowerHp = usePerformanceStore((s) => s.setTargetPowerHp);
  const setReliability = usePerformanceStore((s) => s.setReliability);
  const setBudgetLevel = usePerformanceStore((s) => s.setBudgetLevel);

  const [draftBuild, setDraftBuild] = useState(buildType);
  const [draftFuel, setDraftFuel] = useState(fuel);
  const [draftPower, setDraftPower] = useState(String(targetPowerHp));
  const [draftReliability, setDraftReliability] = useState(reliability);
  const [draftBudget, setDraftBudget] = useState(budgetLevel);

  useEffect(() => {
    if (!open) return;
    setDraftBuild(buildType);
    setDraftFuel(fuel);
    setDraftPower(String(targetPowerHp));
    setDraftReliability(reliability);
    setDraftBudget(budgetLevel);
  }, [open, buildType, fuel, targetPowerHp, reliability, budgetLevel]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  if (!open) return null;

  const fieldClass =
    "w-full rounded-md border border-white/10 bg-[#080c11] px-2 py-1.5 text-sm text-white outline-none focus:border-cyan-500/40";
  const labelClass = "mb-1 block text-[10px] font-semibold uppercase tracking-wide text-neutral-500";

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="perf-target-title"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-xl border border-white/10 bg-[#0b0f14] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <h2 id="perf-target-title" className="text-sm font-semibold uppercase tracking-[0.12em] text-cyan-300">
            Edit target
          </h2>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-md border border-white/10 px-2 py-1 text-xs text-neutral-400 hover:bg-white/5 hover:text-white"
          >
            Anulează
          </button>
        </div>
        <form
          className="space-y-3 px-4 py-4"
          onSubmit={(e) => {
            e.preventDefault();
            const hp = Number(draftPower);
            setBuildType(draftBuild);
            setFuel(draftFuel.trim() || "RON 98");
            if (Number.isFinite(hp) && hp > 0) setTargetPowerHp(Math.round(hp));
            setReliability(draftReliability);
            setBudgetLevel(draftBudget);
            setOpen(false);
          }}
        >
          <div>
            <label className={labelClass} htmlFor="perf-build-type">
              Build type
            </label>
            <select
              id="perf-build-type"
              className={fieldClass}
              value={draftBuild}
              onChange={(e) => setDraftBuild(e.target.value as PerformanceBuildType)}
            >
              {BUILD_TYPES.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor="perf-fuel">
              Fuel
            </label>
            <input
              id="perf-fuel"
              className={fieldClass}
              value={draftFuel}
              onChange={(e) => setDraftFuel(e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="perf-target-power">
              Target power (hp)
            </label>
            <input
              id="perf-target-power"
              type="number"
              min={1}
              step={1}
              className={fieldClass}
              value={draftPower}
              onChange={(e) => setDraftPower(e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="perf-reliability">
              Reliability
            </label>
            <select
              id="perf-reliability"
              className={fieldClass}
              value={draftReliability}
              onChange={(e) => setDraftReliability(e.target.value as PerformanceReliability)}
            >
              {RELIABILITY.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor="perf-budget">
              Budget level
            </label>
            <select
              id="perf-budget"
              className={fieldClass}
              value={draftBudget}
              onChange={(e) => setDraftBudget(e.target.value as PerformanceBudgetLevel)}
            >
              {BUDGET.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="w-full rounded-md border border-cyan-500/35 bg-cyan-500/15 py-2 text-xs font-semibold uppercase tracking-wide text-cyan-100 hover:bg-cyan-500/25"
          >
            Salvează ținta
          </button>
        </form>
      </div>
    </div>
  );
}
