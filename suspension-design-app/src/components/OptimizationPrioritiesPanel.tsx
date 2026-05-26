import { GARAGE_OPTIMIZATION_PRIORITY_META } from "../data/garageOptimizationPriorities";
import { useGarageWorkspaceStore } from "../store/garageWorkspaceStore";

function PrioritySlider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-0">
      <div className="flex items-baseline justify-between gap-1.5 leading-none">
        <span className="text-[8px] font-medium text-neutral-300">{label}</span>
        <span className="text-[8px] font-semibold tabular-nums text-cyan-300/90">{value}%</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-0.5 h-0.5 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-cyan-400 [&::-webkit-slider-thumb]:h-2 [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-400"
        aria-label={label}
      />
    </div>
  );
}

export function OptimizationPrioritiesPanel() {
  const priorities = useGarageWorkspaceStore((s) => s.optimizationPriorities);
  const setPriority = useGarageWorkspaceStore((s) => s.setOptimizationPriority);

  return (
    <section className="flex min-w-0 shrink-0 flex-col overflow-visible rounded-md border border-white/10 bg-[#080c11]/95 shadow-inner">
      <h2 className="shrink-0 border-b border-white/[0.08] px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.14em] text-neutral-300">
        Optimization priorities
      </h2>
      <div className="space-y-1 px-2 py-1">
        {GARAGE_OPTIMIZATION_PRIORITY_META.map((item) => (
          <PrioritySlider
            key={item.id}
            label={item.label}
            value={priorities[item.id]}
            onChange={(v) => setPriority(item.id, v)}
          />
        ))}
      </div>
    </section>
  );
}
