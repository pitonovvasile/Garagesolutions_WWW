import { create } from "zustand";
import {
  DEFAULT_AERO_BODY_COMPONENTS,
  type AeroBodyComponentRow,
  type AeroBodyInstallStatus,
  type AeroBodyMaterialId,
  type AeroBodyPlannerTabId,
  type AeroBodySourceKind,
  type AeroBodyUpgradePlan,
  type AeroBodyVendorKind,
} from "../data/aeroBodyComponents";
import {
  appendSavedAeroBodySetup,
  buildDefaultAeroSetupLabel,
  deleteSavedAeroBodySetup,
  newSavedAeroBodySetupId,
  readSavedAeroBodySetupById,
  type AeroBodySetupKind,
} from "../lib/aeroBodySetupPersistence";
import { useSuspensionStore } from "./suspensionStore";

function patchRow(row: AeroBodyComponentRow, patch: Partial<AeroBodyComponentRow>): AeroBodyComponentRow {
  return { ...row, ...patch };
}

type AeroBodyPlannerState = {
  activeTab: AeroBodyPlannerTabId;
  components: AeroBodyComponentRow[];
  selectedComponentId: string;
  setActiveTab: (tab: AeroBodyPlannerTabId) => void;
  setSelectedComponentId: (id: string) => void;
  setInstallStatus: (id: string, installStatus: AeroBodyInstallStatus) => void;
  setUpgradePlan: (id: string, upgradePlan: AeroBodyUpgradePlan) => void;
  setComponentMaterial: (id: string, material: AeroBodyMaterialId) => void;
  setComponentWeight: (id: string, weightKg: number | null, weightPerSide?: boolean) => void;
  setComponentSource: (
    id: string,
    sourceKind: AeroBodySourceKind,
    opts?: { brandId?: string | null; customName?: string },
  ) => void;
  setPlanMaterial: (id: string, planMaterial: AeroBodyMaterialId) => void;
  setPlanWeight: (id: string, planWeightKg: number | null, planWeightPerSide?: boolean) => void;
  setPlanVendor: (
    id: string,
    planVendorKind: AeroBodyVendorKind,
    opts?: { brandId?: string | null; customName?: string },
  ) => void;
  clearMissingComponents: () => void;
  /** Persist current components to Saved Setups and open that tab. */
  saveSetup: (kind: AeroBodySetupKind, label?: string) => string;
  loadSetup: (id: string) => boolean;
  removeSavedSetup: (id: string) => void;
  duplicateSetup: () => string;
};

export const useAeroBodyPlannerStore = create<AeroBodyPlannerState>((set, get) => ({
  activeTab: "current-setup",
  components: DEFAULT_AERO_BODY_COMPONENTS.map((r) => ({ ...r })),
  selectedComponentId: "hood",
  setActiveTab: (activeTab) => set({ activeTab }),
  setSelectedComponentId: (selectedComponentId) => set({ selectedComponentId }),
  setInstallStatus: (id, installStatus) =>
    set((s) => ({
      components: s.components.map((row) => {
        if (row.id !== id) return row;
        if (installStatus === "missing") {
          return patchRow(row, {
            installStatus,
            material: "none",
            weightKg: null,
            weightPerSide: false,
          });
        }
        return patchRow(row, {
          installStatus,
          material: row.material === "none" ? "abs" : row.material,
          sourceKind: row.sourceKind === "oem" ? "user-input" : row.sourceKind,
          upgradePlan: "none",
        });
      }),
    })),
  setUpgradePlan: (id, upgradePlan) =>
    set((s) => ({
      components: s.components.map((row) => {
        if (row.id !== id) return row;
        if (upgradePlan === "none") return patchRow(row, { upgradePlan });
        return patchRow(row, {
          upgradePlan,
          ...(row.planMaterial === "none" ? { planMaterial: "carbon" as const } : {}),
          ...(row.planVendorKind === "oem" && row.installStatus === "missing"
            ? { planVendorKind: "brand" as const, planVendorBrandId: "vorsteiner" }
            : {}),
        });
      }),
    })),
  setComponentMaterial: (id, material) =>
    set((s) => ({
      components: s.components.map((row) => (row.id === id ? patchRow(row, { material }) : row)),
    })),
  setComponentWeight: (id, weightKg, weightPerSide) =>
    set((s) => ({
      components: s.components.map((row) => {
        if (row.id !== id) return row;
        const nextWeight = weightKg != null && weightKg <= 0 ? null : weightKg;
        return patchRow(row, {
          weightKg: nextWeight,
          ...(weightPerSide !== undefined ? { weightPerSide } : {}),
          ...(row.installStatus !== "missing" && row.sourceKind === "oem" && nextWeight != null
            ? { sourceKind: "user-input" as const }
            : {}),
        });
      }),
    })),
  setComponentSource: (id, sourceKind, opts) =>
    set((s) => ({
      components: s.components.map((row) => {
        if (row.id !== id || row.installStatus === "missing") return row;
        return patchRow(row, {
          sourceKind,
          sourceBrandId: sourceKind === "brand" ? (opts?.brandId ?? row.sourceBrandId ?? "vorsteiner") : null,
          sourceCustomName: sourceKind === "custom" ? (opts?.customName ?? row.sourceCustomName) : "",
        });
      }),
    })),
  setPlanMaterial: (id, planMaterial) =>
    set((s) => ({
      components: s.components.map((row) => (row.id === id ? patchRow(row, { planMaterial }) : row)),
    })),
  setPlanWeight: (id, planWeightKg, planWeightPerSide) =>
    set((s) => ({
      components: s.components.map((row) => {
        if (row.id !== id) return row;
        const nextWeight = planWeightKg != null && planWeightKg <= 0 ? null : planWeightKg;
        return patchRow(row, {
          planWeightKg: nextWeight,
          ...(planWeightPerSide !== undefined ? { planWeightPerSide } : {}),
        });
      }),
    })),
  setPlanVendor: (id, planVendorKind, opts) =>
    set((s) => ({
      components: s.components.map((row) => {
        if (row.id !== id) return row;
        return patchRow(row, {
          planVendorKind,
          planVendorBrandId:
            planVendorKind === "brand" ? (opts?.brandId ?? row.planVendorBrandId ?? "vorsteiner") : null,
          planVendorCustomName:
            planVendorKind === "custom" ? (opts?.customName ?? row.planVendorCustomName) : "",
        });
      }),
    })),
  clearMissingComponents: () =>
    set((s) => ({
      components: s.components.filter((row) => row.installStatus !== "missing"),
    })),
  saveSetup: (kind, label) => {
    const { vehicleId, garageCarIndex } = useSuspensionStore.getState();
    const components = get().components.map((r) => ({ ...r }));
    const now = Date.now();
    const id = newSavedAeroBodySetupId();
    appendSavedAeroBodySetup({
      id,
      label: label?.trim() || buildDefaultAeroSetupLabel(kind),
      createdAt: now,
      updatedAt: now,
      vehicleTemplateId: vehicleId,
      garageCarIndex,
      kind,
      components,
    });
    set({ activeTab: "saved-setups" });
    return id;
  },
  loadSetup: (id) => {
    const row = readSavedAeroBodySetupById(id);
    if (!row) return false;
    set({
      components: row.components.map((r) => ({ ...r })),
      selectedComponentId: row.components[0]?.id ?? get().selectedComponentId,
    });
    return true;
  },
  removeSavedSetup: (id) => {
    deleteSavedAeroBodySetup(id);
  },
  duplicateSetup: () => {
    const label = `${buildDefaultAeroSetupLabel("full")} (copy)`;
    return get().saveSetup("full", label);
  },
}));
