import { useEffect, useState } from "react";
import { fetchGarageResolvedForUser } from "../services/garageResolvedClient";

/**
 * Mașini din `user_saved_vehicles_resolved` pentru un user (Supabase session).
 */
export function useGarageResolvedForUser(userId: string | null) {
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) {
      setData([]);
      setError(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const { data: rows, error: err } = await fetchGarageResolvedForUser(userId);
        if (cancelled) return;
        setData(rows);
        setError(err?.message ? String(err.message) : null);
      } catch (e) {
        if (!cancelled) setError(String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const empty = !loading && !error && data.length === 0;
  return { data, error, loading, empty };
}
