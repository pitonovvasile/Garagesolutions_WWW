import { useEffect, useMemo } from "react";
import { getPresetById } from "../data/vehicleGarageProfiles";
import { getVehicle } from "../data/vehicles";
import { getVehicleStockSuspensionDoc } from "../data/vehicleStockSuspension";
import { analyzeAxle, applyBumpTravel, getAxlePreset } from "../lib/vehicleKinematics";
import { useSuspensionAssistantStore } from "../store/suspensionAssistantStore";
import { useSuspensionStore } from "../store/suspensionStore";
import { OemSuspensionSetupPanel } from "./OemSuspensionSetupPanel";
import { SaveSuspensionConfigurationButton } from "./SaveSuspensionConfigurationButton";
import { SuspensionHardwareSections } from "./SuspensionHardwareSections";

/**
 * Fereastră la pictograma „Suspensie”: OEM setup + hardware (resort / amortizor / plăci),
 * aceleași câmpuri ca în panoul drept; „Salvează configurația” include datele de sesiune.
 */
export function SuspensionWorkshopModal() {
  const open = useSuspensionAssistantStore((s) => s.suspensionWorkshopModalOpen);
  const setOpen = useSuspensionAssistantStore((s) => s.setSuspensionWorkshopModalOpen);
  const activePresetId = useSuspensionAssistantStore((s) => s.activePresetId);
  const engineeringDebugMode = useSuspensionAssistantStore((s) => s.engineeringDebugMode);

  const vehicleId = useSuspensionStore((s) => s.vehicleId);
  const axleEnd = useSuspensionStore((s) => s.axle);
  const pointsFront = useSuspensionStore((s) => s.pointsFront);
  const pointsRear = useSuspensionStore((s) => s.pointsRear);
  const travelMm = useSuspensionStore((s) => s.travelMm);
  const springRateNmm = useSuspensionStore((s) => s.springRateNmm);
  const springStrokeMm = useSuspensionStore((s) => s.springStrokeMm);
  const damperStrokeMm = useSuspensionStore((s) => s.damperStrokeMm);
  const damperLinearDampingCoeff = useSuspensionStore((s) => s.damperLinearDampingCoeff);

  const vehicle = useMemo(() => getVehicle(vehicleId), [vehicleId]);
  const presetFront = useMemo(() => getAxlePreset(vehicle, "front"), [vehicle]);
  const presetRear = useMemo(() => getAxlePreset(vehicle, "rear"), [vehicle]);
  const liveFront = useMemo(() => applyBumpTravel(pointsFront, travelMm), [pointsFront, travelMm]);
  const liveRear = useMemo(() => applyBumpTravel(pointsRear, travelMm), [pointsRear, travelMm]);
  const kinFront = useMemo(
    () =>
      analyzeAxle(pointsFront, liveFront, presetFront, springRateNmm, damperLinearDampingCoeff, travelMm),
    [pointsFront, liveFront, presetFront, springRateNmm, damperLinearDampingCoeff, travelMm],
  );
  const kinRear = useMemo(
    () =>
      analyzeAxle(pointsRear, liveRear, presetRear, springRateNmm, damperLinearDampingCoeff, travelMm),
    [pointsRear, liveRear, presetRear, springRateNmm, damperLinearDampingCoeff, travelMm],
  );

  const stockDoc = useMemo(() => getVehicleStockSuspensionDoc(vehicleId), [vehicleId]);
  const activePreset = activePresetId ? getPresetById(activePresetId) : null;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  if (!open) return null;

  const titleId = "sd-suspension-workshop-modal-title";

  return (
    <div
      className="fixed inset-0 z-[85] flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={() => setOpen(false)}
    >
      <div
        className="flex max-h-[min(92dvh,900px)] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-white/15 bg-[#0b0f14] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 flex-wrap items-start justify-between gap-3 border-b border-white/10 px-4 py-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-400/85">Suspensie</p>
            <h2 id={titleId} className="mt-0.5 text-base font-semibold text-white">
              Setup suspensie &amp; hardware
            </h2>
            <p className="mt-1 text-[11px] leading-snug text-neutral-500">
              Aceleași rubrici ca în panoul drept — modificările sunt live în sesiune. Salvează cu „Salvează
              configurația” (include resort, amortizor, plăci, date vehicul etc.).
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

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overflow-x-hidden px-4 py-4">
          {stockDoc ? (
            <OemSuspensionSetupPanel
              doc={stockDoc}
              kinFront={kinFront}
              kinRear={kinRear}
              preset={activePreset ?? null}
              axleEnd={axleEnd}
              engineeringDebug={engineeringDebugMode}
              springRateNmm={springRateNmm}
              springStrokeMm={springStrokeMm}
              damperStrokeMm={damperStrokeMm}
              damperLinearDampingCoeff={damperLinearDampingCoeff}
            />
          ) : (
            <p className="rounded-lg border border-white/10 bg-black/25 p-3 text-[11px] text-neutral-500">
              Profil OEM detaliat indisponibil pentru acest vehicul — poți edita mai jos hardware-ul de sesiune.
            </p>
          )}
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
              Camber plates
            </p>
            <SuspensionHardwareSections />
          </div>
          <p className="text-[9px] leading-snug text-neutral-600">
            Bifarea „Eng. debug” din panoul principal (sus) controlează și trace-urile de aici. Kinematics / grafice
            rămân în panoul drept scrollabil.
          </p>
        </div>
      </div>
    </div>
  );
}
