/** Aceeași cheie în tot site-ul: listă mașini din magazin (localStorage). */
export const GARAGE_STORAGE_KEY = "garageSolutionsSavedCars";

/** Oglindă în sessionStorage — navigare, file diferite același origin, reîncărcări. */
export const GARAGE_TRANSFER_KEY = "garageSolutionsSavedCarsTransfer";

const BROADCAST =
  typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("garageSolutionsGarageV1") : null;

function parseCarList(raw) {
  if (!raw || typeof raw !== "string") return [];
  try {
    const p = JSON.parse(raw);
    if (!Array.isArray(p)) return [];
    return p.filter((c) => {
      if (!c || typeof c !== "object") return false;
      const brand = typeof c.brand === "string" ? c.brand.trim() : "";
      return brand.length > 0;
    });
  } catch {
    return [];
  }
}

function carKey(c) {
  return [c.brand, c.model ?? "", c.engine ?? ""]
    .map((s) => String(s || "").trim().toLowerCase())
    .join("\0");
}

function uniqueMerge(listA, listB) {
  const out = [];
  const seen = new Set();
  for (const c of [...listA, ...listB]) {
    const k = carKey(c);
    if (!k || k === "\0\0\0") continue;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(c);
  }
  return out;
}

export function stashGarageForTransfer() {
  try {
    const raw = localStorage.getItem(GARAGE_STORAGE_KEY);
    sessionStorage.setItem(GARAGE_TRANSFER_KEY, raw || "[]");
  } catch (_) {
    /* private mode, quota */
  }
}

/**
 * Unește localStorage + stash sessionStorage, persistă rezultatul, golește stash.
 * Ordinea: mai întâi intrările din transfer (cele mai recente după Salvare/navigare).
 */
export function readSavedCars() {
  const stored = parseCarList(localStorage.getItem(GARAGE_STORAGE_KEY));
  const transfer = parseCarList(sessionStorage.getItem(GARAGE_TRANSFER_KEY));
  const merged = uniqueMerge(transfer, stored);

  try {
    if (merged.length > 0) {
      const serialized = JSON.stringify(merged);
      if (localStorage.getItem(GARAGE_STORAGE_KEY) !== serialized) {
        localStorage.setItem(GARAGE_STORAGE_KEY, serialized);
      }
    }
  } catch (e) {
    console.warn("[garage] readSavedCars: nu s-a putut persista localStorage", e);
  }

  try {
    sessionStorage.removeItem(GARAGE_TRANSFER_KEY);
  } catch (_) {}

  return merged;
}

export function writeSavedCars(cars) {
  const list = Array.isArray(cars) ? cars : [];
  try {
    localStorage.setItem(GARAGE_STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    console.error("[garage] writeSavedCars: stocare indisponibilă sau plină", e);
    throw e;
  }
  stashGarageForTransfer();
  try {
    BROADCAST?.postMessage({ type: "garage-cars-updated" });
  } catch (_) {}
}

export function onGarageCarsUpdated(callback) {
  if (!BROADCAST || typeof callback !== "function") return () => {};
  const fn = (e) => {
    if (e?.data?.type === "garage-cars-updated") callback();
  };
  BROADCAST.addEventListener("message", fn);
  return () => BROADCAST.removeEventListener("message", fn);
}
