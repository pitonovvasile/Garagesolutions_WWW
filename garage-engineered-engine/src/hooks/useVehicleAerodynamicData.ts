import { useEffect, useMemo, useState } from "react";
import type { AeroBodyComponentRow } from "../data/aeroBodyComponents";
import type { SavedGarageCar } from "../lib/garageStorage";
import {
  fetchVehicleAerodynamicData,
  type VehicleAerodynamicData,
} from "../services/aerodynamicDataClient";

const EMPTY_AERO_DATA: VehicleAerodynamicData = {
  baseAeroProfile: null,
  componentEffects: [],
  bodyStyleLabel: null,
  bodyStyleCode: null,
  generationBodyStyleId: null,
  packageLabel: null,
  packageProfileMatched: false,
  error: null,
};

function componentStateKey(components: AeroBodyComponentRow[]): string {
  return JSON.stringify(
    components.map((row) => ({
      id: row.id,
      installStatus: row.installStatus,
      upgradePlan: row.upgradePlan,
      aeroEstimateMode: row.aeroEstimateMode,
      aeroComponentType: row.aeroComponentType,
      aeroFunctionType: row.aeroFunctionType,
      aeroSizeClass: row.aeroSizeClass,
      aeroUsageClass: row.aeroUsageClass,
      aeroProductName: row.aeroProductName,
      widthMm: row.widthMm,
      chordMm: row.chordMm,
      protrusionMm: row.protrusionMm,
      lengthMm: row.lengthMm,
      heightMm: row.heightMm,
      angleDeg: row.angleDeg,
      rampAngleDeg: row.rampAngleDeg,
      groundClearanceMm: row.groundClearanceMm,
      hasEndplates: row.hasEndplates,
      hasSideFences: row.hasSideFences,
      sealedToUndertray: row.sealedToUndertray,
      startsFromFlatFloor: row.startsFromFlatFloor,
      strakesCount: row.strakesCount,
      sourceKind: row.sourceKind,
      sourceBrandId: row.sourceBrandId,
      planVendorKind: row.planVendorKind,
      planVendorBrandId: row.planVendorBrandId,
    })),
  );
}

function carStateKey(car: SavedGarageCar | null): string {
  if (!car) return "";
  const o = car as Record<string, unknown>;
  return JSON.stringify({
    savedVehicleId: o.savedVehicleId,
    catalogGenerationId: o.catalogGenerationId ?? o.catalog_generation_id,
    catalogVariantId: o.catalogVariantId ?? o.catalog_variant_id,
    bodyType: o.bodyType ?? o.body_type,
    aeroPackageId: o.aeroPackageId ?? o.aero_package_id,
    aeroPackage: o.aeroPackageName ?? o.aeroPackage ?? o.aero_package,
    label: [o.brand, o.model, o.engine].filter(Boolean).join(" "),
  });
}

export function useVehicleAerodynamicData({
  car,
  components,
  speedKmh,
}: {
  car: SavedGarageCar | null;
  components: AeroBodyComponentRow[];
  speedKmh: number;
}) {
  const [data, setData] = useState<VehicleAerodynamicData>(EMPTY_AERO_DATA);
  const [loading, setLoading] = useState(false);
  const key = useMemo(
    () => `${carStateKey(car)}|${componentStateKey(components)}|${Math.round(speedKmh * 10) / 10}`,
    [car, components, speedKmh],
  );

  useEffect(() => {
    if (!car) {
      setData({ ...EMPTY_AERO_DATA, error: "No vehicle selected" });
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const next = await fetchVehicleAerodynamicData({ car, components, speedKmh });
        if (!cancelled) setData(next);
      } catch (error) {
        console.warn("[aero-impact] fetch failed", error);
        if (!cancelled) {
          setData({
            ...EMPTY_AERO_DATA,
            error: error instanceof Error ? error.message : "Aero data unavailable",
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [car, components, speedKmh, key]);

  return { data, loading };
}
