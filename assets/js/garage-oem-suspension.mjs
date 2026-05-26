/**
 * OEM suspension labels for saved garage cars (flattened from `user_saved_vehicles_resolved`).
 * Source: `front_suspension_type` / `rear_suspension_type`; extras only as legacy fallback.
 * Nu inferăm din text brand/model/motor.
 */

function str(v) {
  if (v == null) return "";
  if (typeof v === "string") return v.trim();
  return String(v).trim();
}

function extrasRecord(car) {
  const ex = car?.extras;
  if (ex && typeof ex === "object" && !Array.isArray(ex)) return ex;
  return null;
}

/** @param {Record<string, unknown> | null | undefined} car */
export function garageOemSuspensionFromCar(car) {
  if (!car || typeof car !== "object") return { front: "", rear: "" };
  const o = /** @type {Record<string, unknown>} */ (car);

  let front = str(o.front_suspension_type);
  let rear = str(o.rear_suspension_type);

  const ex = extrasRecord(o);
  if (!front && ex) {
    front =
      str(ex.front_suspension_type) || str(ex.bmwFrontSuspensionType) || str(ex.FrontSuspensionType);
  }
  if (!rear && ex) {
    rear = str(ex.rear_suspension_type) || str(ex.bmwRearSuspensionType) || str(ex.RearSuspensionType);
  }

  if (!front) front = str(o.bmwFrontSuspensionType);
  if (!rear) rear = str(o.bmwRearSuspensionType);

  return { front, rear };
}
