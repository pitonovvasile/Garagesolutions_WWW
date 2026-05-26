/// <reference types="vite/client" />

declare module "@site-bmw-technical-specs" {
  export const BMW_TECHNICAL_SPECS: string;
  export const SPEC_TRANSMISSION_COL: string;
  export const SPEC_GEAR_COUNT_COL: string;
  export const SPEC_DRVT_LAYOUT_COL: string;
  export const SPEC_DRVT_LABEL_COL: string;
  export function normalizeTechnicalSpecRow(row: Record<string, unknown> | null | undefined): Record<string, unknown>;
  export function mapTechnicalSpecRows(rows: unknown[] | null | undefined): Record<string, unknown>[];
  export function applyTransmissionGearToSpecsQuery(
    q: unknown,
    transmission: Record<string, unknown> | null | undefined,
    gearVariant: { mode: "is_null" } | { mode: "eq"; value: string | number },
  ): unknown;
}

declare module "@site-supabase-config" {
  export const SUPABASE_URL: string;
  export const SUPABASE_ANON_KEY: string;
}

declare module "@site-user-saved-resolved" {
  export const USER_SAVED_VEHICLES_RESOLVED: string;
  export function rowToSavedCarFromResolved(row: Record<string, unknown>): Record<string, unknown>;
  export function fetchResolvedGarageForUser(
    sb: unknown,
    userId: string,
  ): Promise<{ data: Record<string, unknown>[]; error: { message?: string } | null; raw?: unknown[] }>;
}
