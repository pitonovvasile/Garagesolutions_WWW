import { useMemo } from "react";
import { useGarageCars } from "./useGarageCars";
import { formatSavedCarLabel, parseGarageCarQueryParam } from "../lib/garageStorage";
import { buildTransmissionDrivetrainProfile } from "../lib/transmissionDrivetrainProfile";
import { useSuspensionStore } from "../store/suspensionStore";

export function useTransmissionDrivetrainProfile() {
  const garageCars = useGarageCars();
  const garageCarIndex = useSuspensionStore((s) => s.garageCarIndex);
  const carIndex = garageCarIndex ?? parseGarageCarQueryParam() ?? 0;
  const linkedCar =
    garageCarIndex !== null && garageCarIndex >= 0 && garageCarIndex < garageCars.length
      ? garageCars[garageCarIndex]!
      : garageCars[carIndex] ?? null;

  const vehicleLabel = linkedCar ? formatSavedCarLabel(linkedCar, carIndex) : "No vehicle selected";

  const profile = useMemo(
    () => buildTransmissionDrivetrainProfile(linkedCar, vehicleLabel),
    [linkedCar, vehicleLabel],
  );

  return { profile, linkedCar, carIndex };
}
