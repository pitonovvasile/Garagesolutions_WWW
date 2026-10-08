import type { SavedGarageCar } from "./garageStorage";

function str(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v.trim();
  return String(v).trim();
}

function extrasRecord(car: Record<string, unknown>): Record<string, unknown> | null {
  const ex = car.extras;
  if (ex && typeof ex === "object" && !Array.isArray(ex)) return ex as Record<string, unknown>;
  return null;
}

/**
 * OEM suspensie pentru UI: sursa de adevăr = coloanele view `user_saved_vehicles_resolved`
 * (`front_suspension_type`, `rear_suspension_type`) pe obiectul garaj flatten-uit.
 * ID-uri catalog (`catalogVariantId`, …) sunt folosite pentru îmbogățire BMW, nu pentru etichete OEM.
 * Dacă sunt goale → fallback legacy doar din `extras` (nu din text brand/model/motor).
 */
export function garageOemSuspensionFromCar(car: SavedGarageCar | null): { front: string; rear: string } {
  if (!car) return { front: "", rear: "" };
  const o = car as Record<string, unknown>;

  let front = str(o.front_suspension_type);
  let rear = str(o.rear_suspension_type);

  const ex = extrasRecord(o);
  if (!front && ex) {
    front = str(ex.front_suspension_type) || str(ex.bmwFrontSuspensionType) || str(ex.FrontSuspensionType);
  }
  if (!rear && ex) {
    rear = str(ex.rear_suspension_type) || str(ex.bmwRearSuspensionType) || str(ex.RearSuspensionType);
  }

  if (!front) front = str(o.bmwFrontSuspensionType);
  if (!rear) rear = str(o.bmwRearSuspensionType);

  return { front, rear };
}

/** Ambele axe au valoare — nu mai completăm din `bmw_variant_configurations` în batch. */
export function garageOemSuspensionComplete(car: SavedGarageCar | null): boolean {
  const { front, rear } = garageOemSuspensionFromCar(car);
  return Boolean(front && rear);
}
