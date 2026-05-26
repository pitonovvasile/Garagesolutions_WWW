import { DEFAULT_VEHICLE_ID, VEHICLE_LIST, getVehicle } from "../data/vehicles";
import { garageOemSuspensionFromCar } from "./garageResolvedSuspension";
import { isBmwX5E53GarageCar } from "./bmwGaragePlatform";
import { mapBmwDbSuspensionToVehicleTemplateId } from "./bmwSuspensionTemplateMap";
import type { VehicleDefinition } from "../lib/vehicleTypes";
import {
  readSavedCars as readGarageMem,
  writeSavedCars as writeGarageMem,
  subscribeGarageCars as subscribeGarageMem,
  emitGarageCarsRevalidate as emitGarageMem,
  GARAGE_CARS_CHANGED_EVENT,
  GARAGE_BROADCAST_CHANNEL,
  GARAGE_STORAGE_KEY,
  GARAGE_TRANSFER_KEY,
} from "@site-garage-saved-cars";

export {
  GARAGE_CARS_CHANGED_EVENT,
  GARAGE_BROADCAST_CHANNEL,
  GARAGE_STORAGE_KEY,
  GARAGE_TRANSFER_KEY,
};

export interface SavedGarageCar {
  brand: string;
  model?: string;
  engine?: string;
  bodyType?: string;
  [key: string]: unknown;
}

/** Garaj în memorie (aceeași sursă ca `assets/js/garage-saved-cars.mjs`), sincronizat cu Supabase din app. */
export function readSavedCars(): SavedGarageCar[] {
  if (typeof window === "undefined") return [];
  return readGarageMem() as SavedGarageCar[];
}

export function writeSavedCars(cars: SavedGarageCar[]): void {
  writeGarageMem(cars);
}

export function emitGarageCarsRevalidate(): void {
  emitGarageMem();
}

export function subscribeGarageCars(onStoreChange: () => void): () => void {
  return subscribeGarageMem(onStoreChange);
}

/** Index din `?car=` (null dacă lipsește sau e invalid). */
export function parseGarageCarQueryParam(): number | null {
  if (typeof window === "undefined") return null;
  const raw = new URLSearchParams(window.location.search).get("car");
  if (raw == null || raw === "") return null;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 0) return null;
  return n;
}

/** Persistă selecția garajului în URL fără reload (share / back-forward). */
export function writeGarageCarQueryParam(index: number): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.searchParams.set("car", String(index));
  window.history.replaceState(window.history.state, "", url.toString());
}

/** Map saved shop/garage row → closest stock geometry preset id. */
export function guessVehicleTemplateId(car: SavedGarageCar): string {
  const { front, rear } = garageOemSuspensionFromCar(car);
  const fromDb = mapBmwDbSuspensionToVehicleTemplateId(front, rear);
  if (fromDb) return fromDb;

  const brand = String(car.brand || "").toLowerCase();
  const model = String(car.model || "").toLowerCase();
  const engine = String(car.engine || "").toLowerCase();
  const blob = `${brand} ${model} ${engine}`;

  const isBmw = brand.includes("bmw") || /\bbmw\b/.test(blob);
  if (isBmw) {
    if (isBmwX5E53GarageCar(car)) {
      return "generic-dw";
    }
    if (/\be46\b|e46|330i|328i|325i|323i|320d|318i|316i|m3/.test(blob) && !/g80/.test(blob)) {
      return "bmw-e46";
    }
    const looksLikeThreeSeries =
      /\b3\s*series\b/i.test(model) ||
      /\b3\s*series\b/i.test(blob) ||
      /\bserie\s*3\b|\bseria\s*3\b/i.test(model) ||
      /\b3er\b/i.test(blob);
    if (
      looksLikeThreeSeries &&
      /m52|m54/.test(engine) &&
      !/\b(e90|e91|e92|e93|f30|f31|f34|f35|g20|g21|g28|f32|f33|f36|g80|g82|g87|f87)\b/i.test(blob)
    ) {
      return "bmw-e46";
    }
    if (/\bm2\b|f87|g87/.test(blob)) return "generic-dw";
  }

  return "generic-dw";
}

export function presetVehicleDefinitionsFromGarage(cars: SavedGarageCar[]): VehicleDefinition[] {
  const order = VEHICLE_LIST.map((v) => v.id);
  if (cars.length === 0) {
    return [getVehicle(DEFAULT_VEHICLE_ID)];
  }
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const c of cars) {
    const id = guessVehicleTemplateId(c);
    if (!seen.has(id)) {
      seen.add(id);
      ids.push(id);
    }
  }
  ids.sort((a, b) => {
    const ia = order.indexOf(a);
    const ib = order.indexOf(b);
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
  });
  return ids.map((id) => getVehicle(id));
}

export function formatSavedCarLabel(car: SavedGarageCar, index: number): string {
  const parts = [car.brand, car.model, car.engine].filter(
    (x): x is string => typeof x === "string" && x.trim().length > 0,
  );
  const core = parts.length ? parts.join(" · ") : car.brand;
  return `${index + 1}. ${core}`;
}
