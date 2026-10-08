/**
 * Sincronizare garaj în memorie ↔ Supabase (`user_saved_vehicles`).
 * Citire: `user_saved_vehicles_resolved` (date tehnice canonice).
 * Scriere: `catalog_variant_id` / `catalog_configuration_id` + catalog hierarchy când există;
 * coloanele BMW legacy rămân populate în oglindă pentru compatibilitate.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./supabase-config.mjs";
import { createSupabaseCookieMirrorStorage } from "./supabase-session-cookie-mirror.mjs";
import {
  dedupeGarageCars,
  garageCarIdentityKey,
  readSavedCars,
  writeSavedCars,
} from "./garage-saved-cars.mjs";
import {
  fetchResolvedGarageForUser,
  rowToSavedCarFromResolved,
} from "./user-saved-vehicles-resolved.mjs";

const TABLE = "user_saved_vehicles";

/**
 * Păstrează ordinea și câmpurile rezolvate din `cloud`, apoi adaugă mașini din `local`
 * care nu există încă în cloud (ex. tocmai salvate în magazin înainte ca push-ul să reușească).
 */
function mergeCloudGarageWithLocalOnlyAdditions(cloud, local) {
  const cloudList = dedupeGarageCars(Array.isArray(cloud) ? cloud : []);
  const localList = dedupeGarageCars(Array.isArray(local) ? local : []);
  const seen = new Set();
  for (const c of cloudList) {
    const k = garageCarIdentityKey(c);
    if (k) seen.add(k);
  }
  const out = [...cloudList];
  for (const c of localList) {
    const k = garageCarIdentityKey(c);
    if (!k) continue;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(c);
  }
  return dedupeGarageCars(out);
}

/** Migrare din vechiul `localStorage` (o singură citire — șters doar după push reușit). */
function readLegacyGarageArrayFromBrowserStorage() {
  try {
    const raw = localStorage.getItem("garageSolutionsSavedCars");
    if (!raw || typeof raw !== "string") return null;
    const p = JSON.parse(raw);
    return Array.isArray(p) && p.length ? p : null;
  } catch {
    return null;
  }
}

function clearLegacyGarageBrowserKeys() {
  try {
    sessionStorage.removeItem("garageSolutionsSavedCarsTransfer");
  } catch (_) {}
}

const TOP_KEYS = new Set([
  "brand",
  "model",
  "engine",
  "bodyType",
  "body_type",
  "savedAt",
  "brandLogoUrl",
  "productionYears",
  "saved_at",
  "brand_logo_url",
  "production_years",
  "bmw_variant_id",
  "bmw_configuration_id",
  "catalog_brand_id",
  "catalog_model_id",
  "catalog_generation_id",
  "catalog_variant_id",
  "catalog_configuration_id",
  "catalog_resolved",
]);

/** @type {import("@supabase/supabase-js").SupabaseClient | null} */
let _client = null;

export function getGarageCloudSupabase(client = null) {
  if (client) return client;
  if (_client) return _client;
  _client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      storage: createSupabaseCookieMirrorStorage(),
      persistSession: true,
      autoRefreshToken: true,
    },
  });
  return _client;
}

/**
 * Rând din `user_saved_vehicles` sau view-ul resolved → obiect garaj (memorie).
 * @param {Record<string, unknown>} row
 */
export function rowToSavedCar(row) {
  const r = row && typeof row === "object" ? row : {};
  const merged = {
    ...r,
    brand_name: r.brand_name ?? r.brand ?? null,
    model_name: r.model_name ?? r.model ?? null,
    garage_brand: r.garage_brand ?? r.brand,
    garage_model: r.garage_model ?? r.model,
    garage_engine: r.garage_engine ?? r.engine ?? null,
  };
  return rowToSavedCarFromResolved(/** @type {Record<string, unknown>} */ (merged));
}

/** @param {unknown} v @returns {number | undefined} */
function bigintColumnFromCar(v) {
  if (v == null || v === "") return undefined;
  const n = typeof v === "number" ? v : Number(String(v).trim());
  return Number.isFinite(n) && Number.isSafeInteger(n) ? n : undefined;
}

/** @param {string} userId @param {object} car @param {number} sortIndex */
function carToRow(userId, car, sortIndex) {
  const o = car && typeof car === "object" ? /** @type {Record<string, unknown>} */ (car) : {};
  const catalogBrandId =
    bigintColumnFromCar(o.catalog_brand_id) ?? bigintColumnFromCar(o.catalogBrandId);
  const catalogModelId =
    bigintColumnFromCar(o.catalog_model_id) ?? bigintColumnFromCar(o.catalogModelId);
  const catalogGenerationId =
    bigintColumnFromCar(o.catalog_generation_id) ?? bigintColumnFromCar(o.catalogGenerationId);

  const catalogVariantId =
    bigintColumnFromCar(o.catalog_variant_id) ??
    bigintColumnFromCar(o.catalogVariantId) ??
    bigintColumnFromCar(o.bmw_variant_id) ??
    bigintColumnFromCar(o.bmwVariantId) ??
    bigintColumnFromCar(o.variantId) ??
    bigintColumnFromCar(o.variant_id);
  const catalogConfigurationId =
    bigintColumnFromCar(o.catalog_configuration_id) ??
    bigintColumnFromCar(o.catalogConfigurationId) ??
    bigintColumnFromCar(o.bmw_configuration_id) ??
    bigintColumnFromCar(o.bmwConfigurationId) ??
    bigintColumnFromCar(o.configurationId) ??
    bigintColumnFromCar(o.configuration_id);

  const bmwVariantId =
    bigintColumnFromCar(o.bmw_variant_id) ??
    bigintColumnFromCar(o.bmwVariantId) ??
    catalogVariantId;
  const bmwConfigurationId =
    bigintColumnFromCar(o.bmw_configuration_id) ??
    bigintColumnFromCar(o.bmwConfigurationId) ??
    catalogConfigurationId;

  const extras = {};
  for (const [k, v] of Object.entries(o)) {
    if (TOP_KEYS.has(k)) continue;
    if (
      k === "bmwVariantId" ||
      k === "variantId" ||
      k === "bmwConfigurationId" ||
      k === "configurationId" ||
      k === "variant_id" ||
      k === "configuration_id" ||
      k === "catalogBrandId" ||
      k === "catalogModelId" ||
      k === "catalogGenerationId" ||
      k === "catalogVariantId" ||
      k === "catalogConfigurationId" ||
      k === "catalogResolved" ||
      k === "savedVehicleId" ||
      k === "bmwFrontSuspensionType" ||
      k === "bmwRearSuspensionType" ||
      k === "front_suspension_type" ||
      k === "rear_suspension_type" ||
      k === "catalogTransmissionType" ||
      k === "catalogDrivetrainLayout" ||
      k === "catalogDrivetrainLabel" ||
      k === "catalogVariantName" ||
      k === "catalogGenerationCode" ||
      k === "catalogDifferentialLabel" ||
      k === "catalogDifferentialType"
    ) {
      continue;
    }
    if (v === undefined) continue;
    extras[k] = v;
  }

  return {
    user_id: userId,
    brand: String(car.brand || "").trim(),
    model: car.model ? String(car.model).trim() : null,
    engine: car.engine ? String(car.engine).trim() : null,
    body_type: car.bodyType ? String(car.bodyType).trim() : null,
    brand_logo_url: car.brandLogoUrl ? String(car.brandLogoUrl).trim() : null,
    production_years: car.productionYears ? String(car.productionYears).trim() : null,
    saved_at: car.savedAt ? String(car.savedAt).trim() : null,
    sort_index: sortIndex,
    catalog_brand_id: catalogBrandId ?? null,
    catalog_model_id: catalogModelId ?? null,
    catalog_generation_id: catalogGenerationId ?? null,
    catalog_variant_id: catalogVariantId ?? null,
    catalog_configuration_id: catalogConfigurationId ?? null,
    bmw_variant_id: bmwVariantId ?? null,
    bmw_configuration_id: bmwConfigurationId ?? null,
    extras,
  };
}

/**
 * Citește mașinile din cloud pentru user (view resolved).
 * @param {import("@supabase/supabase-js").SupabaseClient} sb
 * @param {string} userId
 */
export async function fetchSavedVehiclesFromCloud(sb, userId) {
  const primary = await fetchResolvedGarageForUser(sb, userId);
  if (!primary.error) {
    return dedupeGarageCars(primary.data || []);
  }
  console.warn("[garage-cloud] resolved view unavailable, falling back to raw table", primary.error);

  const { data, error } = await sb
    .from(TABLE)
    .select("*")
    .eq("user_id", userId)
    .order("sort_index", { ascending: true });
  if (error) {
    console.warn("[garage-cloud]", error.message || String(error));
    throw error;
  }
  const legacy = (data || []).map((row) => rowToSavedCar(/** @type {Record<string, unknown>} */ (row)));
  return dedupeGarageCars(legacy.filter((c) => c.brand.length > 0));
}

/**
 * Înlocuiește întreg garajul în cloud cu lista dată (aceeași ordine ca în UI).
 * @param {import("@supabase/supabase-js").SupabaseClient} sb
 * @param {string} userId
 * @param {object[]} cars
 */
export async function replaceSavedVehiclesInCloud(sb, userId, cars) {
  const { error: delErr } = await sb.from(TABLE).delete().eq("user_id", userId);
  if (delErr) {
    console.warn("[garage-cloud] delete", delErr.message || String(delErr));
    return false;
  }
  const uniqueCars = dedupeGarageCars(cars);
  if (!uniqueCars.length) return true;
  const rows = uniqueCars.map((c, i) => carToRow(userId, c, i));
  const { error: insErr } = await sb.from(TABLE).insert(rows);
  if (insErr) {
    console.warn("[garage-cloud] insert", insErr.message || String(insErr));
    return false;
  }
  return true;
}

/** Sesiunea poate apărea după hidratarea storage (cookie mirror). */
async function getSessionWithRetry(sb, attempts = 4) {
  for (let i = 0; i < attempts; i += 1) {
    const {
      data: { session },
      error,
    } = await sb.auth.getSession();
    if (error) throw error;
    if (session?.user) return session;
    await new Promise((r) => setTimeout(r, 120 * (i + 1)));
  }
  const {
    data: { session },
    error,
  } = await sb.auth.getSession();
  if (error) throw error;
  return session ?? null;
}

/**
 * Încarcă garajul din Supabase în memorie; fără autentificare păstrează memoria curentă.
 * Migrare: dacă există vechiul JSON în `localStorage`, îl îmbină în cloud și păstrează copia demo locală.
 * @returns {Promise<import("./garage-saved-cars.mjs").SavedGarageCar[]>}
 */
export async function syncGarageFromCloudAndLocal(client = null) {
  const sb = getGarageCloudSupabase(client);
  const session = await getSessionWithRetry(sb);
  const legacyRows = readLegacyGarageArrayFromBrowserStorage();

  /** Fără cont: nu putem citi cloud-ul, dar încă putem rehidrata vechiul garaj din `localStorage`. */
  if (!session?.user) {
    if (legacyRows?.length) {
      const cur = readSavedCars();
      const merged = mergeCloudGarageWithLocalOnlyAdditions(legacyRows, cur);
      writeSavedCars(merged);
    }
    return readSavedCars();
  }

  const userId = session.user.id;
  let cloud = await fetchSavedVehiclesFromCloud(sb, userId);

  if (legacyRows?.length) {
    cloud = mergeCloudGarageWithLocalOnlyAdditions(cloud, legacyRows);
    writeSavedCars(cloud);
    const migrated = await replaceSavedVehiclesInCloud(sb, userId, readSavedCars());
    if (migrated) clearLegacyGarageBrowserKeys();
    cloud = readSavedCars();
  }

  const inMemory = readSavedCars();

  if (cloud.length > 0) {
    const merged = mergeCloudGarageWithLocalOnlyAdditions(cloud, inMemory);
    writeSavedCars(merged);
    if (merged.length > cloud.length) {
      void replaceSavedVehiclesInCloud(sb, userId, merged).then((ok) => {
        if (!ok) console.warn("[garage-cloud] reconcile push după merge local a eșuat");
      });
    }
    return readSavedCars();
  }
  if (inMemory.length > 0) {
    await replaceSavedVehiclesInCloud(sb, userId, inMemory);
    return readSavedCars();
  }
  writeSavedCars([]);
  return readSavedCars();
}

/** După modificări locale: rescrie cloud-ul (utilizator autentificat). */
export async function pushLocalGarageToCloud(client = null) {
  const sb = getGarageCloudSupabase(client);
  const session = await getSessionWithRetry(sb, 2);
  if (!session?.user) return;
  const local = readSavedCars();
  await replaceSavedVehiclesInCloud(sb, session.user.id, local);
}
