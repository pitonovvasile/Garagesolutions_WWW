/**
 * Allowlist pentru write pe catalog live (bmw_catalog_entries.notes etc.).
 * Gol = nimeni din UI; adaugă e-mailuri lowercase ale adminilor.
 * Protecția reală rămâne RLS / grants în Supabase (vezi migrations/016_*.sql).
 */
export const CATALOG_ADMIN_EMAILS = [
  // "admin@example.com",
];

export function isCatalogAdminEmail(email) {
  if (!email || typeof email !== "string") return false;
  const e = email.trim().toLowerCase();
  return CATALOG_ADMIN_EMAILS.some((x) => String(x).trim().toLowerCase() === e);
}
