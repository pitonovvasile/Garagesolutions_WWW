import { create } from "zustand";
import type { TransmissionNavSectionId } from "../data/transmissionCatalogStructure";

type TransmissionState = {
  activeSection: TransmissionNavSectionId;
  searchQuery: string;
  brandFilter: string;
  priceBand: "" | "0-500" | "500-1000" | "1000+";
  drivetrainDetailsExpanded: boolean;
  footerCollapsed: boolean;
  workflowStepIndex: number;
  setActiveSection: (s: TransmissionNavSectionId) => void;
  setSearchQuery: (q: string) => void;
  setBrandFilter: (b: string) => void;
  setPriceBand: (p: TransmissionState["priceBand"]) => void;
  setDrivetrainDetailsExpanded: (v: boolean) => void;
  toggleFooterCollapsed: () => void;
  setWorkflowStepIndex: (i: number) => void;
};

export const useTransmissionStore = create<TransmissionState>((set) => ({
  activeSection: "overview",
  searchQuery: "",
  brandFilter: "",
  priceBand: "",
  drivetrainDetailsExpanded: false,
  footerCollapsed: true,
  workflowStepIndex: 1,
  setActiveSection: (activeSection) => set({ activeSection }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setBrandFilter: (brandFilter) => set({ brandFilter }),
  setPriceBand: (priceBand) => set({ priceBand }),
  setDrivetrainDetailsExpanded: (drivetrainDetailsExpanded) => set({ drivetrainDetailsExpanded }),
  toggleFooterCollapsed: () => set((s) => ({ footerCollapsed: !s.footerCollapsed })),
  setWorkflowStepIndex: (workflowStepIndex) => set({ workflowStepIndex }),
}));
