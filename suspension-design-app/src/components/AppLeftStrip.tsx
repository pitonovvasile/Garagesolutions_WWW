import garageSolutionsLogo from "../../../assets/garage-solutions-logo.png";
import { useSuspensionAssistantStore } from "../store/suspensionAssistantStore";
import { LeftStripModuleIcons } from "./LeftStripModuleIcons";
import { LEFT_STRIP_NAV_CHIP_CLASS, LEFT_STRIP_NAV_CHIP_LABEL_CLASS } from "./leftStripNavChipClass";
import { VehicleSilhouetteIcon } from "./VehicleSilhouetteIcon";

/**
 * Coloană îngustă pe marginea stângă a modulului (sub header), tonuri aliniate cu restul UI.
 */
export function AppLeftStrip() {
  const setVehicleSubpageOpen = useSuspensionAssistantStore((s) => s.setVehicleSubpageOpen);
  const vehicleSubpageOpen = useSuspensionAssistantStore((s) => s.vehicleSubpageOpen);
  const setTiresWheelsModalOpen = useSuspensionAssistantStore((s) => s.setTiresWheelsModalOpen);
  const tiresWheelsModalOpen = useSuspensionAssistantStore((s) => s.tiresWheelsModalOpen);
  const setDrivetrainModalOpen = useSuspensionAssistantStore((s) => s.setDrivetrainModalOpen);
  const drivetrainModalOpen = useSuspensionAssistantStore((s) => s.drivetrainModalOpen);
  const setSuspensionWorkshopModalOpen = useSuspensionAssistantStore((s) => s.setSuspensionWorkshopModalOpen);
  const suspensionWorkshopModalOpen = useSuspensionAssistantStore((s) => s.suspensionWorkshopModalOpen);
  const setLeftStripActiveModule = useSuspensionAssistantStore((s) => s.setLeftStripActiveModule);
  const leftStripActiveModule = useSuspensionAssistantStore((s) => s.leftStripActiveModule);

  return (
    <aside
      className="flex w-20 shrink-0 flex-col items-stretch border-r border-white/[0.09] bg-gradient-to-b from-[#0c121c] via-[#080c14] to-[#06080c] sm:w-24"
      aria-label="Margine navigare"
    >
      <div className="flex shrink-0 flex-col items-center px-1 pb-2 pt-3">
        <button
          type="button"
          onClick={() => {
            setVehicleSubpageOpen(!vehicleSubpageOpen);
          }}
          className={[LEFT_STRIP_NAV_CHIP_CLASS, vehicleSubpageOpen ? "bg-cyan-950/25 ring-1 ring-cyan-400/35" : ""].filter(Boolean).join(" ")}
          aria-label={vehicleSubpageOpen ? "Închide subpagina date vehicul" : "Deschide subpagina date vehicul"}
        >
          <VehicleSilhouetteIcon className="h-16 w-16 sm:h-[4.5rem] sm:w-[4.5rem]" />
          <span className={LEFT_STRIP_NAV_CHIP_LABEL_CLASS}>Vehicul</span>
        </button>
        <LeftStripModuleIcons
          activeModule={leftStripActiveModule}
          tiresModalOpen={tiresWheelsModalOpen}
          drivetrainModalOpen={drivetrainModalOpen}
          suspensionWorkshopModalOpen={suspensionWorkshopModalOpen}
          onModulePress={(id) => {
            if (id === "tires") {
              setTiresWheelsModalOpen(!tiresWheelsModalOpen);
            } else if (id === "drivetrain") {
              setDrivetrainModalOpen(!drivetrainModalOpen);
            } else if (id === "suspension") {
              setSuspensionWorkshopModalOpen(!suspensionWorkshopModalOpen);
            } else {
              setLeftStripActiveModule(id);
            }
          }}
        />
      </div>
      <div className="pointer-events-none flex min-h-0 flex-1 flex-col items-center px-1 pt-1">
        <div
          className="w-px flex-1 max-h-[min(40vh,12rem)] rounded-full bg-gradient-to-b from-cyan-400/45 via-sky-500/20 to-transparent"
          aria-hidden="true"
        />
      </div>
      <div className="flex shrink-0 flex-col items-center gap-2 px-1 pb-3 pt-2">
        <a
          href="../index.html"
          className="flex w-full min-w-0 max-w-full items-center justify-center rounded-lg border border-white/10 bg-black/25 p-1.5 shadow-inner transition hover:border-cyan-500/35 hover:bg-black/40"
          aria-label="Garage Solutions — acasă"
          title="Acasă"
        >
          <img
            src={garageSolutionsLogo}
            alt=""
            className="h-5 w-auto object-contain opacity-90 sm:h-6"
            width={333}
            height={222}
            decoding="async"
          />
        </a>
      </div>
    </aside>
  );
}
