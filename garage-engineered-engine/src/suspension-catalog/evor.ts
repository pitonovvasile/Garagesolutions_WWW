import type { SuspensionOptionRow } from "./types";

const EVO_R = /\bevo[\s\-_]*r\b/i;

export function isEvoRProduct(row: SuspensionOptionRow): boolean {
  const blob = [row.vehicle_group, row.product_name, row.frontend_label, row.suspension_model]
    .filter(Boolean)
    .join(" ");
  return EVO_R.test(blob);
}

export function hasEvoRTechnicalData(row: SuspensionOptionRow): boolean {
  const keys: (keyof SuspensionOptionRow)[] = [
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
  ];
  return keys.some((k) => {
    const v = row[k];
    if (v == null || v === "") return false;
    if (typeof v === "boolean") return v;
    return String(v).trim().length > 0;
  });
}
