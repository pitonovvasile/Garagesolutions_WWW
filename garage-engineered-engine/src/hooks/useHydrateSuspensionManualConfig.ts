import { useEffect, useRef } from "react";
import {
  applyAntiRollBarProfileToStore,
  readAntiRollBarProfileFromCar,
} from "../lib/garageAntiRollBarProfile";
import { readSavedCars } from "../lib/garageStorage";
import {
  applySavedSuspensionConfiguration,
  readSavedSuspensionConfiguration,
} from "../lib/suspensionManualConfigPersistence";
import { useSuspensionStore } from "../store/suspensionStore";

/**
 * La schimbarea șablonului geometrie / slotului garaj, reîncarcă din localStorage configurația salvată
 * pentru aceeași cheie (dacă există).
 */
export function useHydrateSuspensionManualConfig() {
  const vehicleId = useSuspensionStore((s) => s.vehicleId);
  const garageCarIndex = useSuspensionStore((s) => s.garageCarIndex);
  const lastHydratedKey = useRef<string | null>(null);

  useEffect(() => {
    const key = `${vehicleId}|${garageCarIndex ?? "none"}`;
    if (lastHydratedKey.current === key) return;
    lastHydratedKey.current = key;
    const saved = readSavedSuspensionConfiguration(vehicleId, garageCarIndex);
    if (saved) applySavedSuspensionConfiguration(saved);

    if (garageCarIndex != null) {
      const cars = readSavedCars();
      if (garageCarIndex >= 0 && garageCarIndex < cars.length) {
        const arb = readAntiRollBarProfileFromCar(cars[garageCarIndex]!);
        if (arb) applyAntiRollBarProfileToStore(arb);
      }
    }
  }, [vehicleId, garageCarIndex]);

  return null;
}
