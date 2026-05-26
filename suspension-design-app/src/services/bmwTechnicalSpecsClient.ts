/**
 * Client catalog BMW: `public.bmw_technical_specs` (anon).
 * Nu reconstruim specificații din text — view-ul e sursa de adevăr.
 */
export async function fetchBmwTechnicalSpecsByGenerationId(generationId: string | number): Promise<{
  data: Record<string, unknown>[];
  error: { message?: string } | null;
}> {
  const m = await import("@site-garage-cloud");
  const spec = await import("@site-bmw-technical-specs");
  const sb = m.getGarageCloudSupabase();
  const raw = String(generationId ?? "").trim();
  if (!raw) return { data: [], error: null };
  const idNum = Number(raw);
  const genEq = Number.isFinite(idNum) ? idNum : raw;

  let { data, error } = await sb
    .from(spec.BMW_TECHNICAL_SPECS)
    .select("*")
    .eq("generation_id", genEq)
    .limit(8000);

  if (!(data || []).length && typeof genEq === "number") {
    const alt = await sb
      .from(spec.BMW_TECHNICAL_SPECS)
      .select("*")
      .eq("generation_id", raw)
      .limit(8000);
    if (!alt.error && (alt.data || []).length) {
      data = alt.data;
      error = alt.error;
    }
  }

  return {
    data: spec.mapTechnicalSpecRows((data ?? []) as unknown[]),
    error: error as { message?: string } | null,
  };
}
