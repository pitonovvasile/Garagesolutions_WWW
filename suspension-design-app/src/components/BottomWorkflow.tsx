import type { WorkflowStep } from "../store/suspensionStore";
import { useSuspensionStore } from "../store/suspensionStore";

const STEPS: { id: WorkflowStep; label: string }[] = [
  { id: "design", label: "Design" },
  { id: "simulate", label: "Simulate" },
  { id: "analyze", label: "Analyze" },
  { id: "optimize", label: "Optimize" },
  { id: "save", label: "Save & Share" },
];

export function BottomWorkflow() {
  const step = useSuspensionStore((s) => s.workflow);
  const setStep = useSuspensionStore((s) => s.setWorkflow);

  return (
    <footer className="flex shrink-0 items-center justify-center gap-2 border-t border-white/10 bg-[#070a10] px-3 py-2">
      {STEPS.map((s, i) => {
        const active = step === s.id;
        return (
          <div key={s.id} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setStep(s.id)}
              className={[
                "relative rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] transition",
                active
                  ? "bg-gradient-to-r from-cyan-500/25 to-blue-500/20 text-white shadow-[0_0_24px_rgba(34,211,238,0.12)] ring-1 ring-cyan-400/40"
                  : "text-neutral-500 hover:bg-white/5 hover:text-neutral-200",
              ].join(" ")}
            >
              {active && (
                <span className="absolute inset-x-3 -top-px h-px bg-gradient-to-r from-transparent via-cyan-300 to-transparent opacity-80" />
              )}
              {s.label}
            </button>
            {i < STEPS.length - 1 ? (
              <span className="hidden text-neutral-600 sm:inline" aria-hidden>
                →
              </span>
            ) : null}
          </div>
        );
      })}
    </footer>
  );
}
