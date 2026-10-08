import { useEffect, useState } from "react";
import { fetchActiveAeroData, type ActiveAeroDataResult } from "../services/activeAeroClient";
import { DEFAULT_ACTIVE_AERO_COMPONENTS } from "../lib/activeAero";

const INITIAL_ACTIVE_AERO_DATA: ActiveAeroDataResult = {
  components: DEFAULT_ACTIVE_AERO_COMPONENTS,
  source: "fallback",
  error: null,
};

export function useActiveAeroData() {
  const [data, setData] = useState<ActiveAeroDataResult>(INITIAL_ACTIVE_AERO_DATA);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    void (async () => {
      const next = await fetchActiveAeroData();
      if (!cancelled) {
        setData(next);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { ...data, loading };
}
