import { useEffect, useMemo, useState } from "react";
import { buildPerformanceOeBaseline } from "../lib/performanceOeBaseline";
import { PERFORMANCE_SPEC_FIELD_KEYS } from "../lib/performanceSpecRow";
import type { SavedGarageCar } from "../lib/garageStorage";
import { subscribeGarageCars } from "../lib/garageStorage";
import { fetchBmwTechnicalSpecForCar } from "../services/bmwPerformanceSpecClient";

export function usePerformanceOeBaseline(car: SavedGarageCar | null) {
  const [specRow, setSpecRow] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [garageRevision, setGarageRevision] = useState(0);

  useEffect(() => {
    return subscribeGarageCars(() => {
      setGarageRevision((n) => n + 1);
    });
  }, []);

  const carSpecKey = useMemo(() => {
    if (!car) return "";
    const o = car as Record<string, unknown>;
    const perf: Record<string, unknown> = {};
    for (const k of PERFORMANCE_SPEC_FIELD_KEYS) {
      if (o[k] != null && String(o[k]).trim() !== "") perf[k] = o[k];
    }
    return JSON.stringify({
      cid: o.catalogConfigurationId ?? o.catalog_configuration_id,
      vid: o.catalogVariantId ?? o.catalog_variant_id,
      saved: o.savedVehicleId,
      rev: garageRevision,
      perf,
    });
  }, [car, garageRevision]);

  useEffect(() => {
    if (!car) {
      setSpecRow(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const row = await fetchBmwTechnicalSpecForCar(car);
        if (!cancelled) setSpecRow(row);
      } catch (e) {
        console.error("[performance-spec] hook fetch", e);
        if (!cancelled) setSpecRow(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [car, carSpecKey]);

  const baseline = useMemo(() => buildPerformanceOeBaseline({ car, specRow }), [car, specRow]);

  return { baseline, specRow, loading };
}
