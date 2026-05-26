import type { SavedGarageCar } from "./garageStorage";

/** Câmpuri tehnice Performance / OE Baseline — snake_case ca în view-urile Supabase. */
export const PERFORMANCE_SPEC_FIELD_KEYS = [
  "power_value",
  "power_unit",
  "power_kw",
  "power_rpm",
  "torque_nm",
  "torque_rpm",
  "fuel_type",
  "fuel_grade",
  "max_rpm",
  "compression_ratio",
  "curb_weight_kg",
  "factory_0_100_s",
  "drivetrain_loss_pct",
  "engine_code",
  "engine_code_full",
  "engine_type",
  "displacement_cc",
  "configuration_drivetrain_layout",
  "configuration_drivetrain_label",
  "variant_drivetrain_layout",
  "variant_drivetrain_label",
  "drivetrain_layout",
  "drivetrain_label",
  "configuration_transmission_type",
  "variant_transmission_type",
  "transmission_type",
  "configuration_gear_count",
  "variant_gear_count",
  "gear_count",
  "front_suspension_type",
  "rear_suspension_type",
  "differential_type",
  "differential_label",
] as const;

export type PerformanceSpecFieldKey = (typeof PERFORMANCE_SPEC_FIELD_KEYS)[number];

function isPresent(v: unknown): boolean {
  return v != null && String(v).trim() !== "";
}

/** Extrage doar câmpurile Performance din orice rând DB / obiect garaj. */
export function pickPerformanceSpecFields(
  source: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  if (!source) return {};
  const out: Record<string, unknown> = {};
  for (const key of PERFORMANCE_SPEC_FIELD_KEYS) {
    const v = source[key];
    if (isPresent(v)) out[key] = v;
  }
  return out;
}

/**
 * `primary` câștigă pentru valori non-null; `secondary` completează golurile.
 * Folosit: user_saved_vehicles_resolved (primary) + bmw_technical_specs (secondary).
 */
export function mergePerformanceSpecRows(
  primary: Record<string, unknown> | null | undefined,
  secondary: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null {
  const a = pickPerformanceSpecFields(primary);
  const b = pickPerformanceSpecFields(secondary);
  const merged: Record<string, unknown> = { ...b, ...a };
  return Object.keys(merged).length ? merged : null;
}

export function recordFromCar(car: SavedGarageCar | null): Record<string, unknown> {
  if (!car) return {};
  const o = car as Record<string, unknown>;
  const extras =
    o.extras && typeof o.extras === "object" && !Array.isArray(o.extras)
      ? (o.extras as Record<string, unknown>)
      : {};
  return { ...extras, ...o };
}

const BMW_ENGINE_CODE_RE = /\b([MNBR]\d{2}[A-Z0-9]{2,8})\b/i;

/** Cod motor BMW din câmpuri dedicate sau parsat din textul afișat (`engine`). */
export function extractEngineCodeFromCar(car: SavedGarageCar | null): string {
  if (!car) return "";
  const o = recordFromCar(car);
  for (const k of ["engine_code_full", "engine_code", "catalogEngineCodeFull", "engineCode"]) {
    const s = String(o[k] ?? "").trim();
    if (!s) continue;
    if (/^[A-NP-Z0-9]{4,12}$/i.test(s)) return s.toUpperCase();
    const m = s.match(BMW_ENGINE_CODE_RE);
    if (m?.[1]) return m[1].toUpperCase();
  }
  const blob = String(o.engine ?? "").trim();
  if (!blob) return "";
  const m = blob.match(BMW_ENGINE_CODE_RE);
  return m?.[1]?.toUpperCase() ?? "";
}

export function isSafeCatalogBigintKey(s: string): boolean {
  return /^\d{1,19}$/.test(s) && Number.isSafeInteger(Number(s));
}

/** Toate ID-urile catalog de pe mașină (inclusiv legacy cu variant/configuration inversate). */
export function collectCatalogIdCandidates(car: SavedGarageCar | null): string[] {
  if (!car) return [];
  const o = recordFromCar(car);
  const out = new Set<string>();
  for (const k of [
    "catalog_configuration_id",
    "catalogConfigurationId",
    "bmw_configuration_id",
    "bmwConfigurationId",
    "configurationId",
    "configuration_id",
    "catalog_variant_id",
    "catalogVariantId",
    "bmw_variant_id",
    "bmwVariantId",
    "variantId",
    "variant_id",
  ]) {
    const s = String(o[k] ?? "").trim();
    if (isSafeCatalogBigintKey(s)) out.add(s);
  }
  return [...out];
}

/** Aliasuri camelCase / catalog* de pe obiectul mașinii din garaj → snake_case DB. */
export function performanceSpecFromGarageCar(car: SavedGarageCar | null): Record<string, unknown> | null {
  if (!car) return null;
  const o = recordFromCar(car);

  const mapped: Record<string, unknown> = {
    ...pickPerformanceSpecFields(o),
    power_value: o.power_value ?? o.catalogPowerValue ?? o.powerValue,
    power_unit: o.power_unit ?? o.catalogPowerUnit ?? o.powerUnit,
    power_kw: o.power_kw ?? o.catalogPowerKw ?? o.powerKw,
    power_rpm: o.power_rpm ?? o.catalogPowerRpm ?? o.powerRpm,
    torque_nm: o.torque_nm ?? o.catalogTorqueNm ?? o.torqueNm,
    torque_rpm: o.torque_rpm ?? o.catalogTorqueRpm ?? o.torqueRpm,
    fuel_type: o.fuel_type ?? o.catalogFuelType ?? o.fuelType,
    fuel_grade: o.fuel_grade ?? o.catalogFuelGrade ?? o.fuelGrade,
    max_rpm: o.max_rpm ?? o.catalogMaxRpm ?? o.maxRpm,
    compression_ratio: o.compression_ratio ?? o.catalogCompressionRatio ?? o.compressionRatio,
    curb_weight_kg: o.curb_weight_kg ?? o.catalogCurbWeightKg ?? o.curbWeightKg ?? o.weight_kg,
    factory_0_100_s:
      o.factory_0_100_s ??
      o.catalogFactory0100S ??
      o.acceleration_0_100_s ??
      o.zero_to_100_s,
    drivetrain_loss_pct:
      o.drivetrain_loss_pct ?? o.catalogDrivetrainLossPct ?? o.drivetrainLossPct,
    engine_code: o.engine_code ?? o.engineCode ?? (extractEngineCodeFromCar(car) || undefined),
    engine_code_full: o.engine_code_full ?? (extractEngineCodeFromCar(car) || undefined),
    engine_type: o.engine_type ?? o.fuel_type,
    displacement_cc: o.displacement_cc ?? o.catalogDisplacementCc,
    configuration_drivetrain_layout:
      o.configuration_drivetrain_layout ?? o.catalogDrivetrainLayout ?? o.drivetrain_layout,
    configuration_drivetrain_label:
      o.configuration_drivetrain_label ?? o.catalogDrivetrainLabel ?? o.drivetrain_label,
    variant_drivetrain_layout: o.variant_drivetrain_layout,
    variant_drivetrain_label: o.variant_drivetrain_label,
    configuration_transmission_type:
      o.configuration_transmission_type ?? o.catalogTransmissionType ?? o.transmission_type,
    variant_transmission_type: o.variant_transmission_type,
    transmission_type: o.transmission_type ?? o.catalogTransmissionType,
    configuration_gear_count: o.configuration_gear_count ?? o.catalogGearCount,
    variant_gear_count: o.variant_gear_count,
    gear_count: o.gear_count ?? o.catalogGearCount,
    front_suspension_type: o.front_suspension_type ?? o.bmwFrontSuspensionType,
    rear_suspension_type: o.rear_suspension_type ?? o.bmwRearSuspensionType,
    differential_type: o.differential_type ?? o.catalogDifferentialType,
    differential_label: o.differential_label ?? o.catalogDifferentialLabel,
  };

  return mergePerformanceSpecRows(mapped, null);
}
