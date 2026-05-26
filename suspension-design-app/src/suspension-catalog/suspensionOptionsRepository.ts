import type { SupabaseClient } from "@supabase/supabase-js";
import type { SuspensionCatalogTableConfig, SuspensionModelOption, SuspensionOptionRow } from "./types";

const PRODUCT_SELECT = [
  "id",
  "vehicle_group",
  "body_type",
  "engine_group",
  "fuel_type",
  "drivetrain",
  "product_category",
  "product_category_slug",
  "manufacturer",
  "suspension_model",
  "suspension_model_slug",
  "product_name",
  "bilstein_code",
  "price_eur_incl_vat",
  "front_axle_load_kg",
  "rear_axle_load_kg",
  "front_lowering_mm_min",
  "front_lowering_mm_max",
  "rear_lowering_mm_min",
  "rear_lowering_mm_max",
  "is_oem_plus",
  "frontend_label",
  "frontend_description",
  "is_height_adjustable",
  "is_damping_adjustable",
  "is_threaded_suspension",
  "tuv_status",
  "road_legal_status",
  "recommendation_note",
  "show_homologation_warning",
  "homologation_warning",
  "sort_order",
  "frontend_active",
  "adjustment_type",
  "compression_adjustment_clicks",
  "rebound_adjustment_clicks",
  "adjustment_combinations",
  "damper_design",
  "reservoir_type",
  "construction_material",
  "spring_type",
  "front_main_spring_rate_n_mm_min",
  "front_main_spring_rate_n_mm_max",
  "front_tender_spring_rate_n_mm_min",
  "front_tender_spring_rate_n_mm_max",
  "rear_main_spring_rate_n_mm_min",
  "rear_main_spring_rate_n_mm_max",
  "rear_tender_spring_rate_n_mm_min",
  "rear_tender_spring_rate_n_mm_max",
  "technical_note",
].join(",");

function dedupeManufacturers(
  raw: { manufacturer?: string | null; product_category_slug?: string | null }[],
): string[] {
  const set = new Set<string>();
  for (const r of raw) {
    const m = String(r.manufacturer ?? "").trim();
    if (m) set.add(m);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, "ro"));
}

function shouldLogOemManufacturers(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return new URLSearchParams(window.location.search).get("oem_debug") === "1";
  } catch {
    return false;
  }
}

export interface SuspensionOptionsRepository {
  listManufacturers(productCategorySlug: string): Promise<{ data: string[]; error: Error | null }>;
  /** Toate perechile producător + model din categorie (fără filtru mașină) — pentru catalog anonim. */
  listAllManufacturerModels(productCategorySlug: string): Promise<{ data: SuspensionModelOption[]; error: Error | null }>;
  listSuspensionModels(
    productCategorySlug: string,
    manufacturer: string,
  ): Promise<{ data: SuspensionModelOption[]; error: Error | null }>;
  listProducts(
    productCategorySlug: string,
    manufacturer: string,
    suspensionModelSlug: string,
  ): Promise<{ data: SuspensionOptionRow[]; error: Error | null }>;
}

/**
 * Interogări directe PostgREST pe tabelul din `tableName` (implicit `public.bilstein_suspension_options`).
 * Fără date mock, seed sau stoc local — doar rânduri din Supabase.
 */
export function createSuspensionOptionsRepository(
  client: SupabaseClient,
  cfg: SuspensionCatalogTableConfig,
): SuspensionOptionsRepository {
  const { tableName } = cfg;

  return {
    async listManufacturers(productCategorySlug) {
      const slug = String(productCategorySlug ?? "").trim();
      if (!slug) {
        return { data: [], error: new Error("Slug categorie lipsă.") };
      }

      const { data, error } = await client
        .from(tableName)
        .select("manufacturer,product_category_slug")
        .eq("product_category_slug", slug)
        .eq("frontend_active", true)
        .order("manufacturer", { ascending: true });

      if (error) {
        return { data: [], error: new Error(error.message) };
      }

      const names = dedupeManufacturers((data ?? []) as { manufacturer?: string | null }[]);
      if (names.length > 0) {
        return { data: names, error: null };
      }

      const rawLen = (data ?? []).length;
      if (shouldLogOemManufacturers()) {
        console.info("[OEM+ listManufacturers]", {
          slug,
          tableName,
          rawDataLength: rawLen,
          rawSample: (data ?? []).slice(0, 5),
          dedupedCount: names.length,
          names,
        });
      }

      if (rawLen > 0 && names.length === 0) {
        return {
          data: [],
          error: new Error(
            `Rânduri returnate dar «manufacturer» lipsește sau e gol. Verifică datele în Supabase pentru product_category_slug «${slug}».`,
          ),
        };
      }

      const slugRows = await client
        .from(tableName)
        .select("manufacturer")
        .eq("product_category_slug", slug)
        .limit(50);
      if (!slugRows.error && slugRows.data?.length) {
        const anyMfr = slugRows.data.some((r) => String((r as { manufacturer?: string | null }).manufacturer ?? "").trim());
        if (!anyMfr) {
          return {
            data: [],
            error: new Error(
              `Există rânduri pentru product_category_slug «${slug}», dar «manufacturer» este NULL sau gol pe eșantion. Verifică coloana în Supabase.`,
            ),
          };
        }
      }

      const probeAny = await client
        .from(tableName)
        .select("id,manufacturer,product_category_slug,frontend_active")
        .limit(1);

      if (probeAny.error) {
        return {
          data: [],
          error: new Error(
            `${probeAny.error.message} — verifică tabelul «${tableName}» și cheia anon din assets/js/supabase-config.mjs.`,
          ),
        };
      }

      const probeFiltered = await client
        .from(tableName)
        .select("id,manufacturer,product_category_slug,frontend_active")
        .eq("product_category_slug", slug)
        .eq("frontend_active", true)
        .limit(1);

      if (shouldLogOemManufacturers()) {
        console.info("[OEM+ listManufacturers probe]", {
          probeAnyCount: probeAny.data?.length ?? 0,
          probeAnyRows: probeAny.data,
          probeFilteredCount: probeFiltered.data?.length ?? 0,
          probeFilteredError: probeFiltered.error?.message ?? null,
          probeFilteredRows: probeFiltered.data,
        });
      }

      if (probeFiltered.error) {
        return { data: [], error: new Error(probeFiltered.error.message) };
      }

      if ((probeAny.data?.length ?? 0) > 0 && (probeFiltered.data?.length ?? 0) === 0) {
        return {
          data: [],
          error: new Error(
            `Nu există rânduri cu product_category_slug «${slug}» și frontend_active = true, ` +
              `dar există alte rânduri vizibile pentru anon. Verifică slug-ul exact și coloana «frontend_active».`,
          ),
        };
      }

      return { data: [], error: null };
    },

    async listAllManufacturerModels(productCategorySlug) {
      const slug = String(productCategorySlug ?? "").trim();
      if (!slug) return { data: [], error: new Error("Slug categorie lipsă.") };

      const mapRowsToModels = (
        rows: {
          manufacturer?: string | null;
          suspension_model?: string | null;
          suspension_model_slug?: string | null;
          sort_order?: number | string | null;
        }[],
      ): SuspensionModelOption[] => {
        const byKey = new Map<string, SuspensionModelOption>();
        for (const r of rows) {
          const manufacturer = String(r.manufacturer ?? "").trim();
          const modelSlug = String(r.suspension_model_slug ?? "").trim();
          const label = String(r.suspension_model ?? "").trim() || modelSlug;
          if (!manufacturer || !modelSlug) continue;
          const sortNum = Number(r.sort_order);
          const sort_order = Number.isFinite(sortNum) ? sortNum : 0;
          const key = `${manufacturer}\0${modelSlug}`;
          const prev = byKey.get(key);
          if (!prev || sort_order < prev.sort_order) {
            byKey.set(key, {
              manufacturer,
              suspension_model: label,
              suspension_model_slug: modelSlug,
              sort_order,
            });
          }
        }
        return Array.from(byKey.values()).sort((a, b) => {
          const cm = a.manufacturer.localeCompare(b.manufacturer, "ro");
          if (cm !== 0) return cm;
          if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
          return a.suspension_model.localeCompare(b.suspension_model, "ro");
        });
      };

      const { data, error } = await client
        .from(tableName)
        .select("manufacturer,suspension_model,suspension_model_slug,sort_order")
        .eq("product_category_slug", slug)
        .eq("frontend_active", true)
        .order("manufacturer", { ascending: true })
        .order("sort_order", { ascending: true, nullsFirst: false });
      if (error) {
        return { data: [], error: new Error(error.message) };
      }
      return {
        data: mapRowsToModels(
          (data ?? []) as {
            manufacturer?: string | null;
            suspension_model?: string | null;
            suspension_model_slug?: string | null;
            sort_order?: number | string | null;
          }[],
        ),
        error: null,
      };
    },

    async listSuspensionModels(productCategorySlug, manufacturer) {
      const slug = String(productCategorySlug ?? "").trim();
      if (!slug) return { data: [], error: new Error("Slug categorie lipsă.") };

      const mapRowsToModels = (
        rows: {
          manufacturer?: string | null;
          suspension_model?: string | null;
          suspension_model_slug?: string | null;
          sort_order?: number | string | null;
        }[],
      ): SuspensionModelOption[] => {
        const bySlug = new Map<string, SuspensionModelOption>();
        for (const r of rows) {
          const modelSlug = String(r.suspension_model_slug ?? "").trim();
          const label = String(r.suspension_model ?? "").trim() || modelSlug;
          if (!modelSlug) continue;
          const sortNum = Number(r.sort_order);
          const sort_order = Number.isFinite(sortNum) ? sortNum : 0;
          const prev = bySlug.get(modelSlug);
          if (!prev || sort_order < prev.sort_order) {
            bySlug.set(modelSlug, {
              manufacturer: String(r.manufacturer ?? manufacturer).trim(),
              suspension_model: label,
              suspension_model_slug: modelSlug,
              sort_order,
            });
          }
        }
        return Array.from(bySlug.values()).sort((a, b) => {
          if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
          return a.suspension_model.localeCompare(b.suspension_model, "ro");
        });
      };

      const { data, error } = await client
        .from(tableName)
        .select("manufacturer,suspension_model,suspension_model_slug,sort_order")
        .eq("product_category_slug", slug)
        .eq("frontend_active", true)
        .eq("manufacturer", manufacturer)
        .order("sort_order", { ascending: true, nullsFirst: false });
      if (error) {
        return { data: [], error: new Error(error.message) };
      }
      const list = mapRowsToModels(
        (data ?? []) as {
          manufacturer?: string | null;
          suspension_model?: string | null;
          suspension_model_slug?: string | null;
          sort_order?: number | string | null;
        }[],
      );
      return { data: list, error: null };
    },

    async listProducts(productCategorySlug, manufacturer, suspensionModelSlug) {
      const slug = String(productCategorySlug ?? "").trim();
      if (!slug) return { data: [], error: new Error("Slug categorie lipsă.") };

      const { data, error } = await client
        .from(tableName)
        .select(PRODUCT_SELECT)
        .eq("product_category_slug", slug)
        .eq("frontend_active", true)
        .eq("manufacturer", manufacturer)
        .eq("suspension_model_slug", suspensionModelSlug)
        .order("sort_order", { ascending: true, nullsFirst: false });
      if (error) {
        return { data: [], error: new Error(error.message) };
      }
      const rows = (data ?? []) as unknown as SuspensionOptionRow[];
      return { data: rows, error: null };
    },
  };
}
