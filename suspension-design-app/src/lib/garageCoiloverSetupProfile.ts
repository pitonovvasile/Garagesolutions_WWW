import type { CoiloverSetupTier } from "../data/coiloverSetup";
import { COILOVER_SETUP_TIER_OPTIONS } from "../data/coiloverSetup";
import { readSavedCars, writeSavedCars, type SavedGarageCar } from "./garageStorage";
import { useSuspensionStore } from "../store/suspensionStore";

export const GARAGE_COILOVER_SETUP_KEY = "suspensionCoiloverSetup";

export interface GarageCoiloverSetupProfile {
  version: 1;
  savedAt: number;
  coiloverSetupTier: CoiloverSetupTier;
  coiloverAftermarketBrand: string | null;
  coiloverAftermarketBrandOther: string | null;
  coiloverAftermarketSpringBrand: string | null;
  coiloverAftermarketSpringBrandOther: string | null;
  coiloverAftermarketDamperBrand: string | null;
  coiloverAftermarketDamperBrandOther: string | null;
  measuredFrontCamberDeg: number | null;
  measuredRearCamberDeg: number | null;
}

function isTier(v: unknown): v is CoiloverSetupTier {
  return typeof v === "string" && (COILOVER_SETUP_TIER_OPTIONS as readonly string[]).includes(v);
}

function numOrNull(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function readCoiloverSetupFromCar(car: SavedGarageCar): GarageCoiloverSetupProfile | null {
  const raw = car[GARAGE_COILOVER_SETUP_KEY];
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (o.version !== 1) return null;
  if (!isTier(o.coiloverSetupTier)) return null;
  return {
    version: 1,
    savedAt: typeof o.savedAt === "number" ? o.savedAt : Date.now(),
    coiloverSetupTier: o.coiloverSetupTier,
    coiloverAftermarketBrand:
      o.coiloverAftermarketBrand == null ? null : String(o.coiloverAftermarketBrand).trim() || null,
    coiloverAftermarketBrandOther:
      o.coiloverAftermarketBrandOther == null
        ? null
        : String(o.coiloverAftermarketBrandOther).trim() || null,
    coiloverAftermarketSpringBrand:
      o.coiloverAftermarketSpringBrand == null
        ? null
        : String(o.coiloverAftermarketSpringBrand).trim() || null,
    coiloverAftermarketSpringBrandOther:
      o.coiloverAftermarketSpringBrandOther == null
        ? null
        : String(o.coiloverAftermarketSpringBrandOther).trim() || null,
    coiloverAftermarketDamperBrand:
      o.coiloverAftermarketDamperBrand == null
        ? null
        : String(o.coiloverAftermarketDamperBrand).trim() || null,
    coiloverAftermarketDamperBrandOther:
      o.coiloverAftermarketDamperBrandOther == null
        ? null
        : String(o.coiloverAftermarketDamperBrandOther).trim() || null,
    measuredFrontCamberDeg: numOrNull(o.measuredFrontCamberDeg),
    measuredRearCamberDeg: numOrNull(o.measuredRearCamberDeg),
  };
}

export function collectCoiloverSetupFromStore(): GarageCoiloverSetupProfile {
  const s = useSuspensionStore.getState();
  return {
    version: 1,
    savedAt: Date.now(),
    coiloverSetupTier: s.coiloverSetupTier,
    coiloverAftermarketBrand: s.coiloverAftermarketBrand,
    coiloverAftermarketBrandOther: s.coiloverAftermarketBrandOther,
    coiloverAftermarketSpringBrand: s.coiloverAftermarketSpringBrand,
    coiloverAftermarketSpringBrandOther: s.coiloverAftermarketSpringBrandOther,
    coiloverAftermarketDamperBrand: s.coiloverAftermarketDamperBrand,
    coiloverAftermarketDamperBrandOther: s.coiloverAftermarketDamperBrandOther,
    measuredFrontCamberDeg: s.measuredFrontCamberDeg,
    measuredRearCamberDeg: s.measuredRearCamberDeg,
  };
}

export function applyCoiloverSetupToStore(profile: GarageCoiloverSetupProfile): void {
  const s = useSuspensionStore.getState();
  s.setCoiloverSetupTier(profile.coiloverSetupTier);
  s.setCoiloverAftermarketBrand(profile.coiloverAftermarketBrand);
  s.setCoiloverAftermarketBrandOther(profile.coiloverAftermarketBrandOther);
  s.setCoiloverAftermarketSpringBrand(profile.coiloverAftermarketSpringBrand);
  s.setCoiloverAftermarketSpringBrandOther(profile.coiloverAftermarketSpringBrandOther);
  s.setCoiloverAftermarketDamperBrand(profile.coiloverAftermarketDamperBrand);
  s.setCoiloverAftermarketDamperBrandOther(profile.coiloverAftermarketDamperBrandOther);
  s.setMeasuredFrontCamberDeg(profile.measuredFrontCamberDeg);
  s.setMeasuredRearCamberDeg(profile.measuredRearCamberDeg);
}

export type SaveCoiloverSetupResult = { ok: true; message: string } | { ok: false; message: string };

export async function saveCoiloverSetupToGarageCar(
  garageCarIndex: number,
): Promise<SaveCoiloverSetupResult> {
  const cars = readSavedCars();
  if (!Number.isInteger(garageCarIndex) || garageCarIndex < 0 || garageCarIndex >= cars.length) {
    return { ok: false, message: "Selectează o mașină din garaj (sidebar stânga)." };
  }

  const profile = collectCoiloverSetupFromStore();
  const next = [...cars];
  next[garageCarIndex] = {
    ...next[garageCarIndex]!,
    [GARAGE_COILOVER_SETUP_KEY]: profile,
  };
  writeSavedCars(next);

  try {
    const { pushLocalGarageToCloud } = await import("@site-garage-cloud");
    await pushLocalGarageToCloud();
  } catch (e) {
    console.warn("[coilover-setup] push garaj cloud", e);
    return {
      ok: true,
      message: "Salvat în garaj (sesiune). Sync cloud indisponibil — reîncearcă din Cont.",
    };
  }

  return { ok: true, message: "Coil over setup salvat în profilul mașinii din garaj." };
}
