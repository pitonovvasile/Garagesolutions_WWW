/**
 * Garaj utilizator: **fără localStorage** pentru listă — stocare în memorie în aceeași sesiune de tab.
 * Sursa persistentă: Supabase (`syncGarageFromCloudAndLocal` / `pushLocalGarageToCloud`).
 */

export const GARAGE_STORAGE_KEY = "garageSolutionsSavedCars";
export const GARAGE_TRANSFER_KEY = "garageSolutionsSavedCarsTransfer";
export const GARAGE_CARS_CHANGED_EVENT = "garageSolutionsGarageCarsChanged";
export const GARAGE_BROADCAST_CHANNEL = "garageSolutionsGarageV1";

const BROADCAST =
  typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(GARAGE_BROADCAST_CHANNEL) : null;

/** @type {unknown[]} */
let _garageCars = [];

function normalizeGarageRow(c) {
  if (!c || typeof c !== "object") return null;
  const brand =
    (typeof c.brand === "string" && c.brand.trim()) ||
    (typeof c.make === "string" && c.make.trim()) ||
    (typeof c.marca === "string" && c.marca.trim()) ||
    "";
  if (!brand) return null;
  const model =
    (typeof c.model === "string" && c.model.trim()) ||
    (typeof c.modelName === "string" && c.modelName.trim()) ||
    "";
  const engine = typeof c.engine === "string" ? c.engine.trim() : "";
  return { ...c, brand, ...(model ? { model } : {}), ...(engine ? { engine } : {}) };
}

function notifyGarageListeners() {
  try {
    BROADCAST?.postMessage({ type: "garage-cars-updated" });
  } catch (_) {}
  try {
    window.dispatchEvent(new CustomEvent(GARAGE_CARS_CHANGED_EVENT));
  } catch (_) {}
}

/** @deprecated Fără localStorage — păstrat pentru compat. apeluri din index; nu face nimic. */
export function stashGarageForTransfer() {}

/**
 * Citește garajul din memorie (aceeași referință de tablou până la următorul `writeSavedCars`).
 * @returns {unknown[]}
 */
export function readSavedCars() {
  return _garageCars;
}

/**
 * @param {unknown[]} cars
 */
export function writeSavedCars(cars) {
  const list = Array.isArray(cars) ? cars : [];
  _garageCars = list.map((c) => normalizeGarageRow(c)).filter(Boolean);
  notifyGarageListeners();
}

export function emitGarageCarsRevalidate() {
  notifyGarageListeners();
}

/**
 * @param {() => void} callback
 * @returns {() => void}
 */
export function subscribeGarageCars(callback) {
  if (typeof window === "undefined" || typeof callback !== "function") {
    return () => {};
  }

  const bump = () => callback();

  const onSameOrigin = () => bump();
  window.addEventListener(GARAGE_CARS_CHANGED_EVENT, onSameOrigin);

  const onVis = () => {
    if (document.visibilityState === "visible") bump();
  };
  document.addEventListener("visibilitychange", onVis);

  const onPageShow = (e) => {
    if (e.persisted) bump();
  };
  window.addEventListener("pageshow", onPageShow);

  const onMsg = (e) => {
    if (e?.data?.type === "garage-cars-updated") bump();
  };
  BROADCAST?.addEventListener("message", onMsg);

  return () => {
    window.removeEventListener(GARAGE_CARS_CHANGED_EVENT, onSameOrigin);
    document.removeEventListener("visibilitychange", onVis);
    window.removeEventListener("pageshow", onPageShow);
    BROADCAST?.removeEventListener("message", onMsg);
  };
}

export function onGarageCarsUpdated(callback) {
  if (!BROADCAST || typeof callback !== "function") return () => {};
  const fn = (e) => {
    if (e?.data?.type === "garage-cars-updated") callback();
  };
  BROADCAST.addEventListener("message", fn);
  return () => BROADCAST.removeEventListener("message", fn);
}
