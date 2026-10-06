import {
  coerceSteeringRackRatioId,
  type AngleArmsId,
  type BushingsTypeId,
  type ChassisBracingId,
  type SteeringRackRatioId,
  type StrutBarBracingId,
} from "../data/handlingSteeringFeel";
import { readSavedCars, writeSavedCars, type SavedGarageCar } from "./garageStorage";
import { useSuspensionStore } from "../store/suspensionStore";

export const GARAGE_HANDLING_STEERING_FEEL_KEY = "suspensionHandlingSteeringFeel";

export interface GarageHandlingSteeringFeelProfile {
  version: 1;
  savedAt: number;
  steeringRackRatio: SteeringRackRatioId;
  steeringRackRatioCustom: string | null;
  frontStrutBarBracing: StrutBarBracingId;
  rearStrutBarBracing: StrutBarBracingId;
  chassisBracing: ChassisBracingId;
  bushingsType: BushingsTypeId;
  angleArms: AngleArmsId;
}

const STRUT_IDS = new Set<StrutBarBracingId>([
  "none",
  "oem",
  "strut_tower",
  "strut_lower_tie",
  "triangle",
  "aftermarket",
]);
const CHASSIS_IDS = new Set<ChassisBracingId>([
  "oem_minimal",
  "subframe",
  "partial",
  "semi",
  "full_cage",
  "aftermarket",
]);
const BUSHING_IDS = new Set<BushingsTypeId>([
  "oem_rubber",
  "poly_street",
  "poly_track",
  "spherical_mixed",
  "solid_race",
  "refresh_oem",
]);
const ARM_IDS = new Set<AngleArmsId>([
  "stock",
  "oem_upgraded",
  "adjustable_rear",
  "adjustable_front_rear",
  "tension_strut",
  "drift_extended",
  "aftermarket",
]);

function pickStrut(v: unknown, fallback: StrutBarBracingId): StrutBarBracingId {
  return typeof v === "string" && STRUT_IDS.has(v as StrutBarBracingId)
    ? (v as StrutBarBracingId)
    : fallback;
}

function pickChassis(v: unknown, fallback: ChassisBracingId): ChassisBracingId {
  return typeof v === "string" && CHASSIS_IDS.has(v as ChassisBracingId)
    ? (v as ChassisBracingId)
    : fallback;
}

function pickBushing(v: unknown, fallback: BushingsTypeId): BushingsTypeId {
  return typeof v === "string" && BUSHING_IDS.has(v as BushingsTypeId)
    ? (v as BushingsTypeId)
    : fallback;
}

function pickArms(v: unknown, fallback: AngleArmsId): AngleArmsId {
  return typeof v === "string" && ARM_IDS.has(v as AngleArmsId) ? (v as AngleArmsId) : fallback;
}

export function readHandlingSteeringFeelFromCar(
  car: SavedGarageCar,
): GarageHandlingSteeringFeelProfile | null {
  const raw = car[GARAGE_HANDLING_STEERING_FEEL_KEY];
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (o.version !== 1) return null;

  const rack = coerceSteeringRackRatioId(
    typeof o.steeringRackRatio === "string" ? o.steeringRackRatio : null,
  );
  const custom =
    o.steeringRackRatioCustom == null ? null : String(o.steeringRackRatioCustom).trim() || null;

  return {
    version: 1,
    savedAt: typeof o.savedAt === "number" ? o.savedAt : Date.now(),
    steeringRackRatio: rack,
    steeringRackRatioCustom: rack === "custom" ? custom : null,
    frontStrutBarBracing: pickStrut(o.frontStrutBarBracing, "oem"),
    rearStrutBarBracing: pickStrut(o.rearStrutBarBracing, "oem"),
    chassisBracing: pickChassis(o.chassisBracing, "oem_minimal"),
    bushingsType: pickBushing(o.bushingsType, "oem_rubber"),
    angleArms: pickArms(o.angleArms, "stock"),
  };
}

export function collectHandlingSteeringFeelFromStore(): GarageHandlingSteeringFeelProfile {
  const hf = useSuspensionStore.getState().handlingSteeringFeel;
  return {
    version: 1,
    savedAt: Date.now(),
    steeringRackRatio: hf.steeringRackRatio,
    steeringRackRatioCustom: hf.steeringRackRatioCustom,
    frontStrutBarBracing: hf.frontStrutBarBracing,
    rearStrutBarBracing: hf.rearStrutBarBracing,
    chassisBracing: hf.chassisBracing,
    bushingsType: hf.bushingsType,
    angleArms: hf.angleArms,
  };
}

export function applyHandlingSteeringFeelToStore(profile: GarageHandlingSteeringFeelProfile): void {
  const s = useSuspensionStore.getState();
  s.setSteeringRackRatio(profile.steeringRackRatio);
  s.setSteeringRackRatioCustom(profile.steeringRackRatioCustom);
  s.setFrontStrutBarBracing(profile.frontStrutBarBracing);
  s.setRearStrutBarBracing(profile.rearStrutBarBracing);
  s.setChassisBracing(profile.chassisBracing);
  s.setBushingsType(profile.bushingsType);
  s.setAngleArms(profile.angleArms);
}

export type SaveHandlingSteeringFeelResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

export async function saveHandlingSteeringFeelToGarageCar(
  garageCarIndex: number,
): Promise<SaveHandlingSteeringFeelResult> {
  const cars = readSavedCars();
  if (!Number.isInteger(garageCarIndex) || garageCarIndex < 0 || garageCarIndex >= cars.length) {
    return { ok: false, message: "Selectează o mașină din garaj (sidebar stânga)." };
  }

  const profile = collectHandlingSteeringFeelFromStore();
  const next = [...cars];
  next[garageCarIndex] = {
    ...next[garageCarIndex]!,
    [GARAGE_HANDLING_STEERING_FEEL_KEY]: profile,
  };
  writeSavedCars(next);

  try {
    const { pushLocalGarageToCloud } = await import("@site-garage-cloud");
    await pushLocalGarageToCloud();
  } catch (e) {
    console.warn("[handling-feel] push garaj cloud", e);
    return {
      ok: true,
      message: "Salvat în garaj (sesiune). Sync cloud indisponibil — reîncearcă din Cont.",
    };
  }

  return {
    ok: true,
    message: "Handling and steering feel salvat în profilul mașinii din garaj.",
  };
}
