export type GarageOptimizationPriorityId =
  | "weightSaving"
  | "aeroEfficiency"
  | "cooling"
  | "durability"
  | "streetUsability"
  | "costEfficiency";

export type GarageOptimizationPriorities = Record<GarageOptimizationPriorityId, number>;

export const GARAGE_OPTIMIZATION_PRIORITY_META: {
  id: GarageOptimizationPriorityId;
  label: string;
}[] = [
  { id: "weightSaving", label: "Weight Saving" },
  { id: "aeroEfficiency", label: "Aero Efficiency" },
  { id: "cooling", label: "Cooling" },
  { id: "durability", label: "Durability" },
  { id: "streetUsability", label: "Street Usability" },
  { id: "costEfficiency", label: "Cost Efficiency" },
];

export const DEFAULT_GARAGE_OPTIMIZATION_PRIORITIES: GarageOptimizationPriorities = {
  weightSaving: 70,
  aeroEfficiency: 65,
  cooling: 80,
  durability: 55,
  streetUsability: 75,
  costEfficiency: 50,
};

export type GarageSetupModeId = "stock" | "modified" | "custom";

export const GARAGE_SETUP_MODES: { id: GarageSetupModeId; label: string }[] = [
  { id: "stock", label: "Stock / OEM" },
  { id: "modified", label: "Modified" },
  { id: "custom", label: "Custom" },
];
