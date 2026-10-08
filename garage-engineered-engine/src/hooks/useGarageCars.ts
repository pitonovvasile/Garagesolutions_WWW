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
    let authTimer: ReturnType<typeof setTimeout> | undefined;

    const refreshGarage = async () => {
      try {
        const m = await import("@site-garage-cloud");
        await loadInitialGarageData();
        if (cancelled) return;
        const next = await m.syncGarageFromCloudAndLocal();
        const enriched = await enrichGarageCars(next);
        if (!cancelled) setCars(enriched);
      } catch (e) {
        console.warn("[suspension] garage cloud sync", e);
      }
    };

    (async () => {
      try {
        const m = await import("@site-garage-cloud");
        if (cancelled) return;
        const sb = m.getGarageCloudSupabase();
        const { data } = sb.auth.onAuthStateChange((event: string) => {
          if (cancelled || event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED") return;
          // Auth holds a lock during this callback; defer all Supabase calls.
          if (authTimer !== undefined) clearTimeout(authTimer);
          authTimer = setTimeout(() => {
            if (!cancelled) void refreshGarage();
          }, 0);
        });
        authUnsub = data.subscription;
        if (!cancelled) {
          const initial = await loadInitialGarageData();
          if (!cancelled) setCars(initial);
        }

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
      if (authTimer !== undefined) clearTimeout(authTimer);
      authUnsub?.unsubscribe();
    };
  }, []);

  return cars;
}
