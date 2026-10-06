import { useMemo } from "react";
import { useGarageCars } from "../hooks/useGarageCars";
import { usePerformanceOeBaseline } from "../hooks/usePerformanceOeBaseline";
import { buildPerformanceCurveModel } from "../lib/performanceCurveModel";
import { buildPerformanceSubsystemPanels } from "../lib/performanceSystemReadiness";
import { usePerformanceStore } from "../store/performanceStore";
import { useSuspensionStore } from "../store/suspensionStore";
import {
  PerformanceSystemReadinessStrip,
  PerformanceSystemReadinessToolbar,
} from "./PerformanceSystemReadinessPanels";

export function PerformanceSystemReadinessView() {
  const garageCars = useGarageCars();
  const garageCarIndex = useSuspensionStore((s) => s.garageCarIndex);
  const linkedCar =
    garageCarIndex !== null && garageCarIndex >= 0 && garageCarIndex < garageCars.length
      ? garageCars[garageCarIndex]!
      : null;

  const targetHp = usePerformanceStore((s) => s.targetPowerHp);
  const buildType = usePerformanceStore((s) => s.buildType);
  const budgetLevel = usePerformanceStore((s) => s.budgetLevel);
  const fuel = usePerformanceStore((s) => s.fuel);
  const reliability = usePerformanceStore((s) => s.reliability);

  const { baseline } = usePerformanceOeBaseline(linkedCar);

  const model = useMemo(
    () =>
      buildPerformanceCurveModel({
        baseline,
        targetHp,
        buildType,
        budgetLevel,
        engineLabel: linkedCar?.engine ?? "",
      }),
    [baseline, targetHp, buildType, budgetLevel, linkedCar?.engine],
  );

  const panels = useMemo(
    () => buildPerformanceSubsystemPanels({ model, baseline, buildType, fuel, reliability }),
    [model, baseline, buildType, fuel, reliability],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-white/10 bg-[#080c11]/60">
      <PerformanceSystemReadinessStrip panels={panels} />
      <PerformanceSystemReadinessToolbar />
    </div>
  );
}

/** Date + panouri pentru footer-ul modulului Performance. */
export function usePerformanceSubsystemPanels() {
  const garageCars = useGarageCars();
  const garageCarIndex = useSuspensionStore((s) => s.garageCarIndex);
  const linkedCar =
    garageCarIndex !== null && garageCarIndex >= 0 && garageCarIndex < garageCars.length
      ? garageCars[garageCarIndex]!
      : null;

  const targetHp = usePerformanceStore((s) => s.targetPowerHp);
  const buildType = usePerformanceStore((s) => s.buildType);
  const budgetLevel = usePerformanceStore((s) => s.budgetLevel);
  const fuel = usePerformanceStore((s) => s.fuel);
  const reliability = usePerformanceStore((s) => s.reliability);
  const { baseline } = usePerformanceOeBaseline(linkedCar);

  const model = useMemo(
    () =>
      buildPerformanceCurveModel({
        baseline,
        targetHp,
        buildType,
        budgetLevel,
        engineLabel: linkedCar?.engine ?? "",
      }),
    [baseline, targetHp, buildType, budgetLevel, linkedCar?.engine],
  );

  return useMemo(
    () => buildPerformanceSubsystemPanels({ model, baseline, buildType, fuel, reliability }),
    [model, baseline, buildType, fuel, reliability],
  );
}
