import { useTransmissionDrivetrainProfile } from "../hooks/useTransmissionDrivetrainProfile";
import { useSuspensionAssistantStore } from "../store/suspensionAssistantStore";
import { useTransmissionStore } from "../store/transmissionStore";

const footerLinkClass =
  "inline-flex items-center gap-0.5 text-[8px] font-semibold uppercase tracking-wide text-violet-400/90 transition hover:text-violet-300";

function Chevron({ up }: { up?: boolean }) {
  return (
    <span className="text-violet-500/80" aria-hidden>
      {up ? "▴" : "▾"}
    </span>
  );
}

/** Footer compact, collapsible, read-only — editor prin modal la cerere. */
export function TransmissionBottomWorkflow() {
  const setDrivetrainModalOpen = useSuspensionAssistantStore((s) => s.setDrivetrainModalOpen);
  const footerDrivetrain = useSuspensionAssistantStore((s) => s.vehicleFooterDrivetrainManual);
  const { profile } = useTransmissionDrivetrainProfile();
  const footerCollapsed = useTransmissionStore((s) => s.footerCollapsed);
  const toggleFooterCollapsed = useTransmissionStore((s) => s.toggleFooterCollapsed);

  const stats = [
    ["Transmission", profile.transmissionType],
    ["Gears", profile.gearCount !== "—" ? `${profile.gearCount}-spd` : "—"],
    ["Drivetrain", profile.drivetrainType],
    ["Transfer case", profile.transferCaseStatus],
    ["Center", profile.centerDiffOrCoupling],
    ["Front diff", profile.frontDifferentialType],
    ["Rear diff", profile.rearDifferentialType],
    ["Final drive", footerDrivetrain.finalDrive || "—"],
  ] as const;

  return (
    <footer className="shrink-0 border-t border-white/10 bg-[#070a10]/95">
      <div className="flex items-center justify-between gap-2 border-b border-white/[0.05] px-2 py-1">
        <p className="text-[8px] font-semibold uppercase tracking-[0.14em] text-violet-200/90">
          Drivetrain &amp; transmission
        </p>
        <button
          type="button"
          onClick={toggleFooterCollapsed}
          className="inline-flex items-center gap-1 text-[8px] font-semibold uppercase tracking-wide text-neutral-500 transition hover:text-neutral-300"
          aria-expanded={!footerCollapsed}
        >
          {footerCollapsed ? "Expand panel" : "Collapse panel"}
          <Chevron up={!footerCollapsed} />
        </button>
      </div>

      {footerCollapsed ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 px-2 py-1.5">
          {stats.map(([k, v]) => (
            <span key={k} className="inline-flex min-w-0 items-baseline gap-1">
              <span className="text-[7px] uppercase tracking-wide text-neutral-600">{k}</span>
              <span className="truncate text-[9px] font-medium text-cyan-100/85">{v}</span>
            </span>
          ))}
          <button type="button" className={`${footerLinkClass} ml-auto`} onClick={() => setDrivetrainModalOpen(true)}>
            View diagram →
          </button>
        </div>
      ) : (
        <div className="max-h-[88px] overflow-y-auto px-2 py-1.5">
          <dl className="grid grid-cols-2 gap-x-3 gap-y-1 sm:grid-cols-4 lg:grid-cols-8">
            {stats.map(([k, v]) => (
              <div key={k} className="min-w-0">
                <dt className="text-[7px] uppercase tracking-wide text-neutral-500">{k}</dt>
                <dd className="truncate text-[9px] font-medium text-cyan-100/90">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-1.5 flex flex-wrap gap-3 border-t border-white/[0.05] pt-1.5">
            <button type="button" className={footerLinkClass} onClick={() => setDrivetrainModalOpen(true)}>
              View drivetrain diagram →
            </button>
            <button type="button" className={footerLinkClass} onClick={() => setDrivetrainModalOpen(true)}>
              Open drivetrain editor →
            </button>
          </div>
        </div>
      )}
    </footer>
  );
}
