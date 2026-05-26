import { VehicleFooterTriPanels } from "./VehicleFooterTriPanels";

/** Drivetrain / tires / aero technical panels (workflow + actions moved under Simulation header). */
export function BottomWorkflow() {
  return (
    <footer className="flex shrink-0 flex-col border-t border-white/10 bg-[#070a10]">
      <VehicleFooterTriPanels />
    </footer>
  );
}
