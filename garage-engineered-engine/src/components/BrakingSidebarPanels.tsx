import { useGarageCars } from "../hooks/useGarageCars";
import { useSuspensionStore } from "../store/suspensionStore";
import { GarageWorkspaceSidebarStack } from "./GarageWorkspaceSidebarStack";

export function BrakingSidebarPanels() {
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
          <p className="shrink-0 rounded-md border border-rose-500/20 bg-rose-500/[0.06] px-2 py-1.5 text-[9px] leading-relaxed text-neutral-400">
            Alege o mașină din selectorul Garaj — sistemul de frânare va fi legat de vehiculul selectat.
          </p>
        ) : null
      }
    />
  );
}
