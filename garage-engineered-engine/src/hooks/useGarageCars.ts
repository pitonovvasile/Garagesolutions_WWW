import { useEffect, useState } from "react";
import { enrichGarageCarsWithDbData, loadInitialGarageData } from "../lib/garageInitialLoad";
import { readSavedCars, subscribeGarageCars, type SavedGarageCar } from "../lib/garageStorage";

async function enrichGarageCars(cars: SavedGarageCar[]): Promise<SavedGarageCar[]> {
  return enrichGarageCarsWithDbData(cars);
}

/**
 * Lista mașinilor din garaj: memorie în tab + sincronizare Supabase când există sesiune.
 * Citirea din cloud folosește `public.user_saved_vehicles_resolved`; scrierea rămâne pe `user_saved_vehicles`.
 */
export function useGarageCars(): SavedGarageCar[] {
  const [cars, setCars] = useState<SavedGarageCar[]>(() => readSavedCars());

  useEffect(() => {
    return subscribeGarageCars(() => {
      void (async () => {
        const raw = readSavedCars();
        setCars(await enrichGarageCars(raw));
      })();
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    let authUnsub: { unsubscribe: () => void } | undefined;

    (async () => {
      try {
        const m = await import("@site-garage-cloud");
        if (!cancelled) {
          const initial = await loadInitialGarageData();
          if (!cancelled) setCars(initial);
        }

        const sb = m.getGarageCloudSupabase();
        const { data } = sb.auth.onAuthStateChange((event: string) => {
          if (event === "TOKEN_REFRESHED") return;
          void (async () => {
            try {
              const next = await m.syncGarageFromCloudAndLocal();
              if (!cancelled) {
                setCars(await enrichGarageCars(next));
              }
            } catch (e) {
              console.warn("[suspension] garage cloud sync", e);
            }
          })();
        });
        authUnsub = data.subscription;
      } catch (e) {
        console.warn("[suspension] garage cloud module", e);
        if (!cancelled) {
          const raw = readSavedCars();
          setCars(await enrichGarageCars(raw));
        }
      }
    })();

    return () => {
      cancelled = true;
      authUnsub?.unsubscribe();
    };
  }, []);

  return cars;
}
