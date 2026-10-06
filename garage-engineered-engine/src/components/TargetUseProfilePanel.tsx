import type { GarageTargetUseProfileId } from "../data/garageTargetUseProfile";
import { GARAGE_TARGET_USE_PROFILES } from "../data/garageTargetUseProfile";
import { useGarageWorkspaceStore } from "../store/garageWorkspaceStore";

function ProfileIcon({ id, active }: { id: GarageTargetUseProfileId; active: boolean }) {
  const stroke = active ? "#22d3ee" : "currentColor";
  const common = { fill: "none", stroke, strokeWidth: 1.4, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

  switch (id) {
    case "street":
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
          <path {...common} d="M6 14h12l-1.5 4H7.5L6 14Z" />
          <path {...common} d="M8 14V9h8v5" />
          <circle {...common} cx="8.5" cy="18.5" r="1.2" />
          <circle {...common} cx="15.5" cy="18.5" r="1.2" />
        </svg>
      );
    case "track":
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
          <path {...common} d="M5 5h6v6H5z" />
          <path {...common} d="M13 5h6v6h-6z" />
          <path {...common} d="M5 13h6v6H5z" />
          <path {...common} d="M13 13h6v6h-6z" />
        </svg>
      );
    case "rally":
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
          <path {...common} d="M4 15h13l2 3H6l-2-3Z" />
          <path {...common} d="M7 15l3-6h7l2 4" />
          <path {...common} d="M16 7l2-2 2 1-1 2" />
          <circle {...common} cx="8" cy="18" r="1.1" />
          <circle {...common} cx="15" cy="18" r="1.1" />
        </svg>
      );
    case "drift":
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
          <path {...common} d="M5 16h12l-1.5 3H6.5L5 16Z" />
          <path {...common} d="M7 16l4-8h6l2 5" />
          <path {...common} d="M4 19h3" />
          <circle {...common} cx="8" cy="19" r="1" />
          <circle {...common} cx="15" cy="19" r="1" />
        </svg>
      );
    case "drag":
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
          <path {...common} d="M4 15h14l1.5 3H5.5L4 15Z" />
          <path {...common} d="M6 15l2-5h8l2 3" />
          <path {...common} d="M18 10h2v2" />
          <circle {...common} cx="8" cy="18" r="1.1" />
          <circle {...common} cx="16" cy="18" r="1.1" />
        </svg>
      );
    case "top_speed":
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
          <circle {...common} cx="12" cy="13" r="7" />
          <path {...common} d="M12 13V8" />
          <path {...common} d="M12 13l3.5 2" />
          <path {...common} d="M9 6h6" />
        </svg>
      );
    case "dtm":
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
          <path {...common} d="M6 14h10l1.5 4H7.5L6 14Z" />
          <path {...common} d="M8 14V9h7v5" />
          <path {...common} d="M15 7h4v2h-4z" />
          <circle {...common} cx="8.5" cy="18" r="1" />
          <circle {...common} cx="14.5" cy="18" r="1" />
        </svg>
      );
    case "show":
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
          <circle {...common} cx="12" cy="12" r="4" />
          <path {...common} d="M12 4v2M12 18v2M4 12h2M18 12h2M6.3 6.3l1.4 1.4M16.3 16.3l1.4 1.4M6.3 17.7l1.4-1.4M16.3 7.7l1.4-1.4" />
        </svg>
      );
  }
}

/** Sidebar grid selector for vehicle target use / driving profile. */
export function TargetUseProfilePanel() {
  const selected = useGarageWorkspaceStore((s) => s.targetUseProfileId);
  const setSelected = useGarageWorkspaceStore((s) => s.setTargetUseProfileId);

  return (
    <section className="flex min-w-0 shrink-0 flex-col overflow-visible rounded-md border border-white/10 bg-[#080c11]/95 shadow-inner">
      <h2 className="shrink-0 border-b border-white/[0.08] px-2 py-1.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-neutral-300">
        Target use / profile
      </h2>
      <div className="grid grid-cols-4 gap-1 p-1.5" role="radiogroup" aria-label="Target use profile">
        {GARAGE_TARGET_USE_PROFILES.map((profile) => {
          const active = selected === profile.id;
          return (
            <button
              key={profile.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setSelected(profile.id)}
              className={[
                "relative flex min-h-[3.25rem] flex-col items-center justify-center gap-0.5 rounded-md border px-0.5 py-1 transition",
                active
                  ? "border-cyan-400/55 bg-cyan-500/10 text-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.12)]"
                  : "border-white/[0.08] bg-black/25 text-neutral-500 hover:border-white/20 hover:text-neutral-300",
              ].join(" ")}
            >
              {active ? (
                <span
                  className="absolute right-0.5 top-0.5 text-[7px] font-bold leading-none text-cyan-400"
                  aria-hidden
                >
                  ✓
                </span>
              ) : null}
              <ProfileIcon id={profile.id} active={active} />
              <span className="text-[7px] font-semibold uppercase tracking-wide leading-none">{profile.label}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
