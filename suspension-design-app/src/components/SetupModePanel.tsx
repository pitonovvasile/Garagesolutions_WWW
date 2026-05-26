import { GARAGE_SETUP_MODES } from "../data/garageOptimizationPriorities";
import { useGarageWorkspaceStore } from "../store/garageWorkspaceStore";

const RECOMMENDED_SECTION_IDS = [
  "aero-center-planner",
  "aero-center-current-setup",
  "aero-center-saved",
  "tx-center-recommended",
  "br-center-catalog",
] as const;

function scrollToRecommendations() {
  for (const id of RECOMMENDED_SECTION_IDS) {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
  }
}

export function SetupModePanel() {
  const setupMode = useGarageWorkspaceStore((s) => s.setupMode);
  const setSetupMode = useGarageWorkspaceStore((s) => s.setSetupMode);

  return (
    <section className="flex min-w-0 shrink-0 flex-col overflow-visible rounded-md border border-white/10 bg-[#080c11]/95 shadow-inner">
      <h2 className="shrink-0 border-b border-white/[0.08] px-2 py-1.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-neutral-300">
        Setup mode
      </h2>
      <div className="px-2 py-2">
        <div className="grid grid-cols-3 gap-1" role="radiogroup" aria-label="Setup mode">
          {GARAGE_SETUP_MODES.map((mode) => {
            const active = setupMode === mode.id;
            return (
              <button
                key={mode.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setSetupMode(mode.id)}
                className={[
                  "rounded-md border px-1 py-1.5 text-[7px] font-semibold uppercase leading-tight tracking-wide transition",
                  active
                    ? "border-cyan-400/55 bg-cyan-500/10 text-cyan-200 shadow-[0_0_10px_rgba(34,211,238,0.12)]"
                    : "border-white/[0.08] bg-black/25 text-neutral-500 hover:border-white/20 hover:text-neutral-300",
                ].join(" ")}
              >
                {mode.label}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={scrollToRecommendations}
          className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-md border border-cyan-500/35 bg-cyan-500/10 px-2 py-1.5 text-[8px] font-semibold uppercase tracking-[0.12em] text-cyan-100 transition hover:bg-cyan-500/20"
        >
          <span className="text-cyan-400/90" aria-hidden>
            ✦
          </span>
          Generate recommendations
        </button>
      </div>
    </section>
  );
}
