import { create } from "zustand";
import type { SuspensionGoalId } from "../data/suspensionCatalog";
import {
  DEFAULT_VEHICLE_ARCHITECTURE_MANUAL,
  type VehicleArchitectureManual,
} from "../data/vehicleArchitectureManual";
import {
  DEFAULT_VEHICLE_DIMENSIONS_MANUAL,
  DEFAULT_VEHICLE_MASS_MANUAL,
  type VehicleDimensionsManual,
  type VehicleMassManual,
} from "../data/vehicleDimensionsMassManual";
import {
  DEFAULT_VEHICLE_FOOTER_AERO_MANUAL,
  DEFAULT_VEHICLE_FOOTER_DRIVETRAIN_MANUAL,
  DEFAULT_VEHICLE_FOOTER_TIRES_MANUAL,
  type VehicleFooterAeroManual,
  type VehicleFooterDrivetrainManual,
  type VehicleFooterTiresManual,
} from "../data/vehicleFooterTechnicalManual";
import { getPresetById, presetsForGoal, PRESET_TOUR_SEQUENCE_IDS } from "../data/vehicleGarageProfiles";
import {
  createEmptyStandAlignmentForm,
  DEFAULT_STAND_DIAGRAM_GUIDE,
  mergeStandAlignmentForm,
  type StandAlignmentForm,
  type StandAlignmentSnapshotPersisted,
  type StandDiagramGuideState,
} from "../data/standAlignmentForm";
import type { LeftStripModuleId } from "../lib/leftStripModule";
import { useSuspensionStore } from "./suspensionStore";

export type AssistantStepId = "car" | "goal" | "mode" | "parts" | "validate" | "save";

interface SuspensionAssistantState {
  step: AssistantStepId;
  /** Fereastră modală „Vehicul” (strip stânga): aceleași tabele ca sidebar + detalii garaj. */
  vehicleSubpageOpen: boolean;
  /** Fereastră „Anvelope / Tires & wheels” (aceleași câmpuri ca footer). */
  tiresWheelsModalOpen: boolean;
  /** Fereastră „Drivetrain” (aceleași câmpuri ca footer). */
  drivetrainModalOpen: boolean;
  /** Fereastră „Suspensie” — OEM setup + hardware ca în panoul drept. */
  suspensionWorkshopModalOpen: boolean;
  /** Raport geometrie / date stand 3D (introducere manuală + diagramă 2D). */
  standAlignmentModalOpen: boolean;
  /** Ultimul modul selectat din pictogramele sub „Vehicul” — pentru scroll + evidențiere în UI. */
  leftStripActiveModule: LeftStripModuleId | null;
  /** Rubrică anti-roll bar activă în panoul OEM — afișează referința în viewport. */
  antiRollBarRubrikActive: boolean;
  /** Rubrică Handling and steering feel — afișează câmpurile de mai jos. */
  handlingSteeringFeelRubrikActive: boolean;
  /** Rubrică Coil over setup — tier, resort/amortizor, aliniere, sub-rubrici. */
  coiloverSetupRubrikActive: boolean;
  goal: SuspensionGoalId | null;
  pathMode: "preset" | "custom";
  activePresetId: string | null;
  compareOpen: boolean;
  /** OEM baseline mode (mild spring/damper + template geometry both axles). */
  stockSetupMode: boolean;
  /** Show per-metric provenance: formula, inputs, confidence (engineering traceability). */
  engineeringDebugMode: boolean;
  /** Arhitectură / dimensiuni / mase — inserare manuală (panou în sidebar când Vehicul e deschis). */
  vehicleArchitectureManual: VehicleArchitectureManual;
  vehicleDimensionsManual: VehicleDimensionsManual;
  vehicleMassManual: VehicleMassManual;
  vehicleFooterDrivetrainManual: VehicleFooterDrivetrainManual;
  vehicleFooterTiresManual: VehicleFooterTiresManual;
  vehicleFooterAeroManual: VehicleFooterAeroManual;
  /** Raport geometrie stand (form + ținte + toleranțe câmp + ghidaje diagramă). */
  standAlignmentForm: StandAlignmentForm;
  standAlignmentTargets: StandAlignmentForm;
  standDiagramGuide: StandDiagramGuideState;
  standReportToleranceDegStr: string;
  standReportToleranceMinStr: string;
  standReportToleranceMmStr: string;
  setStep: (s: AssistantStepId) => void;
  setVehicleSubpageOpen: (v: boolean) => void;
  setTiresWheelsModalOpen: (v: boolean) => void;
  setDrivetrainModalOpen: (v: boolean) => void;
  setSuspensionWorkshopModalOpen: (v: boolean) => void;
  setStandAlignmentModalOpen: (v: boolean) => void;
  setLeftStripActiveModule: (id: LeftStripModuleId | null) => void;
  setAntiRollBarRubrikActive: (v: boolean) => void;
  setHandlingSteeringFeelRubrikActive: (v: boolean) => void;
  setCoiloverSetupRubrikActive: (v: boolean) => void;
  setVehicleArchitectureManual: (p: Partial<VehicleArchitectureManual>) => void;
  setVehicleDimensionsManual: (p: Partial<VehicleDimensionsManual>) => void;
  setVehicleMassManual: (p: Partial<VehicleMassManual>) => void;
  setVehicleFooterDrivetrainManual: (p: Partial<VehicleFooterDrivetrainManual>) => void;
  setVehicleFooterTiresManual: (p: Partial<VehicleFooterTiresManual>) => void;
  setVehicleFooterAeroManual: (p: Partial<VehicleFooterAeroManual>) => void;
  setGoal: (g: SuspensionGoalId | null) => void;
  setPathMode: (m: "preset" | "custom") => void;
  setActivePresetId: (id: string | null) => void;
  applyPresetToSimulation: (presetId: string) => void;
  /** Index în `PRESET_TOUR_SEQUENCE_IDS` pentru următorul clic „Pas tur”. */
  presetTourCursor: number;
  applyNextPresetInTour: () => void;
  resetPresetTour: () => void;
  setCompareOpen: (v: boolean) => void;
  setStockSetupMode: (v: boolean) => void;
  setEngineeringDebugMode: (v: boolean) => void;
  applyOemStockBaselineSession: () => void;
  patchStandAlignmentForm: (p: Partial<StandAlignmentForm>) => void;
  patchStandAlignmentTargets: (p: Partial<StandAlignmentForm>) => void;
  setStandDiagramGuide: (p: Partial<StandDiagramGuideState>) => void;
  patchStandReportTolerances: (p: Partial<{ deg: string; min: string; mm: string }>) => void;
  resetStandAlignmentReport: () => void;
  applyStandAlignmentSnapshot: (snap: StandAlignmentSnapshotPersisted) => void;
  patchStandFormCorner: (
    side: "frontLeft" | "frontRight" | "rearLeft" | "rearRight",
    cornerPatch: Partial<StandAlignmentForm[typeof side]>,
  ) => void;
  patchStandTargetsCorner: (
    side: "frontLeft" | "frontRight" | "rearLeft" | "rearRight",
    cornerPatch: Partial<StandAlignmentForm[typeof side]>,
  ) => void;
}

export const useSuspensionAssistantStore = create<SuspensionAssistantState>((set, get) => ({
  step: "car",
  vehicleSubpageOpen: false,
  tiresWheelsModalOpen: false,
  drivetrainModalOpen: false,
  suspensionWorkshopModalOpen: false,
  standAlignmentModalOpen: false,
  leftStripActiveModule: null,
  antiRollBarRubrikActive: false,
  handlingSteeringFeelRubrikActive: false,
  coiloverSetupRubrikActive: false,
  goal: "balanced",
  pathMode: "preset",
  activePresetId: "balanced-all",
  compareOpen: false,
  stockSetupMode: false,
  engineeringDebugMode: false,
  vehicleArchitectureManual: { ...DEFAULT_VEHICLE_ARCHITECTURE_MANUAL },
  vehicleDimensionsManual: { ...DEFAULT_VEHICLE_DIMENSIONS_MANUAL },
  vehicleMassManual: { ...DEFAULT_VEHICLE_MASS_MANUAL },
  vehicleFooterDrivetrainManual: { ...DEFAULT_VEHICLE_FOOTER_DRIVETRAIN_MANUAL },
  vehicleFooterTiresManual: { ...DEFAULT_VEHICLE_FOOTER_TIRES_MANUAL },
  vehicleFooterAeroManual: { ...DEFAULT_VEHICLE_FOOTER_AERO_MANUAL },
  standAlignmentForm: createEmptyStandAlignmentForm(),
  standAlignmentTargets: createEmptyStandAlignmentForm(),
  standDiagramGuide: { ...DEFAULT_STAND_DIAGRAM_GUIDE },
  standReportToleranceDegStr: "0.25",
  standReportToleranceMinStr: "5",
  standReportToleranceMmStr: "2",
  presetTourCursor: 0,

  setStep: (s) =>
    set({
      step: s,
      vehicleSubpageOpen: false,
      tiresWheelsModalOpen: false,
      drivetrainModalOpen: false,
      suspensionWorkshopModalOpen: false,
      standAlignmentModalOpen: false,
      leftStripActiveModule: null,
    }),
  setVehicleSubpageOpen: (v) => {
    if (v) {
      set({
        vehicleSubpageOpen: true,
        tiresWheelsModalOpen: false,
        drivetrainModalOpen: false,
        suspensionWorkshopModalOpen: false,
        standAlignmentModalOpen: false,
        leftStripActiveModule: null,
      });
    } else {
      set({ vehicleSubpageOpen: false });
    }
  },
  setTiresWheelsModalOpen: (v) => {
    if (v) {
      set({
        tiresWheelsModalOpen: true,
        vehicleSubpageOpen: false,
        drivetrainModalOpen: false,
        suspensionWorkshopModalOpen: false,
        standAlignmentModalOpen: false,
        leftStripActiveModule: null,
      });
    } else {
      set({ tiresWheelsModalOpen: false });
    }
  },
  setDrivetrainModalOpen: (v) => {
    if (v) {
      set({
        drivetrainModalOpen: true,
        vehicleSubpageOpen: false,
        tiresWheelsModalOpen: false,
        suspensionWorkshopModalOpen: false,
        standAlignmentModalOpen: false,
        leftStripActiveModule: null,
      });
    } else {
      set({ drivetrainModalOpen: false });
    }
  },
  setSuspensionWorkshopModalOpen: (v) => {
    if (v) {
      set({
        suspensionWorkshopModalOpen: true,
        vehicleSubpageOpen: false,
        tiresWheelsModalOpen: false,
        drivetrainModalOpen: false,
        standAlignmentModalOpen: false,
        leftStripActiveModule: null,
      });
    } else {
      set({ suspensionWorkshopModalOpen: false });
    }
  },
  setStandAlignmentModalOpen: (v) => {
    if (v) {
      set({
        standAlignmentModalOpen: true,
        vehicleSubpageOpen: false,
        tiresWheelsModalOpen: false,
        drivetrainModalOpen: false,
        suspensionWorkshopModalOpen: false,
        leftStripActiveModule: null,
      });
    } else {
      set({ standAlignmentModalOpen: false });
    }
  },
  setLeftStripActiveModule: (id) =>
    set({
      leftStripActiveModule: id,
      vehicleSubpageOpen: false,
      tiresWheelsModalOpen: false,
      drivetrainModalOpen: false,
      suspensionWorkshopModalOpen: false,
      standAlignmentModalOpen: false,
    }),
  setAntiRollBarRubrikActive: (v) => set({ antiRollBarRubrikActive: v }),
  setHandlingSteeringFeelRubrikActive: (v) => set({ handlingSteeringFeelRubrikActive: v }),
  setCoiloverSetupRubrikActive: (v) => set({ coiloverSetupRubrikActive: v }),
  setVehicleArchitectureManual: (p) =>
    set((state) => ({
      vehicleArchitectureManual: { ...state.vehicleArchitectureManual, ...p },
    })),
  setVehicleDimensionsManual: (p) =>
    set((state) => ({
      vehicleDimensionsManual: { ...state.vehicleDimensionsManual, ...p },
    })),
  setVehicleMassManual: (p) =>
    set((state) => ({
      vehicleMassManual: { ...state.vehicleMassManual, ...p },
    })),
  setVehicleFooterDrivetrainManual: (p) =>
    set((state) => ({
      vehicleFooterDrivetrainManual: { ...state.vehicleFooterDrivetrainManual, ...p },
    })),
  setVehicleFooterTiresManual: (p) =>
    set((state) => ({
      vehicleFooterTiresManual: { ...state.vehicleFooterTiresManual, ...p },
    })),
  setVehicleFooterAeroManual: (p) =>
    set((state) => ({
      vehicleFooterAeroManual: { ...state.vehicleFooterAeroManual, ...p },
    })),
  setGoal: (g) =>
    set((state) => {
      let activePresetId = state.activePresetId;
      if (g) {
        const list = presetsForGoal(g);
        if (list.length && !list.some((p) => p.id === activePresetId)) {
          activePresetId = list[0]!.id;
        }
      }
      return { goal: g, activePresetId };
    }),
  setPathMode: (m) => set({ pathMode: m }),
  setActivePresetId: (id) => set({ activePresetId: id }),

  applyPresetToSimulation: (presetId) => {
    const bundle = getPresetById(presetId);
    if (!bundle) return;
    set({
      activePresetId: presetId,
      goal: bundle.goal,
      stockSetupMode: false,
    });
  },

  applyNextPresetInTour: () => {
    const seq = PRESET_TOUR_SEQUENCE_IDS;
    const i = get().presetTourCursor % seq.length;
    const id = seq[i]!;
    const bundle = getPresetById(id);
    if (!bundle) return;
    set({
      activePresetId: id,
      goal: bundle.goal,
      stockSetupMode: false,
      pathMode: "preset",
      presetTourCursor: (i + 1) % seq.length,
    });
  },

  resetPresetTour: () => set({ presetTourCursor: 0 }),

  setCompareOpen: (v) => set({ compareOpen: v }),

  setStockSetupMode: (v) => set({ stockSetupMode: v }),

  setEngineeringDebugMode: (v) => set({ engineeringDebugMode: v }),

  applyOemStockBaselineSession: () => {
    useSuspensionStore.getState().applyOemStockBaseline();
    set({ stockSetupMode: true, pathMode: "preset" });
  },

  patchStandAlignmentForm: (p) =>
    set((state) => ({
      standAlignmentForm: mergeStandAlignmentForm(state.standAlignmentForm, p),
    })),
  patchStandAlignmentTargets: (p) =>
    set((state) => ({
      standAlignmentTargets: mergeStandAlignmentForm(state.standAlignmentTargets, p),
    })),
  setStandDiagramGuide: (p) =>
    set((state) => ({
      standDiagramGuide: { ...state.standDiagramGuide, ...p },
    })),
  patchStandReportTolerances: (p) =>
    set((state) => ({
      standReportToleranceDegStr: p.deg ?? state.standReportToleranceDegStr,
      standReportToleranceMinStr: p.min ?? state.standReportToleranceMinStr,
      standReportToleranceMmStr: p.mm ?? state.standReportToleranceMmStr,
    })),
  resetStandAlignmentReport: () =>
    set({
      standAlignmentForm: createEmptyStandAlignmentForm(),
      standAlignmentTargets: createEmptyStandAlignmentForm(),
      standDiagramGuide: { ...DEFAULT_STAND_DIAGRAM_GUIDE },
      standReportToleranceDegStr: "0.25",
      standReportToleranceMinStr: "5",
      standReportToleranceMmStr: "2",
    }),
  applyStandAlignmentSnapshot: (snap) =>
    set({
      standAlignmentForm: mergeStandAlignmentForm(createEmptyStandAlignmentForm(), snap.form),
      standAlignmentTargets: mergeStandAlignmentForm(createEmptyStandAlignmentForm(), snap.targets),
      standDiagramGuide: { ...DEFAULT_STAND_DIAGRAM_GUIDE, ...(snap.diagramGuides ?? {}) },
      standReportToleranceDegStr: snap.toleranceDegStr ?? "0.25",
      standReportToleranceMinStr: snap.toleranceMinStr ?? "5",
      standReportToleranceMmStr: snap.toleranceMmStr ?? "2",
    }),

  patchStandFormCorner: (side, cornerPatch) =>
    set((state) => ({
      standAlignmentForm: mergeStandAlignmentForm(state.standAlignmentForm, {
        [side]: { ...state.standAlignmentForm[side], ...cornerPatch },
      } as Partial<StandAlignmentForm>),
    })),

  patchStandTargetsCorner: (side, cornerPatch) =>
    set((state) => ({
      standAlignmentTargets: mergeStandAlignmentForm(state.standAlignmentTargets, {
        [side]: { ...state.standAlignmentTargets[side], ...cornerPatch },
      } as Partial<StandAlignmentForm>),
    })),
}));
