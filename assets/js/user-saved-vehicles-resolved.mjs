/**
 * Garaj utilizator cu date tehnice **rezolvate**: `public.user_saved_vehicles_resolved`.
 * Sursa de adevăr pentru suspensie OEM: `front_suspension_type`, `rear_suspension_type` (snake_case pe view).
 *
 * Tabelul `user_saved_vehicles` persistă ID-uri catalog generice (`catalog_*`) + legacy BMW;
 * scrierea se face acolo; citirea pentru UI folosește acest view.
 */

/** @type {const} */
export const USER_SAVED_VEHICLES_RESOLVED = "user_saved_vehicles_resolved";

/** @param {unknown} v */
function numOrNull(v) {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).trim());
  return Number.isFinite(n) ? n : null;
}

/** @param {unknown} v */
function boolOrUndefined(v) {
  if (v === true || v === false) return v;
  if (v === 1 || v === "1" || v === "true") return true;
  if (v === 0 || v === "0" || v === "false") return false;
  return undefined;
}

/**
 * Mapare rând view → obiect garaj pentru localStorage / restul site-ului.
 * Păstrează coloana view `id` ca `savedVehicleId` (uuid).
 *
 * @param {Record<string, unknown>} row
 */
export function rowToSavedCarFromResolved(row) {
  const extrasRaw =
    row.extras && typeof row.extras === "object" && !Array.isArray(row.extras)
      ? /** @type {Record<string, unknown>} */ (row.extras)
      : {};

  const catVid = numOrNull(row.catalog_variant_id);
  const catCid = numOrNull(row.catalog_configuration_id);
  const legVid = numOrNull(row.bmw_variant_id ?? row.variant_id);
  const legCid = numOrNull(row.bmw_configuration_id ?? row.configuration_id);
  const vid = catVid ?? legVid;
  const cid = catCid ?? legCid;

  const catBrand = numOrNull(row.catalog_brand_id);
  const catModel = numOrNull(row.catalog_model_id);
  const catGen = numOrNull(row.catalog_generation_id);
  const catalogResolved = boolOrUndefined(row.catalog_resolved);

  const brand =
    String(row.brand_name ?? row.garage_brand ?? extrasRaw.brand ?? "").trim() || "";
  const model = String(row.model_name ?? row.garage_model ?? extrasRaw.model ?? "").trim() || undefined;
  const engine =
    String(
      row.engine_code_full ??
        row.engine_code ??
        row.garage_engine ??
        extrasRaw.engine ??
        "",
    ).trim() || undefined;

  const transmission = String(
    row.configuration_transmission_type ??
      row.variant_transmission_type ??
      extrasRaw.transmission_type ??
      "",
  ).trim();
  const drivetrainLayout = String(
    row.configuration_drivetrain_layout ??
      row.variant_drivetrain_layout ??
      extrasRaw.drivetrain_layout ??
      "",
  ).trim();
  const drivetrainLabel = String(
    row.configuration_drivetrain_label ??
      row.variant_drivetrain_label ??
      extrasRaw.drivetrain_label ??
      "",
  ).trim();

  const resolvedFront = String(row.front_suspension_type ?? "").trim();
  const resolvedRear = String(row.rear_suspension_type ?? "").trim();
  const frontSusp =
    resolvedFront ||
    String(extrasRaw.front_suspension_type ?? "").trim() ||
    String(extrasRaw.bmwFrontSuspensionType ?? "").trim() ||
    String(extrasRaw.FrontSuspensionType ?? "").trim();
  const rearSusp =
    resolvedRear ||
    String(extrasRaw.rear_suspension_type ?? "").trim() ||
    String(extrasRaw.bmwRearSuspensionType ?? "").trim() ||
    String(extrasRaw.RearSuspensionType ?? "").trim();

  const savedVehicleId = row.id != null && String(row.id).trim() ? String(row.id).trim() : undefined;

  /** Doar chei non-tehnice moștenite din extras (nu suprascriu catalogul). */
  const legacyExtras = { ...extrasRaw };
  for (const k of [
    "brand",
    "model",
    "engine",
    "bmwVariantId",
    "bmwConfigurationId",
    "variantId",
    "configurationId",
    "bmwFrontSuspensionType",
    "bmwRearSuspensionType",
    "front_suspension_type",
    "rear_suspension_type",
    "FrontSuspensionType",
    "RearSuspensionType",
    "catalogBrandId",
    "catalogModelId",
    "catalogGenerationId",
    "catalogVariantId",
    "catalogConfigurationId",
    "catalogResolved",
    "catalog_brand_id",
    "catalog_model_id",
    "catalog_generation_id",
    "catalog_variant_id",
    "catalog_configuration_id",
    "catalog_resolved",
    "savedVehicleId",
  ]) {
    delete legacyExtras[k];
  }

  return {
    ...legacyExtras,
    brand,
    ...(model ? { model } : {}),
    ...(engine ? { engine } : {}),
    bodyType: row.garage_body_type
      ? String(row.garage_body_type).trim()
      : row.body_type
        ? String(row.body_type).trim()
        : extrasRaw.bodyType
          ? String(extrasRaw.bodyType).trim()
          : undefined,
    brandLogoUrl: row.brand_logo_url ? String(row.brand_logo_url).trim() : undefined,
    productionYears: row.production_years ? String(row.production_years).trim() : undefined,
    savedAt: row.saved_at ? String(row.saved_at).trim() : undefined,
    ...(savedVehicleId ? { savedVehicleId } : {}),
    ...(catBrand != null ? { catalogBrandId: String(catBrand) } : {}),
    ...(catModel != null ? { catalogModelId: String(catModel) } : {}),
    ...(catGen != null ? { catalogGenerationId: String(catGen) } : {}),
    ...(catVid != null
      ? {
          catalog_variant_id: catVid,
          catalogVariantId: String(catVid),
        }
      : {}),
    ...(catCid != null
      ? {
          catalog_configuration_id: catCid,
          catalogConfigurationId: String(catCid),
        }
      : {}),
    ...(catalogResolved !== undefined ? { catalogResolved } : {}),
    ...(vid != null ? { bmwVariantId: String(vid), variantId: String(vid) } : {}),
    ...(cid != null ? { bmwConfigurationId: String(cid), configurationId: String(cid) } : {}),
    ...(frontSusp ? { bmwFrontSuspensionType: frontSusp, front_suspension_type: frontSusp } : {}),
    ...(rearSusp ? { bmwRearSuspensionType: rearSusp, rear_suspension_type: rearSusp } : {}),
    ...(transmission ? { catalogTransmissionType: transmission } : {}),
    ...(drivetrainLayout || drivetrainLabel
      ? {
          catalogDrivetrainLayout: drivetrainLayout || undefined,
          catalogDrivetrainLabel: drivetrainLabel || undefined,
        }
      : {}),
    ...(row.variant_name ? { catalogVariantName: String(row.variant_name) } : {}),
    ...(row.generation_code ? { catalogGenerationCode: String(row.generation_code) } : {}),
    ...(row.differential_label ? { catalogDifferentialLabel: String(row.differential_label) } : {}),
    ...(row.differential_type ? { catalogDifferentialType: String(row.differential_type) } : {}),
    ...(row.power_value != null && String(row.power_value).trim() !== ""
      ? {
          power_value: row.power_value,
          catalogPowerValue: row.power_value,
          powerValue: row.power_value,
        }
      : {}),
    ...(row.power_unit ? { power_unit: row.power_unit, catalogPowerUnit: String(row.power_unit) } : {}),
    ...(row.power_rpm != null && String(row.power_rpm).trim() !== ""
      ? { power_rpm: row.power_rpm, catalogPowerRpm: row.power_rpm }
      : {}),
    ...(row.torque_nm != null && String(row.torque_nm).trim() !== ""
      ? {
          torque_nm: row.torque_nm,
          catalogTorqueNm: row.torque_nm,
          torqueNm: String(row.torque_nm),
        }
      : {}),
    ...(row.displacement_cc != null && String(row.displacement_cc).trim() !== ""
      ? { displacement_cc: row.displacement_cc, catalogDisplacementCc: row.displacement_cc }
      : {}),
    ...(row.engine_type ? { engine_type: row.engine_type } : {}),
    ...(row.fuel_type ? { fuel_type: row.fuel_type } : {}),
    ...(row.engine_code_full ? { engine_code_full: row.engine_code_full } : {}),
    ...(row.engine_code ? { engine_code: row.engine_code } : {}),
    ...(row.power_kw != null && String(row.power_kw).trim() !== ""
      ? { power_kw: row.power_kw, catalogPowerKw: row.power_kw, powerKw: row.power_kw }
      : {}),
    ...(row.torque_rpm != null && String(row.torque_rpm).trim() !== ""
      ? { torque_rpm: row.torque_rpm, catalogTorqueRpm: row.torque_rpm, torqueRpm: row.torque_rpm }
      : {}),
    ...(row.fuel_grade ? { fuel_grade: row.fuel_grade, catalogFuelGrade: String(row.fuel_grade), fuelGrade: String(row.fuel_grade) } : {}),
    ...(row.max_rpm != null && String(row.max_rpm).trim() !== ""
      ? { max_rpm: row.max_rpm, catalogMaxRpm: row.max_rpm, maxRpm: row.max_rpm }
      : {}),
    ...(row.compression_ratio != null && String(row.compression_ratio).trim() !== ""
      ? {
          compression_ratio: row.compression_ratio,
          catalogCompressionRatio: row.compression_ratio,
          compressionRatio: row.compression_ratio,
        }
      : {}),
    ...(row.curb_weight_kg != null && String(row.curb_weight_kg).trim() !== ""
      ? {
          curb_weight_kg: row.curb_weight_kg,
          catalogCurbWeightKg: row.curb_weight_kg,
          curbWeightKg: row.curb_weight_kg,
        }
      : {}),
    ...(row.factory_0_100_s != null && String(row.factory_0_100_s).trim() !== ""
      ? {
          factory_0_100_s: row.factory_0_100_s,
          catalogFactory0100S: row.factory_0_100_s,
        }
      : {}),
    ...(row.drivetrain_loss_pct != null && String(row.drivetrain_loss_pct).trim() !== ""
      ? {
          drivetrain_loss_pct: row.drivetrain_loss_pct,
          catalogDrivetrainLossPct: row.drivetrain_loss_pct,
          drivetrainLossPct: row.drivetrain_loss_pct,
        }
      : {}),
    ...(row.configuration_transmission_type
      ? { configuration_transmission_type: row.configuration_transmission_type }
      : {}),
    ...(row.variant_transmission_type ? { variant_transmission_type: row.variant_transmission_type } : {}),
    ...(row.configuration_gear_count != null ? { configuration_gear_count: row.configuration_gear_count } : {}),
    ...(row.variant_gear_count != null ? { variant_gear_count: row.variant_gear_count } : {}),
  };
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} sb
 * @param {string} userId
 */
export async function fetchResolvedGarageForUser(sb, userId) {
  const { data, error } = await sb
    .from(USER_SAVED_VEHICLES_RESOLVED)
    .select("*")
    .eq("user_id", userId)
    .order("sort_index", { ascending: true });
  if (error) {
    console.warn("[garage-resolved]", error.message || String(error));
    return { data: [], error };
  }
  const rows = Array.isArray(data) ? data : [];
  const cars = rows.map((r) => rowToSavedCarFromResolved(/** @type {Record<string, unknown>} */ (r)));
  return { data: cars.filter((c) => c.brand.length > 0), error: null, raw: rows };
}
