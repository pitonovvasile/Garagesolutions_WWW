import { getSiteSupabaseClient } from "../lib/supabaseSiteClient";

const PRODUCT_TABLES = ["products", "catalog_products", "parts"] as const;

export type TransmissionProductRow = Record<string, unknown>;

export function extractProductName(row: TransmissionProductRow): string {
  return String(row.name ?? row.title ?? row.product_name ?? "Unnamed product");
}

export function extractProductBrand(row: TransmissionProductRow): string {
  return String(row.brand ?? row.producer ?? row.manufacturer ?? "").trim();
}

export function extractProductPrice(row: TransmissionProductRow): number | null {
  const n = Number(row.price ?? row.price_ron ?? row.sale_price ?? null);
  return Number.isFinite(n) ? n : null;
}

export async function fetchTransmissionProducts(
  category: string,
  subcategory: string,
): Promise<{ rows: TransmissionProductRow[]; error: string | null }> {
  const sb = getSiteSupabaseClient();
  const errors: string[] = [];

  for (const table of PRODUCT_TABLES) {
    const { data, error } = await sb
      .from(table)
      .select("*")
      .eq("category", category)
      .eq("subcategory", subcategory)
      .limit(120);

    if (!error) {
      return { rows: (data ?? []) as TransmissionProductRow[], error: null };
    }
    errors.push(`${table}: ${error.message}`);
  }

  return { rows: [], error: errors.join(" | ") };
}

export function filterTransmissionProducts(
  rows: TransmissionProductRow[],
  filters: { query: string; brand: string; priceBand: "" | "0-500" | "500-1000" | "1000+" },
): TransmissionProductRow[] {
  const q = filters.query.trim().toLowerCase();
  const brand = filters.brand.trim().toLowerCase();

  return rows.filter((row) => {
    const name = extractProductName(row).toLowerCase();
    const rowBrand = extractProductBrand(row).toLowerCase();
    const price = extractProductPrice(row);

    if (q && !name.includes(q) && !rowBrand.includes(q)) return false;
    if (brand && rowBrand !== brand) return false;
    if (filters.priceBand === "0-500" && !(price !== null && price <= 500)) return false;
    if (filters.priceBand === "500-1000" && !(price !== null && price >= 500 && price <= 1000)) return false;
    if (filters.priceBand === "1000+" && !(price !== null && price >= 1000)) return false;
    return true;
  });
}
