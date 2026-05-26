import { useGarageCars } from "../hooks/useGarageCars";
import { usePerformanceOeBaseline } from "../hooks/usePerformanceOeBaseline";
import { usePerformanceStore } from "../store/performanceStore";
import { useSuspensionStore } from "../store/suspensionStore";
import { GarageWorkspaceSidebarStack } from "./GarageWorkspaceSidebarStack";
import { PerformanceSummaryCard, PerformanceSummaryCardRows } from "./PerformanceSummaryCard";

export function PerformanceSidebarPanels() {
  const garageCars = useGarageCars();
  const garageCarIndex = useSuspensionStore((s) => s.garageCarIndex);
  const linkedCar =
    garageCarIndex !== null && garageCarIndex >= 0 && garageCarIndex < garageCars.length
      ? garageCars[garageCarIndex]!
      : null;

  const { baseline, loading } = usePerformanceOeBaseline(linkedCar);

  const buildType = usePerformanceStore((s) => s.buildType);
  const fuel = usePerformanceStore((s) => s.fuel);
  const targetPowerHp = usePerformanceStore((s) => s.targetPowerHp);
  const reliability = usePerformanceStore((s) => s.reliability);
  const budgetLevel = usePerformanceStore((s) => s.budgetLevel);
  const setOeSpecsModalOpen = usePerformanceStore((s) => s.setOeSpecsModalOpen);
  const setTargetModalOpen = usePerformanceStore((s) => s.setTargetModalOpen);

  const oeRows = [
    { label: "Power", value: loading && linkedCar ? "…" : baseline.power },
    { label: "Torque", value: loading && linkedCar ? "…" : baseline.torque },
    { label: "0-100 km/h", value: loading && linkedCar ? "…" : baseline.zeroTo100 },
    { label: "Drivetrain Loss", value: loading && linkedCar ? "…" : baseline.drivetrainLoss },
    { label: "Fuel", value: loading && linkedCar ? "…" : baseline.fuel },
    { label: "Compression Ratio", value: loading && linkedCar ? "…" : baseline.compressionRatio },
    { label: "Max RPM", value: loading && linkedCar ? "…" : baseline.redline },
  ];

  const configRows = [
    { label: "Build Type", value: buildType },
    { label: "Fuel", value: fuel },
    { label: "Target Power", value: `${targetPowerHp} hp` },
    { label: "Reliability", value: reliability },
    { label: "Budget Level", value: budgetLevel },
  ];

  return (
    <GarageWorkspaceSidebarStack
      hint={
        !linkedCar ? (
          <p className="shrink-0 rounded-md border border-amber-500/20 bg-amber-500/[0.06] px-2 py-1.5 text-[9px] leading-relaxed text-neutral-400">
            Alege o mașină din selectorul Garaj de mai sus pentru a încărca baseline-ul OEM.
          </p>
        ) : null
      }
    >
      <PerformanceSummaryCard
        title="OE Baseline (Factory)"
        actionLabel="View OE specifications"
        compact
        onAction={() => setOeSpecsModalOpen(true)}
      >
        <PerformanceSummaryCardRows rows={oeRows} compact />
      </PerformanceSummaryCard>

      <PerformanceSummaryCard
        title="Configuration Summary"
        actionLabel="Edit target"
        compact
        onAction={() => setTargetModalOpen(true)}
      >
        <PerformanceSummaryCardRows rows={configRows} compact />
      </PerformanceSummaryCard>
    </GarageWorkspaceSidebarStack>
  );
}
