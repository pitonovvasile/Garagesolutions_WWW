import { create } from "zustand";
import {
  DEFAULT_VEHICLE_ID,
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
import {
  type AntiRollBarMode,
  type AntiRollBarStiffness,
  coerceAntiRollBarMode,
  defaultAntiRollBarModeForFactory,
  defaultAntiRollBarStiffnessForMode,
} from "../data/antiRollBar";
import { axleHasFactoryAntiRollBar } from "../data/antiRollBar";
import {
  COILOVER_AFTERMARKET_BRAND_CUSTOM,
  COILOVER_AFTERMARKET_BRAND_OTHER,
  DEFAULT_COILOVER_SETUP_TIER,
  type CoiloverSetupTier,
} from "../data/coiloverSetup";
import {
  coerceSteeringRackRatioId,
  DEFAULT_HANDLING_STEERING_FEEL,
  type AngleArmsId,
  type BushingsTypeId,
  type ChassisBracingId,
  type HandlingSteeringFeelState,
  type SteeringRackRatioId,
  type StrutBarBracingId,
} from "../data/handlingSteeringFeel";
import { readAntiRollBarProfileFromCar } from "../lib/garageAntiRollBarProfile";
import { readCoiloverSetupFromCar } from "../lib/garageCoiloverSetupProfile";
import { readHandlingSteeringFeelFromCar } from "../lib/garageHandlingSteeringFeelProfile";
import { getVehicleStockSuspensionDoc } from "../data/vehicleStockSuspension";

export type WorkflowStep =
  | "design"
  | "simulate"
  | "analyze"
  | "optimize"
  | "save";

/** Neutral math defaults only — replace with measured / datasheet values. */
export const DEFAULT_SPRING_RATE_NMM = 40;
export const DEFAULT_SPRING_STROKE_MM = 120;
export const DEFAULT_DAMPER_STROKE_MM = 120;
export const DEFAULT_DAMPER_LINEAR_COEFF = 1;

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function loadAxlePoints(vehicle: VehicleDefinition, end: "front" | "rear"): VehiclePointMap {
  return cloneVehiclePoints(getAxlePreset(vehicle, end).points);
}

function antiRollBarDefaultsForVehicle(vehicleId: string) {
  const doc = getVehicleStockSuspensionDoc(vehicleId);
  const fFactory = doc ? axleHasFactoryAntiRollBar(doc.front) : false;
  const rFactory = doc ? axleHasFactoryAntiRollBar(doc.rear) : false;
  const fMode = defaultAntiRollBarModeForFactory(fFactory);
  const rMode = defaultAntiRollBarModeForFactory(rFactory);
  return {
    antiRollBarFrontMode: fMode,
    antiRollBarRearMode: rMode,
    antiRollBarFrontBrand: null as string | null,
    antiRollBarRearBrand: null as string | null,
    antiRollBarFrontStiffness: doc
      ? defaultAntiRollBarStiffnessForMode(fMode, doc.front)
      : null,
    antiRollBarRearStiffness: doc
      ? defaultAntiRollBarStiffnessForMode(rMode, doc.rear)
      : null,
  };
}

export function camberPlatesCompatible(arch: VehicleDefinition["front"]["type"]): boolean {
  return camberPlatesAllowed(arch);
}

interface SuspensionState {
  moduleOpen: boolean;
  workflow: WorkflowStep;
  vehicleId: string;
  /** Index în `readSavedCars()` când utilizatorul leagă sesiunea de o mașină din garaj. */
  garageCarIndex: number | null;
  axle: "front" | "rear";
  /** Geometry points per axle — switching axle does not discard the other side. */
  pointsFront: VehiclePointMap;
  pointsRear: VehiclePointMap;
  travelMm: number;
  /**
   * Rotație suplimentară (°) pentru ghidul de camber pe referința foto E46 — „travel” rotativ în jurul pivotului.
   * Convenție: negativ = capătul superior al ghidului spre interiorul mașinii (spre axa longitudinală); pozitiv = sens opus.
   * Nu afectează modelul 2D.
   */
  camberRefGuideTravelDeg: number;
  /** Offset caster (°) față de OEM: unghi între verticală și axa pivot jos→sus — doar vizual. */
  casterRefGuideTravelDeg: number;
  /** Offset toe total (′) pe referința foto E46 — doar vizual, nu model 2D. */
  toeRefGuideTravelMin: number;
  /** Afișează travel bump în chenarele de referință (Chenar 1: siluetă). */
  refTravelVisBump: boolean;
  /** Afișează offset camber pe referințele foto (Chenar 1 clone + Chenar 2). */
  refTravelVisCamber: boolean;
  /** Afișează offset caster pe referințele foto (Chenar 2). */
  refTravelVisCaster: boolean;
  /** Afișează offset toe pe referințele foto (Chenar 2). */
  refTravelVisToe: boolean;
  /**
   * Slide activ în caruselul de referință E46 față:
   * 0 = blueprint, 1 = siluetă + clone camber, 2 = ride height, 3 = caster 3D L/R, 4 = toe plan.
   */
  e46RefCarouselSlide: number;
  /** Focus reprezentare: slide + overlay exclusiv pentru setarea aleasă. */
  focusE46RefRepresentation: (
    mode: "ride-height" | "front-camber" | "caster" | "toe",
  ) => void;
  /** Spring stiffness (N/mm) — user / datasheet, not a bundled catalog. */
  springRateNmm: number;
  springStrokeMm: number;
  damperStrokeMm: number;
  /** Relative linear damping coefficient for MR² scaling in kinematics panel. */
  damperLinearDampingCoeff: number;
  damperDigressive: boolean;
  /** null = none; positive = ±range in degrees for UI / validation hints. */
  plateRangeDeg: number | null;
  /** Camber măsurat la banc (°) — pentru coloana „Curent” și validare stock; nu vine din modelul 2D. */
  measuredFrontCamberDeg: number | null;
  measuredRearCamberDeg: number | null;
  antiRollBarFrontMode: AntiRollBarMode;
  antiRollBarRearMode: AntiRollBarMode;
  antiRollBarFrontBrand: string | null;
  antiRollBarRearBrand: string | null;
  antiRollBarFrontStiffness: AntiRollBarStiffness | null;
  antiRollBarRearStiffness: AntiRollBarStiffness | null;
  coiloverSetupTier: CoiloverSetupTier;
  coiloverAftermarketBrand: string | null;
  coiloverAftermarketBrandOther: string | null;
  coiloverAftermarketSpringBrand: string | null;
  coiloverAftermarketSpringBrandOther: string | null;
  coiloverAftermarketDamperBrand: string | null;
  coiloverAftermarketDamperBrandOther: string | null;
  handlingSteeringFeel: HandlingSteeringFeelState;
  setSteeringRackRatio: (id: SteeringRackRatioId) => void;
  setSteeringRackRatioCustom: (value: string | null) => void;
  setFrontStrutBarBracing: (id: StrutBarBracingId) => void;
  setRearStrutBarBracing: (id: StrutBarBracingId) => void;
  setChassisBracing: (id: ChassisBracingId) => void;
  setBushingsType: (id: BushingsTypeId) => void;
  setAngleArms: (id: AngleArmsId) => void;
  setCoiloverSetupTier: (tier: CoiloverSetupTier) => void;
  setCoiloverAftermarketBrand: (brand: string | null) => void;
  setCoiloverAftermarketBrandOther: (name: string | null) => void;
  setCoiloverAftermarketSpringBrand: (brand: string | null) => void;
  setCoiloverAftermarketSpringBrandOther: (name: string | null) => void;
  setCoiloverAftermarketDamperBrand: (brand: string | null) => void;
  setCoiloverAftermarketDamperBrandOther: (name: string | null) => void;
  setAntiRollBarFrontMode: (m: AntiRollBarMode) => void;
  setAntiRollBarRearMode: (m: AntiRollBarMode) => void;
  setAntiRollBarFrontBrand: (b: string | null) => void;
  setAntiRollBarRearBrand: (b: string | null) => void;
  setAntiRollBarFrontStiffness: (s: AntiRollBarStiffness | null) => void;
  setAntiRollBarRearStiffness: (s: AntiRollBarStiffness | null) => void;
  setModuleOpen: (v: boolean) => void;
  setWorkflow: (w: WorkflowStep) => void;
  setVehicleId: (id: string) => void;
  /** Selectare mașină din garaj (localStorage); `null` = nu e legată de o intrare salvată. */
  applyGarageSavedIndex: (index: number | null) => void;
  setAxle: (a: "front" | "rear") => void;
  setTravelMm: (mm: number) => void;
  setCamberRefGuideTravelDeg: (deg: number) => void;
  setCasterRefGuideTravelDeg: (deg: number) => void;
  setToeRefGuideTravelMin: (min: number) => void;
  setRefTravelVisBump: (v: boolean) => void;
  setRefTravelVisCamber: (v: boolean) => void;
  setRefTravelVisCaster: (v: boolean) => void;
  setRefTravelVisToe: (v: boolean) => void;
  setE46RefCarouselSlide: (n: number) => void;
  setPoints: (p: VehiclePointMap) => void;
  updatePoint: (key: VehiclePointKey, v: { x: number; y: number }) => void;
  setSpringRateNmm: (v: number) => void;
  setSpringStrokeMm: (v: number) => void;
  setDamperStrokeMm: (v: number) => void;
  setDamperLinearDampingCoeff: (v: number) => void;
  setDamperDigressive: (v: boolean) => void;
  setPlateRangeDeg: (v: number | null) => void;
  setMeasuredFrontCamberDeg: (v: number | null) => void;
  setMeasuredRearCamberDeg: (v: number | null) => void;
  resetSessionToVehicle: (id?: string) => void;
  /** Reset vendor + both axle geometries to a mild OEM-like baseline for comparison workflows. */
  applyOemStockBaseline: () => void;
  getVehicleDef: () => VehicleDefinition;
  getAxlePresetState: () => AxlePreset;
  getLivePoints: () => VehiclePointMap;
  getAnalysis: () => VehicleAnalysis;
  getAnalysisForAxle: (end: "front" | "rear") => VehicleAnalysis;
  /** @deprecated alias */
  resetToPreset: (id?: string) => void;
}

/** Număr slide-uri carusel referință E46 față (indici 0 … MAX inclusiv). */
export const E46_REF_CAROUSEL_SLIDE_MAX = 4;

const v0 = getVehicle(DEFAULT_VEHICLE_ID);
const arb0 = antiRollBarDefaultsForVehicle(DEFAULT_VEHICLE_ID);

export const useSuspensionStore = create<SuspensionState>((set, get) => ({
  moduleOpen: false,
  workflow: "design",
  vehicleId: DEFAULT_VEHICLE_ID,
  garageCarIndex: null,
  axle: "front",
  pointsFront: loadAxlePoints(v0, "front"),
  pointsRear: loadAxlePoints(v0, "rear"),
  travelMm: 0,
  camberRefGuideTravelDeg: 0,
  casterRefGuideTravelDeg: 0,
  toeRefGuideTravelMin: 0,
  refTravelVisBump: false,
  refTravelVisCamber: false,
  refTravelVisCaster: false,
  refTravelVisToe: false,
  e46RefCarouselSlide: 0,
  springRateNmm: DEFAULT_SPRING_RATE_NMM,
  springStrokeMm: DEFAULT_SPRING_STROKE_MM,
  damperStrokeMm: DEFAULT_DAMPER_STROKE_MM,
  damperLinearDampingCoeff: DEFAULT_DAMPER_LINEAR_COEFF,
  damperDigressive: false,
  plateRangeDeg: null,
  measuredFrontCamberDeg: null,
  measuredRearCamberDeg: null,
  antiRollBarFrontMode: arb0.antiRollBarFrontMode,
  antiRollBarRearMode: arb0.antiRollBarRearMode,
  antiRollBarFrontBrand: arb0.antiRollBarFrontBrand,
  antiRollBarRearBrand: arb0.antiRollBarRearBrand,
  antiRollBarFrontStiffness: arb0.antiRollBarFrontStiffness,
  antiRollBarRearStiffness: arb0.antiRollBarRearStiffness,
  coiloverSetupTier: DEFAULT_COILOVER_SETUP_TIER,
  coiloverAftermarketBrand: null,
  coiloverAftermarketBrandOther: null,
  coiloverAftermarketSpringBrand: null,
  coiloverAftermarketSpringBrandOther: null,
  coiloverAftermarketDamperBrand: null,
  coiloverAftermarketDamperBrandOther: null,
  handlingSteeringFeel: { ...DEFAULT_HANDLING_STEERING_FEEL },

  setModuleOpen: (v) => set({ moduleOpen: v }),
  setWorkflow: (w) => set({ workflow: w }),

  setVehicleId: (id) =>
    set(() => {
      let resolvedId = id;
      const idx = get().garageCarIndex;
      if (idx !== null) {
        const cars = readSavedCars();
        if (Number.isInteger(idx) && idx >= 0 && idx < cars.length) {
          resolvedId = guessVehicleTemplateId(cars[idx]!);
        }
      }
      const v = getVehicle(resolvedId);
      const arch = v.front.type;
      const platesOk = camberPlatesAllowed(arch);
      return {
        vehicleId: resolvedId,
        axle: "front",
        pointsFront: loadAxlePoints(v, "front"),
        pointsRear: loadAxlePoints(v, "rear"),
        travelMm: 0,
        camberRefGuideTravelDeg: 0,
        casterRefGuideTravelDeg: 0,
        toeRefGuideTravelMin: 0,
        plateRangeDeg: platesOk ? get().plateRangeDeg : null,
        measuredFrontCamberDeg: null,
        measuredRearCamberDeg: null,
        ...antiRollBarDefaultsForVehicle(resolvedId),
        coiloverSetupTier: DEFAULT_COILOVER_SETUP_TIER,
        coiloverAftermarketBrand: null,
        coiloverAftermarketBrandOther: null,
        coiloverAftermarketSpringBrand: null,
        coiloverAftermarketSpringBrandOther: null,
        coiloverAftermarketDamperBrand: null,
        coiloverAftermarketDamperBrandOther: null,
        handlingSteeringFeel: { ...DEFAULT_HANDLING_STEERING_FEEL },
      };
    }),

  applyGarageSavedIndex: (index) => {
    if (index === null) {
      set({ garageCarIndex: null, measuredFrontCamberDeg: null, measuredRearCamberDeg: null });
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
    const arbDefaults = antiRollBarDefaultsForVehicle(templateId);
    const arbSaved = readAntiRollBarProfileFromCar(car);
    const hfSaved = readHandlingSteeringFeelFromCar(car);
    const coilSaved = readCoiloverSetupFromCar(car);
    set((s) => ({
      garageCarIndex: index,
      vehicleId: templateId,
      axle: "front",
      pointsFront: loadAxlePoints(v, "front"),
      pointsRear: loadAxlePoints(v, "rear"),
      travelMm: 0,
      camberRefGuideTravelDeg: 0,
      casterRefGuideTravelDeg: 0,
      toeRefGuideTravelMin: 0,
      plateRangeDeg: platesOk ? s.plateRangeDeg : null,
      antiRollBarFrontMode: arbSaved?.front.mode ?? arbDefaults.antiRollBarFrontMode,
      antiRollBarRearMode: arbSaved?.rear.mode ?? arbDefaults.antiRollBarRearMode,
      antiRollBarFrontBrand: arbSaved?.front.brand ?? arbDefaults.antiRollBarFrontBrand,
      antiRollBarRearBrand: arbSaved?.rear.brand ?? arbDefaults.antiRollBarRearBrand,
      antiRollBarFrontStiffness: arbSaved?.front.stiffness ?? arbDefaults.antiRollBarFrontStiffness,
      antiRollBarRearStiffness: arbSaved?.rear.stiffness ?? arbDefaults.antiRollBarRearStiffness,
      coiloverSetupTier: coilSaved?.coiloverSetupTier ?? DEFAULT_COILOVER_SETUP_TIER,
      coiloverAftermarketBrand: coilSaved?.coiloverAftermarketBrand ?? null,
      coiloverAftermarketBrandOther: coilSaved?.coiloverAftermarketBrandOther ?? null,
      coiloverAftermarketSpringBrand: coilSaved?.coiloverAftermarketSpringBrand ?? null,
      coiloverAftermarketSpringBrandOther: coilSaved?.coiloverAftermarketSpringBrandOther ?? null,
      coiloverAftermarketDamperBrand: coilSaved?.coiloverAftermarketDamperBrand ?? null,
      coiloverAftermarketDamperBrandOther: coilSaved?.coiloverAftermarketDamperBrandOther ?? null,
      measuredFrontCamberDeg: coilSaved?.measuredFrontCamberDeg ?? null,
      measuredRearCamberDeg: coilSaved?.measuredRearCamberDeg ?? null,
      handlingSteeringFeel: hfSaved
        ? {
            steeringRackRatio: hfSaved.steeringRackRatio,
            steeringRackRatioCustom: hfSaved.steeringRackRatioCustom,
            frontStrutBarBracing: hfSaved.frontStrutBarBracing,
            rearStrutBarBracing: hfSaved.rearStrutBarBracing,
            chassisBracing: hfSaved.chassisBracing,
            bushingsType: hfSaved.bushingsType,
            angleArms: hfSaved.angleArms,
          }
        : { ...DEFAULT_HANDLING_STEERING_FEEL },
    }));
  },

  setAxle: (a) =>
    set(() => {
      const v = getVehicle(get().vehicleId);
      const arch = (a === "front" ? v.front : v.rear).type;
      const platesOk = camberPlatesAllowed(arch);
      return {
        axle: a,
        travelMm: 0,
        camberRefGuideTravelDeg: 0,
        casterRefGuideTravelDeg: 0,
        toeRefGuideTravelMin: 0,
        plateRangeDeg: platesOk ? get().plateRangeDeg : null,
      };
    }),

  setTravelMm: (mm) =>
    set({
      travelMm: Math.max(-50, Math.min(50, mm)),
    }),

  setCamberRefGuideTravelDeg: (deg) =>
    set({
      camberRefGuideTravelDeg: clamp(deg, -25, 25),
    }),

  setCasterRefGuideTravelDeg: (deg) =>
    set({
      casterRefGuideTravelDeg: clamp(deg, -5, 5),
    }),

  setToeRefGuideTravelMin: (min) =>
    set({
      toeRefGuideTravelMin: clamp(min, -20, 20),
    }),

  setRefTravelVisBump: (v) => set({ refTravelVisBump: v }),
  setRefTravelVisCamber: (v) => set({ refTravelVisCamber: v }),
  setRefTravelVisCaster: (v) => set({ refTravelVisCaster: v }),
  setRefTravelVisToe: (v) => set({ refTravelVisToe: v }),
  setE46RefCarouselSlide: (n) =>
    set({
      e46RefCarouselSlide: Math.max(0, Math.min(E46_REF_CAROUSEL_SLIDE_MAX, Math.round(n))),
    }),

  focusE46RefRepresentation: (mode) => {
    const slideByMode = {
      "ride-height": 2,
      "front-camber": 1,
      caster: 3,
      toe: 4,
    } as const;
    const visByMode = {
      "ride-height": {
        refTravelVisBump: true,
        refTravelVisCamber: false,
        refTravelVisCaster: false,
        refTravelVisToe: false,
      },
      "front-camber": {
        refTravelVisBump: false,
        refTravelVisCamber: true,
        refTravelVisCaster: false,
        refTravelVisToe: false,
      },
      caster: {
        refTravelVisBump: false,
        refTravelVisCamber: false,
        refTravelVisCaster: true,
        refTravelVisToe: false,
      },
      toe: {
        refTravelVisBump: false,
        refTravelVisCamber: false,
        refTravelVisCaster: false,
        refTravelVisToe: true,
      },
    } as const;
    set({
      e46RefCarouselSlide: slideByMode[mode],
      ...visByMode[mode],
    });
  },

  setPoints: (p) =>
    set((s) =>
      s.axle === "front"
        ? { pointsFront: cloneVehiclePoints(p) }
        : { pointsRear: cloneVehiclePoints(p) },
    ),
  updatePoint: (key, v) =>
    set((s) =>
      s.axle === "front"
        ? { pointsFront: { ...s.pointsFront, [key]: { ...v } } }
        : { pointsRear: { ...s.pointsRear, [key]: { ...v } } },
    ),

  setSpringRateNmm: (v) => set({ springRateNmm: clamp(v, 1, 220) }),
  setSpringStrokeMm: (v) => set({ springStrokeMm: clamp(v, 10, 320) }),
  setDamperStrokeMm: (v) => set({ damperStrokeMm: clamp(v, 10, 320) }),
  setDamperLinearDampingCoeff: (v) => set({ damperLinearDampingCoeff: clamp(v, 0.05, 3) }),
  setDamperDigressive: (v) => set({ damperDigressive: v }),
  setPlateRangeDeg: (v) =>
    set({
      plateRangeDeg: v == null ? null : clamp(v, 0.05, 6),
    }),

  setMeasuredFrontCamberDeg: (v) =>
    set({
      measuredFrontCamberDeg:
        v == null || Number.isNaN(v) ? null : clamp(v, -15, 2),
    }),
  setMeasuredRearCamberDeg: (v) =>
    set({
      measuredRearCamberDeg:
        v == null || Number.isNaN(v) ? null : clamp(v, -15, 2),
    }),

  setAntiRollBarFrontMode: (m) =>
    set((s) => {
      const doc = getVehicleStockSuspensionDoc(s.vehicleId);
      const bundle = doc?.front ?? null;
      const factory = bundle ? axleHasFactoryAntiRollBar(bundle) : false;
      const mode = coerceAntiRollBarMode(m, factory);
      const wasTuning = s.antiRollBarFrontMode === "tuning";
      return {
        antiRollBarFrontMode: mode,
        antiRollBarFrontBrand:
          mode === "tuning" ? (wasTuning ? s.antiRollBarFrontBrand : null) : null,
        antiRollBarFrontStiffness:
          mode === "stock"
            ? defaultAntiRollBarStiffnessForMode(mode, bundle)
            : mode === "tuning" && wasTuning && s.antiRollBarFrontBrand
              ? s.antiRollBarFrontStiffness
              : null,
      };
    }),
  setAntiRollBarRearMode: (m) =>
    set((s) => {
      const doc = getVehicleStockSuspensionDoc(s.vehicleId);
      const bundle = doc?.rear ?? null;
      const factory = bundle ? axleHasFactoryAntiRollBar(bundle) : false;
      const mode = coerceAntiRollBarMode(m, factory);
      const wasTuning = s.antiRollBarRearMode === "tuning";
      return {
        antiRollBarRearMode: mode,
        antiRollBarRearBrand:
          mode === "tuning" ? (wasTuning ? s.antiRollBarRearBrand : null) : null,
        antiRollBarRearStiffness:
          mode === "stock"
            ? defaultAntiRollBarStiffnessForMode(mode, bundle)
            : mode === "tuning" && wasTuning && s.antiRollBarRearBrand
              ? s.antiRollBarRearStiffness
              : null,
      };
    }),
  setAntiRollBarFrontBrand: (b) =>
    set((s) => ({
      antiRollBarFrontBrand: b,
      antiRollBarFrontStiffness:
        s.antiRollBarFrontMode === "tuning" && !b ? null : s.antiRollBarFrontStiffness,
    })),
  setAntiRollBarRearBrand: (b) =>
    set((s) => ({
      antiRollBarRearBrand: b,
      antiRollBarRearStiffness:
        s.antiRollBarRearMode === "tuning" && !b ? null : s.antiRollBarRearStiffness,
    })),
  setAntiRollBarFrontStiffness: (stiffness) => set({ antiRollBarFrontStiffness: stiffness }),
  setAntiRollBarRearStiffness: (stiffness) => set({ antiRollBarRearStiffness: stiffness }),
  setCoiloverSetupTier: (tier) =>
    set(() => ({
      coiloverSetupTier: tier,
      ...(tier !== "aftermarket"
        ? {
            coiloverAftermarketBrand: null,
            coiloverAftermarketBrandOther: null,
            coiloverAftermarketSpringBrand: null,
            coiloverAftermarketSpringBrandOther: null,
            coiloverAftermarketDamperBrand: null,
            coiloverAftermarketDamperBrandOther: null,
          }
        : {}),
    })),
  setCoiloverAftermarketBrand: (brand) =>
    set((s) => ({
      coiloverAftermarketBrand: brand,
      coiloverAftermarketBrandOther:
        brand === COILOVER_AFTERMARKET_BRAND_OTHER ? s.coiloverAftermarketBrandOther : null,
      ...(brand === COILOVER_AFTERMARKET_BRAND_CUSTOM
        ? {}
        : {
            coiloverAftermarketSpringBrand: null,
            coiloverAftermarketSpringBrandOther: null,
            coiloverAftermarketDamperBrand: null,
            coiloverAftermarketDamperBrandOther: null,
          }),
    })),
  setCoiloverAftermarketBrandOther: (name) => set({ coiloverAftermarketBrandOther: name }),
  setCoiloverAftermarketSpringBrand: (brand) =>
    set((s) => ({
      coiloverAftermarketSpringBrand: brand,
      coiloverAftermarketSpringBrandOther:
        brand === COILOVER_AFTERMARKET_BRAND_OTHER ? s.coiloverAftermarketSpringBrandOther : null,
    })),
  setCoiloverAftermarketSpringBrandOther: (name) =>
    set({ coiloverAftermarketSpringBrandOther: name }),
  setCoiloverAftermarketDamperBrand: (brand) =>
    set((s) => ({
      coiloverAftermarketDamperBrand: brand,
      coiloverAftermarketDamperBrandOther:
        brand === COILOVER_AFTERMARKET_BRAND_OTHER ? s.coiloverAftermarketDamperBrandOther : null,
    })),
  setCoiloverAftermarketDamperBrandOther: (name) =>
    set({ coiloverAftermarketDamperBrandOther: name }),

  setSteeringRackRatio: (id) =>
    set((s) => {
      const coerced = coerceSteeringRackRatioId(id);
      return {
        handlingSteeringFeel: {
          ...s.handlingSteeringFeel,
          steeringRackRatio: coerced,
          steeringRackRatioCustom:
            coerced === "custom" ? s.handlingSteeringFeel.steeringRackRatioCustom : null,
        },
      };
    }),
  setSteeringRackRatioCustom: (value) =>
    set((s) => ({
      handlingSteeringFeel: {
        ...s.handlingSteeringFeel,
        steeringRackRatioCustom: value,
        steeringRackRatio: "custom",
      },
    })),
  setFrontStrutBarBracing: (id) =>
    set((s) => ({
      handlingSteeringFeel: { ...s.handlingSteeringFeel, frontStrutBarBracing: id },
    })),
  setRearStrutBarBracing: (id) =>
    set((s) => ({
      handlingSteeringFeel: { ...s.handlingSteeringFeel, rearStrutBarBracing: id },
    })),
  setChassisBracing: (id) =>
    set((s) => ({
      handlingSteeringFeel: { ...s.handlingSteeringFeel, chassisBracing: id },
    })),
  setBushingsType: (id) =>
    set((s) => ({
      handlingSteeringFeel: { ...s.handlingSteeringFeel, bushingsType: id },
    })),
  setAngleArms: (id) =>
    set((s) => ({
      handlingSteeringFeel: { ...s.handlingSteeringFeel, angleArms: id },
    })),

  resetSessionToVehicle: (id) =>
    set(() => {
      const vid = id ?? get().vehicleId;
      const v = getVehicle(vid);
      const arch = v.front.type;
      return {
        garageCarIndex: null,
        vehicleId: vid,
        axle: "front",
        pointsFront: loadAxlePoints(v, "front"),
        pointsRear: loadAxlePoints(v, "rear"),
        travelMm: 0,
        camberRefGuideTravelDeg: 0,
        casterRefGuideTravelDeg: 0,
        toeRefGuideTravelMin: 0,
        workflow: "design",
        plateRangeDeg: camberPlatesAllowed(arch) ? get().plateRangeDeg : null,
        measuredFrontCamberDeg: null,
        measuredRearCamberDeg: null,
        ...antiRollBarDefaultsForVehicle(vid),
        coiloverSetupTier: DEFAULT_COILOVER_SETUP_TIER,
        coiloverAftermarketBrand: null,
        coiloverAftermarketBrandOther: null,
        coiloverAftermarketSpringBrand: null,
        coiloverAftermarketSpringBrandOther: null,
        coiloverAftermarketDamperBrand: null,
        coiloverAftermarketDamperBrandOther: null,
        handlingSteeringFeel: { ...DEFAULT_HANDLING_STEERING_FEEL },
      };
    }),

  applyOemStockBaseline: () =>
    set(() => {
      const vid = get().vehicleId;
      const v = getVehicle(vid);
      return {
        pointsFront: loadAxlePoints(v, "front"),
        pointsRear: loadAxlePoints(v, "rear"),
        travelMm: 0,
        camberRefGuideTravelDeg: 0,
        casterRefGuideTravelDeg: 0,
        toeRefGuideTravelMin: 0,
        axle: "front",
        plateRangeDeg: null,
        measuredFrontCamberDeg: null,
        measuredRearCamberDeg: null,
        ...antiRollBarDefaultsForVehicle(vid),
        coiloverSetupTier: DEFAULT_COILOVER_SETUP_TIER,
        coiloverAftermarketBrand: null,
        coiloverAftermarketBrandOther: null,
        coiloverAftermarketSpringBrand: null,
        coiloverAftermarketSpringBrandOther: null,
        coiloverAftermarketDamperBrand: null,
        coiloverAftermarketDamperBrandOther: null,
        handlingSteeringFeel: { ...DEFAULT_HANDLING_STEERING_FEEL },
      };
    }),

  resetToPreset: (id) => get().resetSessionToVehicle(id),

  getVehicleDef: () => getVehicle(get().vehicleId),

  getAxlePresetState: () => getAxlePreset(getVehicle(get().vehicleId), get().axle),

  getLivePoints: () => {
    const s = get();
    const base = s.axle === "front" ? s.pointsFront : s.pointsRear;
    return applyBumpTravel(base, s.travelMm);
  },

  getAnalysisForAxle: (end) => {
    const s = get();
    const vehicle = getVehicle(s.vehicleId);
    const axlePreset = getAxlePreset(vehicle, end);
    const base = end === "front" ? s.pointsFront : s.pointsRear;
    const live = applyBumpTravel(base, s.travelMm);
    return analyzeAxle(base, live, axlePreset, s.springRateNmm, s.damperLinearDampingCoeff, s.travelMm);
  },

  getAnalysis: () => get().getAnalysisForAxle(get().axle),
}));
