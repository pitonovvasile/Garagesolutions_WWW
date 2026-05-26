import { create } from "zustand";
import type { GarageTargetUseProfileId } from "../data/garageTargetUseProfile";
import {
  DEFAULT_GARAGE_OPTIMIZATION_PRIORITIES,
  type GarageOptimizationPriorityId,
  type GarageOptimizationPriorities,
  type GarageSetupModeId,
} from "../data/garageOptimizationPriorities";

type GarageWorkspaceState = {
  targetUseProfileId: GarageTargetUseProfileId;
  optimizationPriorities: GarageOptimizationPriorities;
  setupMode: GarageSetupModeId;
  setTargetUseProfileId: (id: GarageTargetUseProfileId) => void;
  setOptimizationPriority: (id: GarageOptimizationPriorityId, value: number) => void;
  setSetupMode: (mode: GarageSetupModeId) => void;
};

export const useGarageWorkspaceStore = create<GarageWorkspaceState>((set) => ({
  targetUseProfileId: "track",
  optimizationPriorities: { ...DEFAULT_GARAGE_OPTIMIZATION_PRIORITIES },
  setupMode: "modified",
  setTargetUseProfileId: (targetUseProfileId) => set({ targetUseProfileId }),
  setOptimizationPriority: (id, value) =>
    set((s) => ({
      optimizationPriorities: {
        ...s.optimizationPriorities,
        [id]: Math.max(0, Math.min(100, Math.round(value))),
      },
    })),
  setSetupMode: (setupMode) => set({ setupMode }),
}));
