import { useEffect } from "react";
import { useSuspensionAssistantStore } from "../store/suspensionAssistantStore";
import { SaveSuspensionConfigurationButton } from "./SaveSuspensionConfigurationButton";
import { VehicleDrivetrainFields } from "./VehicleDrivetrainFields";

/**
 * Fereastră la pictograma „Drivetrain”: aceleași câmpuri ca `#sd-footer-drivetrain`, editabile;
 * salvare prin „Salvează configurația” (aceeași configurație locală ca vehiculul).
 */
export function DrivetrainConfigModal() {
  const open = useSuspensionAssistantStore((s) => s.drivetrainModalOpen);
  const setOpen = useSuspensionAssistantStore((s) => s.setDrivetrainModalOpen);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  if (!open) return null;

  const titleId = "sd-drivetrain-modal-title";

  return (
    <div
      className="fixed inset-0 z-[85] flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={() => setOpen(false)}
    >
      <div
        className="flex max-h-[min(92dvh,880px)] w-full max-w-xl flex-col overflow-hidden rounded-xl border border-white/15 bg-[#0b0f14] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 flex-wrap items-start justify-between gap-3 border-b border-white/10 px-4 py-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-400/85">Drivetrain</p>
            <h2 id={titleId} className="mt-0.5 text-base font-semibold text-white">
              Drivetrain &amp; transmission
            </h2>
            <p className="mt-1 text-[11px] leading-snug text-neutral-500">
              Aceleași date ca în footer — se salvează împreună cu vehiculul la „Salvează configurația”.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-start justify-end gap-2">
            <div className="max-w-[14rem] sm:max-w-none">
              <SaveSuspensionConfigurationButton compact />
            </div>
            <button
              type="button"
              className="shrink-0 rounded-lg border border-white/15 bg-black/40 px-3 py-1.5 text-[11px] font-medium text-neutral-200 transition hover:border-cyan-500/40 hover:bg-white/[0.06]"
              onClick={() => setOpen(false)}
            >
              Închide
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-4">
          <VehicleDrivetrainFields variant="modal" fieldIdSuffix="-mw" />
        </div>
      </div>
    </div>
  );
}
