import { enrichGarageCarsWithBmwVariantSuspension } from "./bmwGarageSuspensionEnrich";
import { readSavedCars, writeSavedCars, type SavedGarageCar } from "./garageStorage";
import { enrichGarageCarsWithBmwPerformanceSpec } from "../services/bmwPerformanceSpecClient";

const EMPTY_CLOUD_RETRY_MS = 450;

let initialGarageLoadPromise: Promise<SavedGarageCar[]> | null = null;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export async function enrichGarageCarsWithDbData(cars: SavedGarageCar[]): Promise<SavedGarageCar[]> {
  const withSuspension = await enrichGarageCarsWithBmwVariantSuspension(cars);
  return enrichGarageCarsWithBmwPerformanceSpec(withSuspension);
}

async function syncGarageFromDb(): Promise<SavedGarageCar[]> {
  try {
    const cloud = await import("@site-garage-cloud");
    let merged = await cloud.syncGarageFromCloudAndLocal();
    if (merged.length === 0) {
      await wait(EMPTY_CLOUD_RETRY_MS);
      merged = await cloud.syncGarageFromCloudAndLocal();
    }
    return merged as SavedGarageCar[];
  } catch (e) {
    console.warn("[garage-engine] initial garage DB sync", e);
    return readSavedCars();
  }
}

export function loadInitialGarageData(): Promise<SavedGarageCar[]> {
  if (!initialGarageLoadPromise) {
    initialGarageLoadPromise = (async () => {
      const synced = await syncGarageFromDb();
      const enriched = await enrichGarageCarsWithDbData(synced);
      writeSavedCars(enriched);
      return enriched;
    })();
  }
  return initialGarageLoadPromise;
}
