import { usePerformanceSubsystemPanels } from "./PerformanceSystemReadinessView";
import {
  PerformanceSystemReadinessStrip,
  PerformanceSystemReadinessToolbar,
} from "./PerformanceSystemReadinessPanels";
import { usePerformanceStore } from "../store/performanceStore";

/** Footer Performance: strip readiness subsisteme (înlocuiește drivetrain / anvelope / aero). */
export function PerformanceBottomWorkflow() {
  const panels = usePerformanceSubsystemPanels();
  const activeCenterTab = usePerformanceStore((s) => s.activeCenterTab);
  const showFooterStrip = activeCenterTab !== 2;

  return (
    <footer className="flex shrink-0 flex-col border-t border-white/10 bg-[#070a10]">
      {showFooterStrip ? <PerformanceSystemReadinessStrip panels={panels} compact /> : null}
      <PerformanceSystemReadinessToolbar />
    </footer>
  );
}
