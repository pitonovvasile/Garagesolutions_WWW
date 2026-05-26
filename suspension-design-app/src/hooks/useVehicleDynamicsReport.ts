import { useMemo } from "react";
import { buildVehicleDynamicsReport } from "../engine/buildVehicleDynamicsReport";
import { useSuspensionAssistantStore } from "../store/suspensionAssistantStore";
import { useSuspensionStore } from "../store/suspensionStore";

export function useVehicleDynamicsReport() {
  const vehicleId = useSuspensionStore((s) => s.vehicleId);
  const axle = useSuspensionStore((s) => s.axle);
  const pointsFront = useSuspensionStore((s) => s.pointsFront);
  const pointsRear = useSuspensionStore((s) => s.pointsRear);
  const travelMm = useSuspensionStore((s) => s.travelMm);
  const springRateNmm = useSuspensionStore((s) => s.springRateNmm);
  const damperLinearDampingCoeff = useSuspensionStore((s) => s.damperLinearDampingCoeff);
  const damperDigressive = useSuspensionStore((s) => s.damperDigressive);
  const antiRollBarFrontMode = useSuspensionStore((s) => s.antiRollBarFrontMode);
  const antiRollBarRearMode = useSuspensionStore((s) => s.antiRollBarRearMode);
  const antiRollBarFrontBrand = useSuspensionStore((s) => s.antiRollBarFrontBrand);
  const antiRollBarRearBrand = useSuspensionStore((s) => s.antiRollBarRearBrand);
  const antiRollBarFrontStiffness = useSuspensionStore((s) => s.antiRollBarFrontStiffness);
  const antiRollBarRearStiffness = useSuspensionStore((s) => s.antiRollBarRearStiffness);

  const vehicleArchitectureManual = useSuspensionAssistantStore((s) => s.vehicleArchitectureManual);
  const vehicleDimensionsManual = useSuspensionAssistantStore((s) => s.vehicleDimensionsManual);
  const vehicleMassManual = useSuspensionAssistantStore((s) => s.vehicleMassManual);
  const vehicleFooterDrivetrainManual = useSuspensionAssistantStore((s) => s.vehicleFooterDrivetrainManual);
  const vehicleFooterTiresManual = useSuspensionAssistantStore((s) => s.vehicleFooterTiresManual);
  const vehicleFooterAeroManual = useSuspensionAssistantStore((s) => s.vehicleFooterAeroManual);

  return useMemo(
    () =>
      buildVehicleDynamicsReport({
        vehicleId,
        axle,
        pointsFront,
        pointsRear,
        travelMm,
        springRateNmm,
        damperLinearDampingCoeff,
        damperDigressive,
        vehicleArchitectureManual,
        vehicleDimensionsManual,
        vehicleMassManual,
        vehicleFooterDrivetrainManual,
        vehicleFooterTiresManual,
        vehicleFooterAeroManual,
        antiRollBarFrontMode,
        antiRollBarRearMode,
        antiRollBarFrontBrand,
        antiRollBarRearBrand,
        antiRollBarFrontStiffness,
        antiRollBarRearStiffness,
      }),
    [
      vehicleId,
      axle,
      pointsFront,
      pointsRear,
      travelMm,
      springRateNmm,
      damperLinearDampingCoeff,
      damperDigressive,
      antiRollBarFrontMode,
      antiRollBarRearMode,
      antiRollBarFrontBrand,
      antiRollBarRearBrand,
      antiRollBarFrontStiffness,
      antiRollBarRearStiffness,
      vehicleArchitectureManual,
      vehicleDimensionsManual,
      vehicleMassManual,
      vehicleFooterDrivetrainManual,
      vehicleFooterTiresManual,
      vehicleFooterAeroManual,
    ],
  );
}
