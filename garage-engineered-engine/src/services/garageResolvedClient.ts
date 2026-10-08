/**
 * Garaj din `user_saved_vehicles_resolved` (autentificat).
 */
export async function fetchGarageResolvedForUser(userId: string): Promise<{
  data: Record<string, unknown>[];
  error: { message?: string } | null;
}> {
  const m = await import("@site-garage-cloud");
  const r = await import("@site-user-saved-resolved");
  const sb = m.getGarageCloudSupabase();
  const out = await r.fetchResolvedGarageForUser(sb, userId);
  return {
    data: (out.data ?? []) as Record<string, unknown>[],
    error: (out.error as { message?: string }) ?? null,
  };
}
