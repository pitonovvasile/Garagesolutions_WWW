import brakingIcon from "../../../assets/garage-braking-system-icon.png";

const NAV_ITEMS = [
  { id: "overview", label: "Overview", icon: "◎" },
  { id: "catalog", label: "Parts catalog", icon: "▦" },
  { id: "fitment", label: "Fitment", icon: "⬡" },
  { id: "saved", label: "Saved setup", icon: "✓" },
] as const;

const QUICK_ACTIONS = [
  { label: "Browse brake discs", section: "catalog" },
  { label: "Browse calipers", section: "catalog" },
  { label: "Compare brake fluids", section: "catalog" },
  { label: "Check fitment", section: "fitment" },
  { label: "Save braking setup", section: "saved" },
] as const;

export function BrakingRightPanel() {
  function scrollTo(id: string) {
    document.getElementById(`br-center-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <aside
      id="br-right-panel"
      className="flex w-[360px] shrink-0 flex-col gap-3 overflow-y-auto border-l border-white/10 bg-[#0b0f14] p-3"
    >
      <header className="shrink-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-100">
          Braking navigator
        </p>
        <p className="mt-0.5 text-[10px] text-neutral-500">Discs · calipers · fluid · lines</p>
      </header>

      <nav className="rounded-lg border border-white/10 bg-[#080c11]/90" aria-label="Braking sections">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => scrollTo(item.id)}
            className="flex w-full items-center gap-2 border-b border-white/[0.06] px-3 py-2 text-left text-[11px] text-neutral-300 transition last:border-b-0 hover:bg-rose-500/10 hover:text-rose-100"
          >
            <span className="w-5 shrink-0 text-center text-[10px] text-rose-400/80" aria-hidden>
              {item.icon}
            </span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <section className="rounded-lg border border-white/10 bg-[#080c11]/90 p-3">
        <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-rose-400/90">Quick actions</p>
        <ul className="mt-2 space-y-1">
          {QUICK_ACTIONS.map((item) => (
            <li key={item.label}>
              <button
                type="button"
                onClick={() => scrollTo(item.section)}
                className="block w-full rounded-md px-2 py-1.5 text-left text-[10px] text-neutral-300 transition hover:bg-rose-500/10 hover:text-rose-100"
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-lg border border-rose-500/20 bg-rose-500/[0.06] p-3">
        <div className="flex items-center gap-2">
          <img
            src={brakingIcon}
            alt=""
            className="h-10 w-10 rounded-md border border-white/10 object-contain p-0.5"
          />
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-wide text-rose-300/90">Module</p>
            <p className="text-[11px] font-medium text-neutral-100">Sistemul de frânare</p>
          </div>
        </div>
        <p className="mt-2 text-[10px] leading-relaxed text-neutral-400">
          Discuri, etriere, lichid și linii — același shell ca Garage Solutions Engineered Engine.
        </p>
      </section>
    </aside>
  );
}
