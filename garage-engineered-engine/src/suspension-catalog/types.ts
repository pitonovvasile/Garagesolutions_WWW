/**
 * Rând din catalogul de opțiuni suspensie (tabel generic, ex. `bilstein_suspension_options`).
 * Câmpurile sunt opționale pentru compatibilitate cu evoluția schemei și alți producători.
 */
export interface SuspensionOptionRow {
  id: string | number;

  vehicle_group?: string | null;
  body_type?: string | null;
  engine_group?: string | null;
  fuel_type?: string | null;
  drivetrain?: string | null;

  product_category?: string | null;
  product_category_slug?: string | null;
  manufacturer?: string | null;
  suspension_model?: string | null;
  suspension_model_slug?: string | null;

  product_name?: string | null;
  bilstein_code?: string | null;
  price_eur_incl_vat?: number | string | null;

  front_axle_load_kg?: number | string | null;
  rear_axle_load_kg?: number | string | null;

  front_lowering_mm_min?: number | string | null;
  front_lowering_mm_max?: number | string | null;
  rear_lowering_mm_min?: number | string | null;
  rear_lowering_mm_max?: number | string | null;

  is_oem_plus?: boolean | null;
  frontend_label?: string | null;
  frontend_description?: string | null;

  is_height_adjustable?: boolean | null;
  is_damping_adjustable?: boolean | null;
  is_threaded_suspension?: boolean | null;

  tuv_status?: string | null;
  road_legal_status?: string | null;
  recommendation_note?: string | null;

  show_homologation_warning?: boolean | null;
  homologation_warning?: string | null;

  sort_order?: number | string | null;
  frontend_active?: boolean | null;

  /** Specificații EVO R (sau echivalent) — opționale */
  adjustment_type?: string | null;
  compression_adjustment_clicks?: number | string | null;
  rebound_adjustment_clicks?: number | string | null;
  adjustment_combinations?: string | null;
  damper_design?: string | null;
  reservoir_type?: string | null;
  construction_material?: string | null;
  spring_type?: string | null;

  front_main_spring_rate_n_mm_min?: number | string | null;
  front_main_spring_rate_n_mm_max?: number | string | null;
  front_tender_spring_rate_n_mm_min?: number | string | null;
  front_tender_spring_rate_n_mm_max?: number | string | null;
  rear_main_spring_rate_n_mm_min?: number | string | null;
  rear_main_spring_rate_n_mm_max?: number | string | null;
  rear_tender_spring_rate_n_mm_min?: number | string | null;
  rear_tender_spring_rate_n_mm_max?: number | string | null;

  technical_note?: string | null;

  [key: string]: unknown;
}

export interface SuspensionModelOption {
  manufacturer: string;
  suspension_model: string;
  suspension_model_slug: string;
  sort_order: number;
}

/** Config pentru sursa de date — tabel Supabase (ex. `bilstein_suspension_options`). */
export interface SuspensionCatalogTableConfig {
  tableName: string;
}

export interface SuspensionCompatFilters {
  drivetrain: string;
  fuel_type: string;
  engine_group: string;
  body_type: string;
}

/** Slug din DB pentru categoria OEM+ — interogările folosesc egalitate strictă pe acest câmp. */
export const SUSPENSION_KITS_OEM_PLUS_SLUG = "suspension-kits-oem-plus" as const;
