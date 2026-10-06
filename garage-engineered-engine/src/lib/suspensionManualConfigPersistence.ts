/**
 * Persistă rubricile manuale (vehicul + footer tehnic) + parametrii resort/amortizor folosiți în calcule,
 * per șablon geometrie + slot garaj, în localStorage.
 */

import type { VehicleArchitectureManual } from "../data/vehicleArchitectureManual";
import type { VehicleDimensionsManual, VehicleMassManual } from "../data/vehicleDimensionsMassManual";
import type {
  VehicleFooterAeroManual,
  VehicleFooterDrivetrainManual,
  VehicleFooterTiresManual,
} from "../data/vehicleFooterTechnicalManual";
import type { StandAlignmentSnapshotPersisted } from "../data/standAlignmentForm";
import { useSuspensionAssistantStore } from "../store/suspensionAssistantStore";
import type { AntiRollBarMode, AntiRollBarStiffness } from "../data/antiRollBar";
import type { CoiloverSetupTier } from "../data/coiloverSetup";
import {
  coerceSteeringRackRatioId,
  type HandlingSteeringFeelState,
} from "../data/handlingSteeringFeel";
import { useSuspensionStore } from "../store/suspensionStore";

export const SUSPENSION_SAVED_CONFIGURATION_KEY = "garageSolutionsSuspensionSavedConfigurationV1";

export const SUSPENSION_CONFIG_SAVED_EVENT = "garage-suspension-config-saved";

export const CONFIG_VERSION = 1 as const;

export interface SavedSuspensionSessionHardware {
  springRateNmm: number;
  springStrokeMm: number;
  damperStrokeMm: number;
  damperLinearDampingCoeff: number;
  damperDigressive: boolean;
  plateRangeDeg: number | null;
  antiRollBarFrontMode?: AntiRollBarMode;
  antiRollBarRearMode?: AntiRollBarMode;
  antiRollBarFrontBrand?: string | null;
  antiRollBarRearBrand?: string | null;
  antiRollBarFrontStiffness?: AntiRollBarStiffness | null;
  antiRollBarRearStiffness?: AntiRollBarStiffness | null;
  coiloverSetupTier?: CoiloverSetupTier;
  coiloverAftermarketBrand?: string | null;
  coiloverAftermarketBrandOther?: string | null;
  coiloverAftermarketSpringBrand?: string | null;
  coiloverAftermarketSpringBrandOther?: string | null;
  coiloverAftermarketDamperBrand?: string | null;
  coiloverAftermarketDamperBrandOther?: string | null;
  handlingSteeringFeel?: HandlingSteeringFeelState;
}

export interface SavedSuspensionConfiguration {
  version: typeof CONFIG_VERSION;
  savedAt: number;
  /** Șablon geometrie activ (ex. bmw-e46). */
  vehicleTemplateId: string;
  /** Index în lista garaj sau null dacă nu e legat de garaj. */
  garageCarIndex: number | null;
  vehicleArchitectureManual: VehicleArchitectureManual;
  vehicleDimensionsManual: VehicleDimensionsManual;
  vehicleMassManual: VehicleMassManual;
  vehicleFooterDrivetrainManual: VehicleFooterDrivetrainManual;
  vehicleFooterTiresManual: VehicleFooterTiresManual;
  vehicleFooterAeroManual: VehicleFooterAeroManual;
  sessionHardware: SavedSuspensionSessionHardware;
  /** Raport geometrie stand 3D + ghidaje diagramă (opțional, v1). */
  standAlignmentSnapshot?: StandAlignmentSnapshotPersisted;
}

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function configStorageKey(vehicleTemplateId: string, garageCarIndex: number | null): string {
  return `${vehicleTemplateId}__g_${garageCarIndex ?? "none"}`;
}

function readMap(): Record<string, SavedSuspensionConfiguration> {
  if (typeof window === "undefined") return {};
  const raw = safeParse<Record<string, SavedSuspensionConfiguration>>(
    localStorage.getItem(SUSPENSION_SAVED_CONFIGURATION_KEY),
    {},
  );
  return raw && typeof raw === "object" ? raw : {};
}

function writeMap(map: Record<string, SavedSuspensionConfiguration>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SUSPENSION_SAVED_CONFIGURATION_KEY, JSON.stringify(map));
  } catch {
    /* quota */
  }
  window.dispatchEvent(new CustomEvent(SUSPENSION_CONFIG_SAVED_EVENT));
}

export function readSavedSuspensionConfiguration(
  vehicleTemplateId: string,
  garageCarIndex: number | null,
): SavedSuspensionConfiguration | null {
  const map = readMap();
  const row = map[configStorageKey(vehicleTemplateId, garageCarIndex)];
  if (!row || row.version !== CONFIG_VERSION) return null;
  return row;
}

export function writeSavedSuspensionConfiguration(config: SavedSuspensionConfiguration): void {
  const map = readMap();
  map[configStorageKey(config.vehicleTemplateId, config.garageCarIndex)] = config;
  writeMap(map);
}

/** Citește starea curentă din Zustand și construiește obiectul de salvat. */
export function collectSavedSuspensionConfiguration(): SavedSuspensionConfiguration {
  const s = useSuspensionStore.getState();
  const a = useSuspensionAssistantStore.getState();
  return {
    version: CONFIG_VERSION,
    savedAt: Date.now(),
    vehicleTemplateId: s.vehicleId,
    garageCarIndex: s.garageCarIndex,
    vehicleArchitectureManual: { ...a.vehicleArchitectureManual },
    vehicleDimensionsManual: { ...a.vehicleDimensionsManual },
    vehicleMassManual: { ...a.vehicleMassManual },
    vehicleFooterDrivetrainManual: { ...a.vehicleFooterDrivetrainManual },
    vehicleFooterTiresManual: { ...a.vehicleFooterTiresManual },
    vehicleFooterAeroManual: { ...a.vehicleFooterAeroManual },
    sessionHardware: {
      springRateNmm: s.springRateNmm,
      springStrokeMm: s.springStrokeMm,
      damperStrokeMm: s.damperStrokeMm,
      damperLinearDampingCoeff: s.damperLinearDampingCoeff,
      damperDigressive: s.damperDigressive,
      plateRangeDeg: s.plateRangeDeg,
      antiRollBarFrontMode: s.antiRollBarFrontMode,
      antiRollBarRearMode: s.antiRollBarRearMode,
      antiRollBarFrontBrand: s.antiRollBarFrontBrand,
      antiRollBarRearBrand: s.antiRollBarRearBrand,
      antiRollBarFrontStiffness: s.antiRollBarFrontStiffness,
      antiRollBarRearStiffness: s.antiRollBarRearStiffness,
      coiloverSetupTier: s.coiloverSetupTier,
      coiloverAftermarketBrand: s.coiloverAftermarketBrand,
      coiloverAftermarketBrandOther: s.coiloverAftermarketBrandOther,
      coiloverAftermarketSpringBrand: s.coiloverAftermarketSpringBrand,
      coiloverAftermarketSpringBrandOther: s.coiloverAftermarketSpringBrandOther,
      coiloverAftermarketDamperBrand: s.coiloverAftermarketDamperBrand,
      coiloverAftermarketDamperBrandOther: s.coiloverAftermarketDamperBrandOther,
      handlingSteeringFeel: { ...s.handlingSteeringFeel },
    },
    standAlignmentSnapshot: {
      form: { ...a.standAlignmentForm },
      targets: { ...a.standAlignmentTargets },
      diagramGuides: { ...a.standDiagramGuide },
      toleranceDegStr: a.standReportToleranceDegStr,
      toleranceMinStr: a.standReportToleranceMinStr,
      toleranceMmStr: a.standReportToleranceMmStr,
    },
  };
}

/** Aplică o configurație salvă în store-uri (pentru hidratare după schimbare vehicul / la pornire). */
export function applySavedSuspensionConfiguration(c: SavedSuspensionConfiguration): void {
  if (c.version !== CONFIG_VERSION) return;
  const a = useSuspensionAssistantStore.getState();
  a.setVehicleArchitectureManual({ ...c.vehicleArchitectureManual });
  a.setVehicleDimensionsManual({ ...c.vehicleDimensionsManual });
  a.setVehicleMassManual({ ...c.vehicleMassManual });
  a.setVehicleFooterDrivetrainManual({ ...c.vehicleFooterDrivetrainManual });
  a.setVehicleFooterTiresManual({ ...c.vehicleFooterTiresManual });
  a.setVehicleFooterAeroManual({ ...c.vehicleFooterAeroManual });

  const s = useSuspensionStore.getState();
  const h = c.sessionHardware;
  s.setSpringRateNmm(h.springRateNmm);
  s.setSpringStrokeMm(h.springStrokeMm);
  s.setDamperStrokeMm(h.damperStrokeMm);
  s.setDamperLinearDampingCoeff(h.damperLinearDampingCoeff);
  s.setDamperDigressive(h.damperDigressive);
  s.setPlateRangeDeg(h.plateRangeDeg);
  if (h.antiRollBarFrontMode != null) s.setAntiRollBarFrontMode(h.antiRollBarFrontMode);
  if (h.antiRollBarRearMode != null) s.setAntiRollBarRearMode(h.antiRollBarRearMode);
  if (h.antiRollBarFrontBrand !== undefined) s.setAntiRollBarFrontBrand(h.antiRollBarFrontBrand);
  if (h.antiRollBarRearBrand !== undefined) s.setAntiRollBarRearBrand(h.antiRollBarRearBrand);
  if (h.antiRollBarFrontStiffness !== undefined) {
    s.setAntiRollBarFrontStiffness(h.antiRollBarFrontStiffness);
  }
  if (h.antiRollBarRearStiffness !== undefined) {
    s.setAntiRollBarRearStiffness(h.antiRollBarRearStiffness);
  }
  if (h.coiloverSetupTier != null) s.setCoiloverSetupTier(h.coiloverSetupTier);
  if (h.coiloverAftermarketBrand !== undefined) {
    s.setCoiloverAftermarketBrand(h.coiloverAftermarketBrand);
  }
  if (h.coiloverAftermarketBrandOther !== undefined) {
    s.setCoiloverAftermarketBrandOther(h.coiloverAftermarketBrandOther);
  }
  if (h.coiloverAftermarketSpringBrand !== undefined) {
    s.setCoiloverAftermarketSpringBrand(h.coiloverAftermarketSpringBrand);
  }
  if (h.coiloverAftermarketSpringBrandOther !== undefined) {
    s.setCoiloverAftermarketSpringBrandOther(h.coiloverAftermarketSpringBrandOther);
  }
  if (h.coiloverAftermarketDamperBrand !== undefined) {
    s.setCoiloverAftermarketDamperBrand(h.coiloverAftermarketDamperBrand);
  }
  if (h.coiloverAftermarketDamperBrandOther !== undefined) {
    s.setCoiloverAftermarketDamperBrandOther(h.coiloverAftermarketDamperBrandOther);
  }
  if (h.handlingSteeringFeel) {
    const hf = h.handlingSteeringFeel;
    s.setSteeringRackRatio(coerceSteeringRackRatioId(hf.steeringRackRatio));
    s.setSteeringRackRatioCustom(hf.steeringRackRatioCustom);
    s.setFrontStrutBarBracing(hf.frontStrutBarBracing);
    s.setRearStrutBarBracing(hf.rearStrutBarBracing);
    s.setChassisBracing(hf.chassisBracing);
    s.setBushingsType(hf.bushingsType);
    s.setAngleArms(hf.angleArms);
  }

  if (c.standAlignmentSnapshot) {
    a.applyStandAlignmentSnapshot(c.standAlignmentSnapshot);
  }
}
