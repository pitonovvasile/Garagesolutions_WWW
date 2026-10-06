/**
 * Garaj utilizator demo: memorie + localStorage, partajat între paginile aceluiași browser/origin.
 */

export const GARAGE_STORAGE_KEY = "garageSolutionsSavedCars";
export const GARAGE_TRANSFER_KEY = "garageSolutionsSavedCarsTransfer";
export const GARAGE_CARS_CHANGED_EVENT = "garageSolutionsGarageCarsChanged";
export const GARAGE_BROADCAST_CHANNEL = "garageSolutionsGarageV1";

const BROADCAST =
  typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(GARAGE_BROADCAST_CHANNEL) : null;

/** @type {unknown[]} */
let _garageCars = readPersistedGarageCars();

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

function normalizedText(value) {
  return String(value || "").trim().toLowerCase();
}

function catalogIdentityValue(car, ...keys) {
  for (const key of keys) {
    const value = car?.[key];
    const text = normalizedText(value);
    if (text) return text;
  }
  return "";
}

function timestampOf(row) {
  if (!row || typeof row !== "object") return 0;
  for (const key of ["updatedAt", "updated_at", "savedAt", "saved_at", "createdAt", "created_at"]) {
    const value = row[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim()) {
      const t = Date.parse(value);
      if (Number.isFinite(t)) return t;
    }
  }
  return 0;
}

function filledFieldCount(row) {
  if (!row || typeof row !== "object") return 0;
  return Object.values(row).filter((value) => value != null && String(value).trim() !== "").length;
}

export function garageCarIdentityKey(car) {
  if (!car || typeof car !== "object") return "";
  const brand = normalizedText(car.brand || car.make || car.marca);
  if (!brand) return "";
  const model = normalizedText(car.model || car.modelName);
  const engine = normalizedText(car.engine);
  const bodyType = normalizedText(car.bodyType || car.body_type);
  const generationId = catalogIdentityValue(car, "catalogGenerationId", "catalog_generation_id");
  const variantId = catalogIdentityValue(
    car,
    "catalogVariantId",
    "catalog_variant_id",
    "bmwVariantId",
    "bmw_variant_id",
    "variantId",
    "variant_id",
  );
  const configurationId = catalogIdentityValue(
    car,
    "catalogConfigurationId",
    "catalog_configuration_id",
    "bmwConfigurationId",
    "bmw_configuration_id",
    "configurationId",
    "configuration_id",
  );

  const catalogKey = [brand, model, engine, bodyType, generationId, variantId, configurationId]
    .filter(Boolean)
    .join("\0");
  if (catalogKey) return `catalog:${catalogKey}`;

  const stableId = normalizedText(car.savedVehicleId || car.saved_vehicle_id || car.id);
  return stableId ? `saved:${stableId}` : "";
}

function mergeGarageRows(current, next) {
  if (!current) return next;
  const currentScore = filledFieldCount(current);
  const nextScore = filledFieldCount(next);
  const currentTime = timestampOf(current);
  const nextTime = timestampOf(next);
  const preferNext = nextScore > currentScore || (nextScore === currentScore && nextTime >= currentTime);
  return preferNext ? { ...current, ...next } : { ...next, ...current };
}

export function dedupeGarageCars(cars) {
  const out = [];
  const seen = new Map();
  const list = Array.isArray(cars) ? cars : [];
  for (const raw of list) {
    const car = normalizeGarageRow(raw);
    if (!car) continue;
    const key = garageCarIdentityKey(car);
    if (!key) {
      out.push(car);
      continue;
    }
    const existingIndex = seen.get(key);
    if (existingIndex == null) {
      seen.set(key, out.length);
      out.push(car);
      continue;
    }
    out[existingIndex] = mergeGarageRows(out[existingIndex], car);
  }
  return out;
}

function notifyGarageListeners() {
  try {
    BROADCAST?.postMessage({ type: "garage-cars-updated" });
  } catch (_) {}
  try {
    window.dispatchEvent(new CustomEvent(GARAGE_CARS_CHANGED_EVENT));
  } catch (_) {}
}

function readPersistedGarageCars() {
  const out = [];
  const addRows = (rows) => {
    if (!Array.isArray(rows)) return;
    out.push(...dedupeGarageCars(rows));
  };
  try {
    const raw = localStorage.getItem(GARAGE_STORAGE_KEY);
    if (raw && typeof raw === "string") addRows(JSON.parse(raw));
  } catch (_) {}
  try {
    const raw = sessionStorage.getItem(GARAGE_TRANSFER_KEY);
    if (raw && typeof raw === "string") addRows(JSON.parse(raw));
  } catch (_) {}
  return dedupeGarageCars(out);
}

function persistGarageCars(cars) {
  try {
    localStorage.setItem(GARAGE_STORAGE_KEY, JSON.stringify(cars));
  } catch (_) {}
}

export function stashGarageForTransfer() {
  persistGarageCars(_garageCars);
}

/**
 * Citește garajul din memorie (aceeași referință de tablou până la următorul `writeSavedCars`).
 * @returns {unknown[]}
 */
export function readSavedCars() {
  if (!_garageCars.length) {
    _garageCars = readPersistedGarageCars();
  }
  return _garageCars;
}

/**
 * @param {unknown[]} cars
 */
export function writeSavedCars(cars) {
  const list = Array.isArray(cars) ? cars : [];
  _garageCars = dedupeGarageCars(list);
  persistGarageCars(_garageCars);
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

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key !== GARAGE_STORAGE_KEY) return;
    _garageCars = readPersistedGarageCars();
    notifyGarageListeners();
  });
  window.addEventListener("garageSolutionsDemoSyncApplied", () => {
    _garageCars = readPersistedGarageCars();
    notifyGarageListeners();
  });
}
