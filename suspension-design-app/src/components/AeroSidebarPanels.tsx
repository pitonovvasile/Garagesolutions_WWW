import { useGarageCars } from "../hooks/useGarageCars";
import { useSuspensionStore } from "../store/suspensionStore";
import { GarageWorkspaceSidebarStack } from "./GarageWorkspaceSidebarStack";

export function AeroSidebarPanels() {
  const garageCars = useGarageCars();
  const garageCarIndex = useSuspensionStore((s) => s.garageCarIndex);
  const linkedCar =
    garageCarIndex !== null && garageCarIndex >= 0 && garageCarIndex < garageCars.length
      ? garageCars[garageCarIndex]!
      : null;

  return (
    <GarageWorkspaceSidebarStack
      hint={
        !linkedCar ? (
          <p className="shrink-0 rounded-md border border-cyan-500/20 bg-cyan-500/[0.06] px-2 py-1.5 text-[9px] leading-relaxed text-neutral-400">
            Alege o mașină din selectorul Garaj — kiturile aerodinamice vor fi legate de vehiculul selectat.
          </p>
        ) : null
      }
    />
  );
}
