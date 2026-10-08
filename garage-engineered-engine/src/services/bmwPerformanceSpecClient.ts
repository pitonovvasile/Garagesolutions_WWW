import type { SavedGarageCar } from "../lib/garageStorage";
import {
  collectCatalogIdCandidates,
  extractEngineCodeFromCar,
  isSafeCatalogBigintKey,
  mergePerformanceSpecRows,
  performanceSpecFromGarageCar,
  pickPerformanceSpecFields,
  recordFromCar,
} from "../lib/performanceSpecRow";
import { getSiteSupabaseClient } from "../lib/supabaseSiteClient";

const BMW_TECHNICAL_SPECS = "bmw_technical_specs";
const BMW_CONFIGURATION_LOOKUP = "bmw_configuration_lookup";
const USER_SAVED_VEHICLES_RESOLVED = "user_saved_vehicles_resolved";

function carKey(car: SavedGarageCar | null, ...keys: string[]): string {
  const o = recordFromCar(car);
  for (const k of keys) {
    const v = o[k];
    if (v != null && String(v).trim()) return String(v).trim();
  }
  return "";
}

function numOrNull(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(",", ".").trim());
  return Number.isFinite(n) ? n : null;
}

function idEq(value: string): number | string {
  const n = Number(value);
  return Number.isSafeInteger(n) ? n : value;
}

/** Aliasuri compatibile cu `normalizeTechnicalSpecRow` din site. */
function normalizeTechnicalSpecRow(row: Record<string, unknown>): Record<string, unknown> {
  const o = { ...row };
  if (o.transmission_type == null) {
    o.transmission_type = o.configuration_transmission_type ?? o.variant_transmission_type ?? null;
  }
  if (o.gear_count == null) {
    o.gear_count = o.configuration_gear_count ?? o.variant_gear_count ?? null;
  }
  if (o.drivetrain_layout == null) {
    o.drivetrain_layout = o.configuration_drivetrain_layout ?? o.variant_drivetrain_layout ?? null;
  }
  if (o.drivetrain_label == null) {
    o.drivetrain_label = o.configuration_drivetrain_label ?? o.variant_drivetrain_label ?? null;
  }
  if (o.id == null && o.configuration_id != null) {
    o.id = o.configuration_id;
  }
  return o;
}

type SpecQueryResult = { data: unknown[] | null; error: { message?: string } | null };

async function querySpecRow(
  column: "configuration_id" | "variant_id" | "generation_id" | "engine_code_full",
  value: string | number,
  extra?: { column: "power_value" | "variant_id"; value: string | number },
): Promise<Record<string, unknown> | null> {
  const sb = getSiteSupabaseClient();
  let q = sb.from(BMW_TECHNICAL_SPECS).select("*").eq(column, value);
  if (extra) {
    q = q.eq(extra.column, extra.value);
  }
  const { data, error } = (await q.limit(1)) as SpecQueryResult;
  if (error) {
    console.warn(`[performance-spec] bmw_technical_specs ${column}:`, error.message);
    return null;
  }
  const row = data?.[0];
  if (row && typeof row === "object") {
    return normalizeTechnicalSpecRow(row as Record<string, unknown>);
  }
  return null;
}

async function resolveVariantIdFromLookup(configurationId: string): Promise<string | null> {
  if (!isSafeCatalogBigintKey(configurationId)) return null;
  const sb = getSiteSupabaseClient();
  for (const col of ["configuration_id", "id"] as const) {
    const { data, error } = await sb
      .from(BMW_CONFIGURATION_LOOKUP)
      .select("variant_id")
      .eq(col, idEq(configurationId))
      .limit(1);
    if (error) continue;
    const row = data?.[0] as Record<string, unknown> | undefined;
    const vid = String(row?.variant_id ?? "").trim();
    if (vid && isSafeCatalogBigintKey(vid)) return vid;
  }
  return null;
}

async function fetchTechnicalSpecByCatalogIds(car: SavedGarageCar): Promise<Record<string, unknown> | null> {
  const ids = collectCatalogIdCandidates(car);
  if (!ids.length) return null;

  for (const id of ids) {
    const row = await querySpecRow("configuration_id", idEq(id));
    if (row) return row;
  }

  for (const id of ids) {
    const row = await querySpecRow("variant_id", idEq(id));
    if (row) return row;
  }

  for (const id of ids) {
    const variantId = await resolveVariantIdFromLookup(id);
    if (!variantId) continue;
    const row = await querySpecRow("variant_id", idEq(variantId));
    if (row) return row;
  }

  return null;
}

async function fetchTechnicalSpecByEngine(car: SavedGarageCar): Promise<Record<string, unknown> | null> {
  const engineCode = extractEngineCodeFromCar(car);
  if (!engineCode || engineCode.length < 4) return null;

  const o = recordFromCar(car);
  const power =
    numOrNull(o.power_value) ??
    numOrNull(o.catalogPowerValue) ??
    numOrNull(o.powerValue);

  const ids = collectCatalogIdCandidates(car);
  const variantId = ids[0] ?? "";
  const generationId = carKey(car, "catalog_generation_id", "catalogGenerationId");

  if (power != null && variantId) {
    const row = await querySpecRow("engine_code_full", engineCode, {
      column: "power_value",
      value: power,
    });
    if (row) return row;

    const resolvedVariant = (await resolveVariantIdFromLookup(variantId)) ?? variantId;
    if (isSafeCatalogBigintKey(resolvedVariant)) {
      const byVariant = await querySpecRow("engine_code_full", engineCode, {
        column: "variant_id",
        value: idEq(resolvedVariant),
      });
      if (byVariant) return byVariant;
    }
  }

  if (generationId && isSafeCatalogBigintKey(generationId)) {
    const sb = getSiteSupabaseClient();
    const { data, error } = await sb
      .from(BMW_TECHNICAL_SPECS)
      .select("*")
      .eq("generation_id", idEq(generationId))
      .eq("engine_code_full", engineCode)
      .limit(1);
    if (!error && data?.[0] && typeof data[0] === "object") {
      return normalizeTechnicalSpecRow(data[0] as Record<string, unknown>);
    }
  }

  if (power != null) {
    const row = await querySpecRow("engine_code_full", engineCode, {
      column: "power_value",
      value: power,
    });
    if (row) return row;
  }

  return querySpecRow("engine_code_full", engineCode);
}

async function fetchResolvedPerformanceSpecRow(
  savedVehicleId: string,
): Promise<Record<string, unknown> | null> {
  try {
    const m = await import("@site-garage-cloud");
    const sb = m.getGarageCloudSupabase();
    const auth = await sb.auth.getUser();
    if (!auth.data.user) return null;

    const { data, error } = await sb
      .from(USER_SAVED_VEHICLES_RESOLVED)
      .select("*")
      .eq("id", savedVehicleId)
      .limit(1);

    if (error) {
      console.warn("[performance-spec] user_saved_vehicles_resolved:", error.message);
      return null;
    }
    const row = data?.[0];
    return row && typeof row === "object" ? (row as Record<string, unknown>) : null;
  } catch (e) {
    console.warn("[performance-spec] resolved fetch failed", e);
    return null;
  }
}

/**
 * Spec Performance pentru mașina din garaj / configurator.
 * Prioritate: `user_saved_vehicles_resolved` → cache garaj → `bmw_technical_specs` (completează goluri).
 */
export async function fetchBmwTechnicalSpecForCar(
  car: SavedGarageCar | null,
): Promise<Record<string, unknown> | null> {
  if (!car) return null;

  try {
    const fromCarCache = performanceSpecFromGarageCar(car);

    const savedVehicleId = carKey(car, "savedVehicleId");
    const resolvedRow = savedVehicleId
      ? await fetchResolvedPerformanceSpecRow(savedVehicleId)
      : null;
    const fromResolved = resolvedRow ? pickPerformanceSpecFields(resolvedRow) : null;

    const fromGarage = mergePerformanceSpecRows(fromResolved, fromCarCache);

    let fromCatalog = await fetchTechnicalSpecByCatalogIds(car);
    if (!fromCatalog) {
      fromCatalog = await fetchTechnicalSpecByEngine(car);
    }

    const merged = mergePerformanceSpecRows(fromGarage, fromCatalog);

    if (merged && import.meta.env.DEV) {
      console.debug("[performance-spec] loaded", {
        ids: collectCatalogIdCandidates(car),
        engine: extractEngineCodeFromCar(car),
        torque_nm: merged.torque_nm,
        fuel_grade: merged.fuel_grade,
        max_rpm: merged.max_rpm,
        compression_ratio: merged.compression_ratio,
      });
    }

    if (
      merged &&
      (merged.torque_nm == null || merged.fuel_grade == null || merged.max_rpm == null) &&
      (collectCatalogIdCandidates(car).length > 0 || extractEngineCodeFromCar(car))
    ) {
      console.warn("[performance-spec] incomplete row after fetch", {
        ids: collectCatalogIdCandidates(car),
        engine: extractEngineCodeFromCar(car),
        keys: Object.keys(merged),
      });
    }

    return merged;
  } catch (e) {
    console.error("[performance-spec] fetch failed", e);
    return performanceSpecFromGarageCar(car);
  }
}

/** Umple câmpurile Performance pe obiectele din garaj (batch la sync). */
export async function enrichGarageCarsWithBmwPerformanceSpec(
  cars: SavedGarageCar[],
): Promise<SavedGarageCar[]> {
  if (!cars.length) return cars;
  return Promise.all(
    cars.map(async (car) => {
      const needsFetch = !pickPerformanceSpecFields(car as Record<string, unknown>).torque_nm;
      if (!needsFetch) return car;
      const spec = await fetchBmwTechnicalSpecForCar(car);
      if (!spec) return car;
      return {
        ...car,
        ...spec,
        catalogTorqueNm: spec.torque_nm ?? (car as Record<string, unknown>).catalogTorqueNm,
        catalogFuelGrade: spec.fuel_grade ?? (car as Record<string, unknown>).catalogFuelGrade,
        catalogMaxRpm: spec.max_rpm ?? (car as Record<string, unknown>).catalogMaxRpm,
        catalogCompressionRatio:
          spec.compression_ratio ?? (car as Record<string, unknown>).catalogCompressionRatio,
        torqueNm: spec.torque_nm != null ? String(spec.torque_nm) : (car as Record<string, unknown>).torqueNm,
        fuelGrade: spec.fuel_grade ?? (car as Record<string, unknown>).fuelGrade,
        maxRpm: spec.max_rpm ?? (car as Record<string, unknown>).maxRpm,
        compressionRatio: spec.compression_ratio ?? (car as Record<string, unknown>).compressionRatio,
      };
    }),
  );
}
