import { type VehicleFooterAeroManual } from "../data/vehicleFooterTechnicalManual";
import { useSuspensionAssistantStore } from "../store/suspensionAssistantStore";
import { VehicleDrivetrainFields } from "./VehicleDrivetrainFields";
import { VehicleTiresWheelsFields } from "./VehicleTiresWheelsFields";

const inputClass =
  "w-full min-w-0 rounded border border-white/10 bg-[#0b0f14] px-1.5 py-0.5 text-[10px] text-neutral-200 shadow-inner outline-none transition focus:border-cyan-400/45 focus:ring-1 focus:ring-cyan-400/25";

const labelClass = "text-[8px] font-semibold uppercase tracking-[0.1em] text-neutral-500";

const panelTitle = "shrink-0 text-[9px] font-semibold uppercase tracking-[0.14em] text-white";

const footerLinkClass =
  "mt-1 shrink-0 inline-flex items-center gap-0.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-cyan-400/90 transition hover:text-cyan-300";

/** Panou footer: înălțime totală max. 200px, conținut derulabil. */
const sectionShell =
  "flex max-h-[200px] min-h-0 flex-col border-white/5 px-2 py-1.5 lg:min-w-0";

const sectionBody = "min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain";

function ChevronRight() {
  return (
    <span className="text-cyan-500/80" aria-hidden>
      →
    </span>
  );
}

export function VehicleFooterTriPanels() {
  const a = useSuspensionAssistantStore((s) => s.vehicleFooterAeroManual);
  const patchA = useSuspensionAssistantStore((s) => s.setVehicleFooterAeroManual);
  const hi = useSuspensionAssistantStore((s) => s.leftStripActiveModule);
  const tiresModal = useSuspensionAssistantStore((s) => s.tiresWheelsModalOpen);
  const drivetrainModal = useSuspensionAssistantStore((s) => s.drivetrainModalOpen);

  const ring = (id: "drivetrain" | "tires" | "aero") =>
    hi === id ||
    (id === "tires" && tiresModal) ||
    (id === "drivetrain" && drivetrainModal)
      ? " ring-1 ring-inset ring-cyan-400/40 shadow-[inset_0_0_0_1px_rgba(34,211,238,0.15)]"
      : "";

  return (
    <div className="grid min-h-0 grid-cols-1 divide-y divide-white/10 border-white/10 bg-[#070a10] text-neutral-200 lg:grid-cols-3 lg:divide-x lg:divide-y-0 lg:items-stretch">
      {/* Drivetrain */}
      <section id="sd-footer-drivetrain" className={`${sectionShell}${ring("drivetrain")}`}>
        <h2 className={`${panelTitle} mb-1`}>Drivetrain &amp; transmission</h2>
        <div className={`${sectionBody} pr-0.5`}>
          <VehicleDrivetrainFields variant="footer" />
        </div>
        <button type="button" className={footerLinkClass}>
          View drivetrain diagram
          <ChevronRight />
        </button>
      </section>

      {/* Tires */}
      <section id="sd-footer-tires" className={`${sectionShell}${ring("tires")}`}>
        <h2 className={`${panelTitle} mb-1`}>Tires &amp; wheels</h2>
        <div className={`${sectionBody} pr-0.5`}>
          <VehicleTiresWheelsFields variant="footer" />
        </div>
        <button type="button" className={footerLinkClass}>
          View tire model
          <ChevronRight />
        </button>
      </section>

      {/* Aero */}
      <section id="sd-footer-aero" className={`${sectionShell}${ring("aero")}`}>
        <h2 className={`${panelTitle} mb-1`}>Aero setup</h2>
        <div className={`${sectionBody} pr-0.5`}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
          <div className="min-w-0 flex-1 space-y-1">
            {(
              [
                ["Front downforce", "frontDownforceN", "N"],
                ["Rear downforce", "rearDownforceN", "N"],
                ["Total downforce", "totalDownforceN", "N"],
                ["Aero balance", "aeroBalancePct", "%"],
                ["Ride height sens.", "rideHeightSensPctPerMm", "%/mm"],
              ] as const
            ).map(([lab, key, unit]) => (
              <div key={key}>
                <label htmlFor={`fa-${key}`} className={labelClass}>
                  {lab}
                </label>
                <div className="mt-0.5 flex items-baseline gap-1">
                  <input
                    id={`fa-${key}`}
                    className={`${inputClass} font-mono`}
                    value={a[key]}
                    onChange={(e) => patchA({ [key]: e.target.value } as Partial<VehicleFooterAeroManual>)}
                    inputMode="decimal"
                    autoComplete="off"
                    spellCheck={false}
                  />
                  <span className="shrink-0 text-[8px] text-neutral-500">{unit}</span>
                </div>
              </div>
            ))}
          </div>
          <div
            className="flex shrink-0 items-center justify-center sm:w-[min(100%,5.5rem)]"
            aria-hidden
          >
            <svg viewBox="0 0 120 80" className="h-14 w-full max-w-[5.5rem] text-neutral-500">
              <rect
                x="28"
                y="22"
                width="64"
                height="36"
                rx="6"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
                opacity="0.5"
              />
              <line x1="38" y1="34" x2="82" y2="34" stroke="currentColor" strokeWidth="0.5" opacity="0.35" />
              <line x1="60" y1="22" x2="60" y2="58" stroke="currentColor" strokeWidth="0.5" opacity="0.35" />
              <path d="M34 58 L46 58" stroke="currentColor" strokeWidth="1.2" />
              <path d="M74 58 L86 58" stroke="currentColor" strokeWidth="1.2" />
              <path d="M34 22 L46 22" stroke="currentColor" strokeWidth="1.2" />
              <path d="M74 22 L86 22" stroke="currentColor" strokeWidth="1.2" />
              <line x1="42" y1="8" x2="42" y2="18" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
              <line x1="78" y1="8" x2="78" y2="18" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
              <line x1="42" y1="72" x2="42" y2="62" stroke="#fb923c" strokeWidth="2" strokeLinecap="round" />
              <line x1="78" y1="72" x2="78" y2="62" stroke="#fb923c" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        </div>
        </div>
        <button type="button" className={footerLinkClass}>
          View aero map
          <ChevronRight />
        </button>
      </section>
    </div>
  );
}
