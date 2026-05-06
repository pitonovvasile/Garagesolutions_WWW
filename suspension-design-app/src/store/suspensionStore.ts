import { create } from "zustand";
import {
  DEFAULT_VEHICLE_ID,
  VEHICLE_LIST,
  camberPlatesAllowed,
  getVehicle,
} from "../data/vehicles";
import {
  analyzeAxle,
  applyBumpTravel,
  cloneVehiclePoints,
  getAxlePreset,
  type VehicleAnalysis,
} from "../lib/vehicleKinematics";
import type { AxlePreset } from "../lib/vehicleTypes";
import type { VehicleDefinition } from "../lib/vehicleTypes";
import type { VehiclePointKey, VehiclePointMap } from "../lib/vehicleTypes";
import { guessVehicleTemplateId, readSavedCars } from "../lib/garageStorage";

export type WorkflowStep =
  | "design"
  | "simulate"
  | "analyze"
  | "optimize"
  | "save";

export type LibrarySection = "springs" | "dampers" | "plates" | null;

export interface VendorSpring {
  id: string;
  vendor: string;
  name: string;
  rateNmm: number;
  strokeMm: number;
}

export interface VendorDamper {
  id: string;
  vendor: string;
  name: string;
  digressive: boolean;
  strokeMm: number;
  /** Relative linear damping coefficient for MR² scaling at wheel. */
  linearDampingCoeff: number;
}

export interface VendorPlate {
  id: string;
  vendor: string;
  name: string;
  rangeDeg: number;
}

export const SPRINGS: VendorSpring[] = [
  { id: "eib-pro", vendor: "Eibach", name: "Pro-Kit", rateNmm: 42, strokeMm: 120 },
  { id: "eib-evo", vendor: "Eibach", name: "Evo II", rateNmm: 48, strokeMm: 115 },
  { id: "hr-rss", vendor: "H&R", name: "RSS+", rateNmm: 45, strokeMm: 118 },
  { id: "swift-r", vendor: "Swift", name: "Sport R", rateNmm: 50, strokeMm: 110 },
];

export const DAMPERS: VendorDamper[] = [
  { id: "bil-b6", vendor: "Bilstein", name: "B6", digressive: false, strokeMm: 125, linearDampingCoeff: 1.0 },
  { id: "bil-b16", vendor: "Bilstein", name: "B16 PSS10", digressive: true, strokeMm: 120, linearDampingCoeff: 1.15 },
  { id: "kw-v3", vendor: "KW", name: "Variant 3", digressive: true, strokeMm: 118, linearDampingCoeff: 1.12 },
  { id: "ohl-rt", vendor: "Öhlins", name: "Road & Track", digressive: true, strokeMm: 122, linearDampingCoeff: 1.22 },
];

export const PLATES: VendorPlate[] = [
  { id: "pm1", vendor: "Pedders", name: "Street Camber", rangeDeg: 1.2 },
  { id: "pm2", vendor: "Vorshlag", name: "Caster/Camber", rangeDeg: 2.0 },
  { id: "pm3", vendor: "Ground Control", name: "Race plate", rangeDeg: 2.8 },
];

export function camberPlatesCompatible(arch: VehicleDefinition["front"]["type"]): boolean {
  return camberPlatesAllowed(arch);
}

function loadAxlePoints(vehicle: VehicleDefinition, end: "front" | "rear"): VehiclePointMap {
  return cloneVehiclePoints(getAxlePreset(vehicle, end).points);
}

interface SuspensionState {
  moduleOpen: boolean;
  workflow: WorkflowStep;
  vehicleId: string;
  /** Index în `readSavedCars()` când utilizatorul leagă sesiunea de o mașină din garaj. */
  garageCarIndex: number | null;
  axle: "front" | "rear";
  points: VehiclePointMap;
  travelMm: number;
  springId: string;
  damperId: string;
  plateId: string | null;
  libraryOpen: LibrarySection;
  setModuleOpen: (v: boolean) => void;
  setWorkflow: (w: WorkflowStep) => void;
  setVehicleId: (id: string) => void;
  /** Selectare mașină din garaj (localStorage); `null` = nu e legată de o intrare salvată. */
  applyGarageSavedIndex: (index: number | null) => void;
  setAxle: (a: "front" | "rear") => void;
  setTravelMm: (mm: number) => void;
  setPoints: (p: VehiclePointMap) => void;
  updatePoint: (key: VehiclePointKey, v: { x: number; y: number }) => void;
  setSpringId: (id: string) => void;
  setDamperId: (id: string) => void;
  setPlateId: (id: string | null) => void;
  setLibraryOpen: (s: LibrarySection) => void;
  resetSessionToVehicle: (id?: string) => void;
  getVehicleDef: () => VehicleDefinition;
  getAxlePresetState: () => AxlePreset;
  getLivePoints: () => VehiclePointMap;
  getAnalysis: () => VehicleAnalysis;
  /** @deprecated alias */
  resetToPreset: (id?: string) => void;
}

export const useSuspensionStore = create<SuspensionState>((set, get) => ({
  moduleOpen: false,
  workflow: "design",
  vehicleId: DEFAULT_VEHICLE_ID,
  garageCarIndex: null,
  axle: "front",
  points: loadAxlePoints(getVehicle(DEFAULT_VEHICLE_ID), "front"),
  travelMm: 0,
  springId: SPRINGS[0].id,
  damperId: DAMPERS[0].id,
  plateId: null,
  libraryOpen: null,

  setModuleOpen: (v) => set({ moduleOpen: v }),
  setWorkflow: (w) => set({ workflow: w }),

  setVehicleId: (id) =>
    set(() => {
      const v = getVehicle(id);
      const arch = v.front.type;
      const platesOk = camberPlatesAllowed(arch);
      return {
        vehicleId: id,
        axle: "front",
        points: loadAxlePoints(v, "front"),
        travelMm: 0,
        plateId: platesOk ? (get().plateId ?? PLATES[0]?.id ?? null) : null,
      };
    }),

  applyGarageSavedIndex: (index) => {
    if (index === null) {
      set({ garageCarIndex: null });
      return;
    }
    const cars = readSavedCars();
    if (!Number.isInteger(index) || index < 0 || index >= cars.length) {
      set({ garageCarIndex: null });
      return;
    }
    const car = cars[index]!;
    const templateId = guessVehicleTemplateId(car);
    const v = getVehicle(templateId);
    const arch = v.front.type;
    const platesOk = camberPlatesAllowed(arch);
    set((s) => ({
      garageCarIndex: index,
      vehicleId: templateId,
      axle: "front",
      points: loadAxlePoints(v, "front"),
      travelMm: 0,
      plateId: platesOk ? (s.plateId ?? PLATES[0]?.id ?? null) : null,
    }));
  },

  setAxle: (a) =>
    set(() => {
      const v = getVehicle(get().vehicleId);
      const arch = (a === "front" ? v.front : v.rear).type;
      const platesOk = camberPlatesAllowed(arch);
      return {
        axle: a,
        points: loadAxlePoints(v, a),
        travelMm: 0,
        plateId: platesOk ? get().plateId : null,
      };
    }),

  setTravelMm: (mm) =>
    set({
      travelMm: Math.max(-50, Math.min(50, mm)),
    }),

  setPoints: (p) => set({ points: cloneVehiclePoints(p) }),
  updatePoint: (key, v) =>
    set((s) => ({
      points: { ...s.points, [key]: { ...v } },
    })),

  setSpringId: (id) => set({ springId: id }),
  setDamperId: (id) => set({ damperId: id }),
  setPlateId: (id) => set({ plateId: id }),
  setLibraryOpen: (section) => set({ libraryOpen: section }),

  resetSessionToVehicle: (id) =>
    set(() => {
      const vid = id ?? get().vehicleId;
      const v = getVehicle(vid);
      const arch = v.front.type;
      return {
        garageCarIndex: null,
        vehicleId: vid,
        axle: "front",
        points: loadAxlePoints(v, "front"),
        travelMm: 0,
        workflow: "design",
        plateId: camberPlatesAllowed(arch) ? PLATES[0]?.id ?? null : null,
      };
    }),

  resetToPreset: (id) => get().resetSessionToVehicle(id),

  getVehicleDef: () => getVehicle(get().vehicleId),

  getAxlePresetState: () => getAxlePreset(getVehicle(get().vehicleId), get().axle),

  getLivePoints: () => applyBumpTravel(get().points, get().travelMm),

  getAnalysis: () => {
    const s = get();
    const vehicle = getVehicle(s.vehicleId);
    const axlePreset = getAxlePreset(vehicle, s.axle);
    const base = s.points;
    const live = applyBumpTravel(base, s.travelMm);
    const spring = SPRINGS.find((x) => x.id === s.springId) ?? SPRINGS[0];
    const damper = DAMPERS.find((x) => x.id === s.damperId) ?? DAMPERS[0];
    return analyzeAxle(base, live, axlePreset, spring.rateNmm, damper.linearDampingCoeff, s.travelMm);
  },
}));

export { VEHICLE_LIST };
