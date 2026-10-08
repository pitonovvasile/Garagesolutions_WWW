import transmissionIcon from "../../../assets/transmission-icon.png";
import { TRANSMISSION_NAV_SECTIONS } from "../data/transmissionCatalogStructure";
import { useTransmissionDrivetrainProfile } from "../hooks/useTransmissionDrivetrainProfile";
import { useSuspensionAssistantStore } from "../store/suspensionAssistantStore";
import { useTransmissionStore } from "../store/transmissionStore";
import type { TransmissionNavSectionId } from "../data/transmissionCatalogStructure";

const QUICK_ACTIONS = [
  { label: "Find AWD service kit", section: "recommended" as const },
  { label: "Compare transmission oils", section: "catalog" as const },
  { label: "Compare differential oils", section: "catalog" as const },
  { label: "Check transfer case compatibility", section: "awd-systems" as const },
  { label: "View drivetrain diagram", action: "diagram" as const },
  { label: "Save transmission setup", section: "saved" as const },
];

const SECTION_ICONS: Partial<Record<TransmissionNavSectionId, string>> = {
  overview: "◎",
  recommended: "★",
  "awd-systems": "4×",
  catalog: "▦",
  upgrades: "↑",
  "drivetrain-data": "⬡",
  saved: "✓",
};

export function TransmissionRightPanel() {
  const activeSection = useTransmissionStore((s) => s.activeSection);
  const setActiveSection = useTransmissionStore((s) => s.setActiveSection);
  const setDrivetrainDetailsExpanded = useTransmissionStore((s) => s.setDrivetrainDetailsExpanded);
  const { profile } = useTransmissionDrivetrainProfile();
  const setDrivetrainModalOpen = useSuspensionAssistantStore((s) => s.setDrivetrainModalOpen);

  function scrollToSection(id: TransmissionNavSectionId) {
    setActiveSection(id);
    if (id === "drivetrain-data") setDrivetrainDetailsExpanded(true);
    document.getElementById(`tx-center-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handleQuickAction(item: (typeof QUICK_ACTIONS)[number]) {
    if ("action" in item && item.action === "diagram") {
      setDrivetrainModalOpen(true);
      return;
    }
    if ("section" in item) scrollToSection(item.section);
  }

  return (
    <aside
      id="tx-right-panel"
      className="flex w-[360px] shrink-0 flex-col gap-3 overflow-y-auto border-l border-white/10 bg-[#0b0f14] p-3"
    >
      <header className="shrink-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-100">
          Transmission navigator
        </p>
        <p className="mt-0.5 text-[10px] text-neutral-500">
          {profile.isAwdFamily ? profile.drivetrainType : profile.transmissionType} · {profile.fitmentMode}
        </p>
      </header>

      <nav className="rounded-lg border border-white/10 bg-[#080c11]/90" aria-label="Transmission sections">
        {TRANSMISSION_NAV_SECTIONS.map((item) => {
          const active = activeSection === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => scrollToSection(item.id)}
              className={[
                "flex w-full items-center gap-2 border-b border-white/[0.06] px-3 py-2 text-left text-[11px] transition last:border-b-0",
                active
                  ? "bg-violet-500/10 text-violet-100"
                  : "text-neutral-300 hover:bg-white/[0.04] hover:text-white",
              ].join(" ")}
            >
              <span className="w-5 shrink-0 text-center text-[10px] text-violet-400/80" aria-hidden>
                {SECTION_ICONS[item.id] ?? "·"}
              </span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <section className="rounded-lg border border-white/10 bg-[#080c11]/90 p-3">
        <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-cyan-400/90">Quick actions</p>
        <ul className="mt-2 space-y-1">
          {QUICK_ACTIONS.map((item) => (
            <li key={item.label}>
              <button
                type="button"
                onClick={() => handleQuickAction(item)}
                className="block w-full rounded-md px-2 py-1.5 text-left text-[10px] text-neutral-300 transition hover:bg-violet-500/10 hover:text-violet-100"
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-lg border border-violet-500/20 bg-violet-500/[0.06] p-3">
        <div className="flex items-center gap-2">
          <img
            src={transmissionIcon}
            alt=""
            className="h-10 w-10 rounded-md border border-white/10 object-contain p-0.5"
          />
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-wide text-violet-300/90">Module</p>
            <p className="text-[11px] font-medium text-neutral-100">Transmission &amp; AWD assistant</p>
          </div>
        </div>
        <p className="mt-2 text-[10px] leading-relaxed text-neutral-400">
          Service-first workflow: recommended paths, AWD systems, catalog and save/buy.
        </p>
      </section>
    </aside>
  );
}
