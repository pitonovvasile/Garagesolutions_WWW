/**
 * Unele proiecte nu au view-ul `models_display`; PostgREST întoarce PGRST205.
 * Folosește `models` ca fallback ca să se poată construi lista de mărci active.
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 */
export async function fetchModelsDisplayOrFallback(supabase) {
  const primary = await supabase.from("models_display").select("*");
  if (!primary.error) return primary;

  const code = primary.error?.code;
  const msg = String(primary.error?.message ?? "");
  const tableMissing =
    code === "PGRST205" ||
    msg.includes("Could not find") ||
    msg.includes("schema cache");

  if (!tableMissing) return primary;

  const fb = await supabase.from("models").select("*").limit(4000);
  return { data: fb.data ?? [], error: fb.error ?? null };
}
