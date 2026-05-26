import type { AntiRollBarMode, AntiRollBarStiffness } from "../data/antiRollBar";
import { readSavedCars, writeSavedCars, type SavedGarageCar } from "./garageStorage";
import { useSuspensionStore } from "../store/suspensionStore";

export const GARAGE_ANTI_ROLL_BAR_PROFILE_KEY = "suspensionAntiRollBarProfile";

export interface GarageAntiRollBarAxleProfile {
  mode: AntiRollBarMode;
  brand: string | null;
  stiffness: AntiRollBarStiffness | null;
}

export interface GarageAntiRollBarProfile {
  version: 1;
  savedAt: number;
  front: GarageAntiRollBarAxleProfile;
  rear: GarageAntiRollBarAxleProfile;
}

function isMode(v: unknown): v is AntiRollBarMode {
  return v === "na" || v === "stock" || v === "tuning";
}

function isStiffness(v: unknown): v is AntiRollBarStiffness {
  return v === "low" || v === "medium" || v === "high";
}

function normalizeAxle(raw: unknown): GarageAntiRollBarAxleProfile | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (!isMode(o.mode)) return null;
  const mode = o.mode;
  const brand = o.brand == null ? null : String(o.brand).trim() || null;
  const stiffness = isStiffness(o.stiffness) ? o.stiffness : null;
  return { mode, brand, stiffness };
}

export function readAntiRollBarProfileFromCar(car: SavedGarageCar): GarageAntiRollBarProfile | null {
  const raw = car[GARAGE_ANTI_ROLL_BAR_PROFILE_KEY];
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (o.version !== 1) return null;
  const front = normalizeAxle(o.front);
  const rear = normalizeAxle(o.rear);
  if (!front || !rear) return null;
  return {
    version: 1,
    savedAt: typeof o.savedAt === "number" ? o.savedAt : Date.now(),
    front,
    rear,
  };
}

export function collectAntiRollBarProfileFromStore(): GarageAntiRollBarProfile {
  const s = useSuspensionStore.getState();
  return {
    version: 1,
    savedAt: Date.now(),
    front: {
      mode: s.antiRollBarFrontMode,
      brand: s.antiRollBarFrontBrand,
      stiffness: s.antiRollBarFrontStiffness,
    },
    rear: {
      mode: s.antiRollBarRearMode,
      brand: s.antiRollBarRearBrand,
      stiffness: s.antiRollBarRearStiffness,
    },
  };
}

export function applyAntiRollBarProfileToStore(profile: GarageAntiRollBarProfile): void {
  const s = useSuspensionStore.getState();
  s.setAntiRollBarFrontMode(profile.front.mode);
  s.setAntiRollBarRearMode(profile.rear.mode);
  s.setAntiRollBarFrontBrand(profile.front.brand);
  s.setAntiRollBarRearBrand(profile.rear.brand);
  /* După mode — setMode resetează brand/stiffness pentru stock/na/tuning. */
  s.setAntiRollBarFrontStiffness(profile.front.stiffness);
  s.setAntiRollBarRearStiffness(profile.rear.stiffness);
}

export type SaveAntiRollBarToGarageResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

/** Scrie profilul ARB (față + spate) pe mașina din garaj și încearcă sync cloud. */
export async function saveAntiRollBarToGarageCar(
  garageCarIndex: number,
): Promise<SaveAntiRollBarToGarageResult> {
  const cars = readSavedCars();
  if (!Number.isInteger(garageCarIndex) || garageCarIndex < 0 || garageCarIndex >= cars.length) {
    return { ok: false, message: "Selectează o mașină din garaj (sidebar stânga)." };
  }

  const profile = collectAntiRollBarProfileFromStore();
  const next = [...cars];
  next[garageCarIndex] = {
    ...next[garageCarIndex]!,
    [GARAGE_ANTI_ROLL_BAR_PROFILE_KEY]: profile,
  };
  writeSavedCars(next);

  try {
    const { pushLocalGarageToCloud } = await import("@site-garage-cloud");
    await pushLocalGarageToCloud();
  } catch (e) {
    console.warn("[arb] push garaj cloud", e);
    return {
      ok: true,
      message: "Salvat în garaj (sesiune). Sync cloud indisponibil — reîncearcă din Cont.",
    };
  }

  return { ok: true, message: "Anti-roll bar salvat în profilul mașinii din garaj." };
}
