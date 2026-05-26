/**
 * Sursă canonică pentru catalog / configurator BMW: **`public.bmw_technical_specs`**.
 * Înlocuiește contractul vechi bazat pe `bmw_configuration_lookup` + parsare text.
 *
 * View-ul expune câmpuri pe **configurație** (`configuration_*`) și pe **variantă** (`variant_*`).
 * Pentru compatibilitate cu codul existent, normalizăm rândurile cu aliasuri `transmission_type`,
 * `gear_count`, `drivetrain_layout`, `drivetrain_label`, `id` (→ `configuration_id` când lipsește).
 */

/** @type {const} */
export const BMW_TECHNICAL_SPECS = "bmw_technical_specs";

export const SPEC_TRANSMISSION_COL = "configuration_transmission_type";
export const SPEC_GEAR_COUNT_COL = "configuration_gear_count";
export const SPEC_DRVT_LAYOUT_COL = "configuration_drivetrain_layout";
export const SPEC_DRVT_LABEL_COL = "configuration_drivetrain_label";

/**
 * @param {Record<string, unknown> | null | undefined} row
 * @returns {Record<string, unknown>}
 */
export function normalizeTechnicalSpecRow(row) {
  if (!row || typeof row !== "object") return /** @type {Record<string, unknown>} */ ({});
  const o = /** @type {Record<string, unknown>} */ ({ ...row });
  if (o.transmission_type == null) {
    o.transmission_type =
      o.configuration_transmission_type ?? o.variant_transmission_type ?? null;
  }
  if (o.gear_count == null) {
    o.gear_count = o.configuration_gear_count ?? o.variant_gear_count ?? null;
  }
  if (o.drivetrain_layout == null) {
    o.drivetrain_layout =
      o.configuration_drivetrain_layout ?? o.variant_drivetrain_layout ?? null;
  }
  if (o.drivetrain_label == null) {
    o.drivetrain_label =
      o.configuration_drivetrain_label ?? o.variant_drivetrain_label ?? null;
  }
  if (o.id == null && o.configuration_id != null) {
    o.id = o.configuration_id;
  }
  return o;
}

/** @param {unknown[] | null | undefined} rows */
export function mapTechnicalSpecRows(rows) {
  if (!Array.isArray(rows)) return [];
  return rows.map((r) =>
    r && typeof r === "object" && !Array.isArray(r)
      ? normalizeTechnicalSpecRow(/** @type {Record<string, unknown>} */ (r))
      : /** @type {Record<string, unknown>} */ ({}),
  );
}

/**
 * Filtru transmisie + trepte pe coloanele din `bmw_technical_specs`.
 * @param {import("@supabase/supabase-js").PostgrestFilterBuilder<any>} q
 * @param {Record<string, unknown> | null | undefined} transmission
 * @param {{ mode: 'is_null' } | { mode: 'eq'; value: string | number }} gearVariant
 */
export function applyTransmissionGearToSpecsQuery(q, transmission, gearVariant) {
  const tt = String(transmission?.transmission_type ?? "").trim();
  let out = q.eq(SPEC_TRANSMISSION_COL, tt);
  if (gearVariant.mode === "is_null") {
    return out.is(SPEC_GEAR_COUNT_COL, null);
  }
  return out.eq(SPEC_GEAR_COUNT_COL, gearVariant.value);
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {(b: import("@supabase/supabase-js").PostgrestFilterBuilder<any>) => Promise<{ data: unknown; error: unknown }>} picker
 */
export async function fetchTechnicalSpecsNormalized(supabase, picker) {
  const base = supabase.from(BMW_TECHNICAL_SPECS);
  const res = await picker(base);
  const raw = Array.isArray(res.data) ? res.data : [];
  return {
    data: mapTechnicalSpecRows(raw),
    error: res.error ?? null,
    rawEmpty: raw.length === 0,
  };
}
