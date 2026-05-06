import { useSyncExternalStore } from "react";
import { readSavedCars, subscribeGarageCars, type SavedGarageCar } from "../lib/garageStorage";

export function useGarageCars(): SavedGarageCar[] {
  return useSyncExternalStore(subscribeGarageCars, readSavedCars, () => [] as SavedGarageCar[]);
}
