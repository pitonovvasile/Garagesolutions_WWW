import { create } from "zustand";

export type PerformanceBuildType = "Turbo" | "NA" | "Supercharged" | "Hybrid";
export type PerformanceReliability = "OEM+" | "Street Performance" | "Track";
export type PerformanceBudgetLevel = "Low" | "Medium" | "High";
export type PerformanceViewMode = "simple" | "technical" | "expert";

type PerformanceState = {
  buildType: PerformanceBuildType;
  fuel: string;
  targetPowerHp: number;
  reliability: PerformanceReliability;
  budgetLevel: PerformanceBudgetLevel;
  viewMode: PerformanceViewMode;
  activeCenterTab: number;
  oeSpecsModalOpen: boolean;
  targetModalOpen: boolean;
  setBuildType: (v: PerformanceBuildType) => void;
  setFuel: (v: string) => void;
  setTargetPowerHp: (v: number) => void;
  setReliability: (v: PerformanceReliability) => void;
  setBudgetLevel: (v: PerformanceBudgetLevel) => void;
  setViewMode: (v: PerformanceViewMode) => void;
  setActiveCenterTab: (tab: number) => void;
  setOeSpecsModalOpen: (open: boolean) => void;
  setTargetModalOpen: (open: boolean) => void;
};

export const usePerformanceStore = create<PerformanceState>((set) => ({
  buildType: "Turbo",
  fuel: "RON 98",
  targetPowerHp: 450,
  reliability: "Street Performance",
  budgetLevel: "Medium",
  viewMode: "expert",
  activeCenterTab: 0,
  oeSpecsModalOpen: false,
  targetModalOpen: false,
  setBuildType: (buildType) => set({ buildType }),
  setFuel: (fuel) => set({ fuel }),
  setTargetPowerHp: (targetPowerHp) => set({ targetPowerHp }),
  setReliability: (reliability) => set({ reliability }),
  setBudgetLevel: (budgetLevel) => set({ budgetLevel }),
  setViewMode: (viewMode) => set({ viewMode }),
  setActiveCenterTab: (activeCenterTab) => set({ activeCenterTab }),
  setOeSpecsModalOpen: (oeSpecsModalOpen) => set({ oeSpecsModalOpen }),
  setTargetModalOpen: (targetModalOpen) => set({ targetModalOpen }),
}));
