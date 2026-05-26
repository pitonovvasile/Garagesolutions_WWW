import { useEffect, useState } from "react";
import { fetchBmwTechnicalSpecsByGenerationId } from "../services/bmwTechnicalSpecsClient";

/**
 * Date tehnice BMW pentru o generație, din `bmw_technical_specs`.
 */
export function useBmwTechnicalSpecsByGeneration(generationId: string | null) {
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!generationId) {
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
        const { data: rows, error: err } = await fetchBmwTechnicalSpecsByGenerationId(generationId);
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
  }, [generationId]);

  const empty = !loading && !error && data.length === 0;
  return { data, error, loading, empty };
}
