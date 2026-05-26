export type AeroBodyInstallStatus = "installed" | "missing";

export type AeroBodyUpgradePlan = "none" | "planned";

export type AeroBodyMaterialId = "carbon" | "forged-carbon" | "fiberglass" | "aluminum" | "abs" | "steel" | "none";

export type AeroBodySourceKind =
  | "oem"
  | "user-input"
  | "estimated"
  | "brand"
  | "custom";

export type AeroBodyVendorKind = "oem" | "brand" | "custom";

export type AeroBodyUpgradeAction =
  | "keepEdit"
  | "keep"
  | "search"
  | "add"
  | "evaluate";

export type AeroBodyComponentRow = {
  id: string;
  label: string;
  icon: string;
  installStatus: AeroBodyInstallStatus;
  /** Upgrade intent — edited in Upgrade Planner, not Current Body Setup */
  upgradePlan: AeroBodyUpgradePlan;
  material: AeroBodyMaterialId;
  /** Mass in kg; null when unknown or not installed */
  weightKg: number | null;
  /** When true, weight applies per side (e.g. fenders) */
  weightPerSide: boolean;
  sourceKind: AeroBodySourceKind;
  /** Set when sourceKind is "brand" */
  sourceBrandId: string | null;
  /** Artisan / no-name label when sourceKind is "custom" */
  sourceCustomName: string;
  /** Target upgrade spec — edited in Upgrade Planner */
  planMaterial: AeroBodyMaterialId;
  planWeightKg: number | null;
  planWeightPerSide: boolean;
  planVendorKind: AeroBodyVendorKind;
  planVendorBrandId: string | null;
  planVendorCustomName: string;
  aeroRole: string;
  coolingRole: string;
};

export type AeroBodyPlannerTabId =
  | "current-setup"
  | "upgrade-planner"
  | "saved-setups"
  | "search-upgrades";

export const AERO_BODY_PLANNER_TABS: { id: AeroBodyPlannerTabId; label: string }[] = [
  { id: "current-setup", label: "Current Body Setup" },
  { id: "upgrade-planner", label: "Upgrade Planner" },
  { id: "saved-setups", label: "Saved Setups" },
  { id: "search-upgrades", label: "Search Upgrades" },
];

export const AERO_BODY_SOURCE_BRANDS: { id: string; label: string }[] = [
  { id: "vorsteiner", label: "Vorsteiner" },
  { id: "rocket-bunny", label: "Rocket Bunny / Pandem" },
  { id: "varis", label: "Varis" },
  { id: "apr", label: "APR Performance" },
  { id: "ac-schnitzer", label: "AC Schnitzer" },
  { id: "m-performance", label: "BMW M Performance" },
  { id: "liberty-walk", label: "Liberty Walk" },
  { id: "adro", label: "ADRO" },
  { id: "csf", label: "CSF / Eventuri" },
  { id: "maxton", label: "Maxton Design" },
];

export const AERO_BODY_MATERIALS: { id: AeroBodyMaterialId; label: string; swatch: string }[] = [
  { id: "carbon", label: "Carbon Fiber", swatch: "from-neutral-700 via-neutral-500 to-neutral-800" },
  { id: "forged-carbon", label: "Forged Carbon", swatch: "from-neutral-800 via-neutral-600 to-neutral-900" },
  { id: "fiberglass", label: "Fiberglass", swatch: "from-stone-500 via-stone-300 to-stone-600" },
  { id: "aluminum", label: "Aluminiu", swatch: "from-zinc-400 via-slate-300 to-zinc-500" },
  { id: "abs", label: "ABS / Plastic", swatch: "from-slate-600 to-slate-800" },
  { id: "steel", label: "Steel", swatch: "from-zinc-500 to-zinc-700" },
  { id: "none", label: "Other", swatch: "from-neutral-900 to-neutral-950" },
];

export const DEFAULT_AERO_BODY_COMPONENTS: AeroBodyComponentRow[] = [
  {
    id: "hood",
    label: "Hood",
    icon: "▭",
    installStatus: "installed",
    material: "carbon",
    weightKg: 8.7,
    weightPerSide: false,
    sourceKind: "user-input",
    sourceBrandId: null,
    sourceCustomName: "",
    upgradePlan: "none",
    planMaterial: "none",
    planWeightKg: null,
    planWeightPerSide: false,
    planVendorKind: "oem",
    planVendorBrandId: null,
    planVendorCustomName: "",
    aeroRole: "Heat Extraction / Low Drag",
    coolingRole: "Engine Bay Extraction",
  },
  {
    id: "front-bumper",
    label: "Front Bumper",
    icon: "⌐",
    installStatus: "installed",
    material: "abs",
    weightKg: 11.2,
    weightPerSide: false,
    sourceKind: "oem",
    sourceBrandId: null,
    sourceCustomName: "",
    upgradePlan: "none",
    planMaterial: "none",
    planWeightKg: null,
    planWeightPerSide: false,
    planVendorKind: "oem",
    planVendorBrandId: null,
    planVendorCustomName: "",
    aeroRole: "Front Downforce",
    coolingRole: "Radiator / Intercooler",
  },
  {
    id: "front-splitter",
    label: "Front Splitter",
    icon: "═",
    installStatus: "missing",
    material: "none",
    weightKg: null,
    weightPerSide: false,
    sourceKind: "user-input",
    sourceBrandId: null,
    sourceCustomName: "",
    upgradePlan: "none",
    planMaterial: "none",
    planWeightKg: null,
    planWeightPerSide: false,
    planVendorKind: "oem",
    planVendorBrandId: null,
    planVendorCustomName: "",
    aeroRole: "Front Downforce",
    coolingRole: "None",
  },
  {
    id: "rear-bumper",
    label: "Rear Bumper",
    icon: "⌐",
    installStatus: "installed",
    material: "abs",
    weightKg: 9.6,
    weightPerSide: false,
    sourceKind: "oem",
    sourceBrandId: null,
    sourceCustomName: "",
    upgradePlan: "none",
    planMaterial: "none",
    planWeightKg: null,
    planWeightPerSide: false,
    planVendorKind: "oem",
    planVendorBrandId: null,
    planVendorCustomName: "",
    aeroRole: "Rear Downforce",
    coolingRole: "None",
  },
  {
    id: "rear-diffuser",
    label: "Rear Diffuser",
    icon: "▼",
    installStatus: "missing",
    material: "none",
    weightKg: null,
    weightPerSide: false,
    sourceKind: "user-input",
    sourceBrandId: null,
    sourceCustomName: "",
    upgradePlan: "none",
    planMaterial: "none",
    planWeightKg: null,
    planWeightPerSide: false,
    planVendorKind: "oem",
    planVendorBrandId: null,
    planVendorCustomName: "",
    aeroRole: "Rear Downforce & Stability",
    coolingRole: "None",
  },
  {
    id: "trunk",
    label: "Trunk / Boot",
    icon: "▬",
    installStatus: "installed",
    material: "steel",
    weightKg: 12.5,
    weightPerSide: false,
    sourceKind: "oem",
    sourceBrandId: null,
    sourceCustomName: "",
    upgradePlan: "none",
    planMaterial: "none",
    planWeightKg: null,
    planWeightPerSide: false,
    planVendorKind: "oem",
    planVendorBrandId: null,
    planVendorCustomName: "",
    aeroRole: "Rear Downforce & Stability",
    coolingRole: "None",
  },
  {
    id: "spoiler",
    label: "Spoiler / Wing",
    icon: "⌁",
    installStatus: "missing",
    material: "none",
    weightKg: null,
    weightPerSide: false,
    sourceKind: "user-input",
    sourceBrandId: null,
    sourceCustomName: "",
    upgradePlan: "none",
    planMaterial: "none",
    planWeightKg: null,
    planWeightPerSide: false,
    planVendorKind: "oem",
    planVendorBrandId: null,
    planVendorCustomName: "",
    aeroRole: "Rear Downforce",
    coolingRole: "None",
  },
  {
    id: "side-skirts",
    label: "Side Skirts",
    icon: "▥",
    installStatus: "missing",
    material: "none",
    weightKg: null,
    weightPerSide: false,
    sourceKind: "user-input",
    sourceBrandId: null,
    sourceCustomName: "",
    upgradePlan: "none",
    planMaterial: "none",
    planWeightKg: null,
    planWeightPerSide: false,
    planVendorKind: "oem",
    planVendorBrandId: null,
    planVendorCustomName: "",
    aeroRole: "Side Sealing / Underbody Flow",
    coolingRole: "None",
  },
  {
    id: "front-fenders",
    label: "Front Fenders",
    icon: "◧",
    installStatus: "installed",
    material: "steel",
    weightKg: 4.8,
    weightPerSide: true,
    sourceKind: "oem",
    sourceBrandId: null,
    sourceCustomName: "",
    upgradePlan: "none",
    planMaterial: "none",
    planWeightKg: null,
    planWeightPerSide: false,
    planVendorKind: "oem",
    planVendorBrandId: null,
    planVendorCustomName: "",
    aeroRole: "Side Sealing / Underbody Flow",
    coolingRole: "None",
  },
  {
    id: "rear-fenders",
    label: "Rear Fenders",
    icon: "◨",
    installStatus: "installed",
    material: "steel",
    weightKg: 4.2,
    weightPerSide: true,
    sourceKind: "oem",
    sourceBrandId: null,
    sourceCustomName: "",
    upgradePlan: "none",
    planMaterial: "none",
    planWeightKg: null,
    planWeightPerSide: false,
    planVendorKind: "oem",
    planVendorBrandId: null,
    planVendorCustomName: "",
    aeroRole: "Side Sealing / Underbody Flow",
    coolingRole: "None",
  },
  {
    id: "undertray",
    label: "Undertray",
    icon: "▔",
    installStatus: "missing",
    material: "none",
    weightKg: null,
    weightPerSide: false,
    sourceKind: "user-input",
    sourceBrandId: null,
    sourceCustomName: "",
    upgradePlan: "none",
    planMaterial: "none",
    planWeightKg: null,
    planWeightPerSide: false,
    planVendorKind: "oem",
    planVendorBrandId: null,
    planVendorCustomName: "",
    aeroRole: "Underbody Flow / Cooling",
    coolingRole: "Engine Bay / Diffuser Feed",
  },
  {
    id: "widebody",
    label: "Widebody Kit",
    icon: "◫",
    installStatus: "missing",
    material: "none",
    weightKg: null,
    weightPerSide: false,
    sourceKind: "brand",
    sourceBrandId: "rocket-bunny",
    sourceCustomName: "",
    upgradePlan: "planned",
    planMaterial: "fiberglass",
    planWeightKg: null,
    planWeightPerSide: false,
    planVendorKind: "brand",
    planVendorBrandId: "rocket-bunny",
    planVendorCustomName: "",
    aeroRole: "Wide Track / Wheel Arch Flow",
    coolingRole: "Brake Cooling (when vented)",
  },
];

export function formatPlanVendor(row: Pick<
  AeroBodyComponentRow,
  "planVendorKind" | "planVendorBrandId" | "planVendorCustomName"
>): string {
  switch (row.planVendorKind) {
    case "oem":
      return "OEM";
    case "brand": {
      const brand = AERO_BODY_SOURCE_BRANDS.find((b) => b.id === row.planVendorBrandId);
      return brand?.label ?? "Brand";
    }
    case "custom":
      return row.planVendorCustomName.trim() || "Custom / Artisan";
    default:
      return "—";
  }
}

export function formatPlanWeight(row: Pick<AeroBodyComponentRow, "planWeightKg" | "planWeightPerSide">): string {
  if (row.planWeightKg == null || Number.isNaN(row.planWeightKg)) return "—";
  const base = `${row.planWeightKg % 1 === 0 ? row.planWeightKg : row.planWeightKg.toFixed(1)} kg`;
  return row.planWeightPerSide ? `${base} ea` : base;
}

export function deriveAeroBodyUpgradeAction(row: AeroBodyComponentRow): AeroBodyUpgradeAction {
  if (row.upgradePlan === "planned") return "evaluate";
  if (row.installStatus === "missing") return "add";
  if (row.sourceKind === "user-input" || row.sourceKind === "custom") return "keepEdit";
  return "keep";
}

export function formatAeroBodyWeight(row: Pick<AeroBodyComponentRow, "weightKg" | "weightPerSide">): string {
  if (row.weightKg == null || Number.isNaN(row.weightKg)) return "—";
  const base = `${row.weightKg % 1 === 0 ? row.weightKg : row.weightKg.toFixed(1)} kg`;
  return row.weightPerSide ? `${base} ea` : base;
}

export function formatAeroBodySource(row: Pick<
  AeroBodyComponentRow,
  "installStatus" | "upgradePlan" | "sourceKind" | "sourceBrandId" | "sourceCustomName"
>): string {
  if (row.installStatus === "missing" && row.upgradePlan === "none") return "Missing";
  switch (row.sourceKind) {
    case "oem":
      return "OEM";
    case "user-input":
      return "User Input";
    case "estimated":
      return "Estimated";
    case "brand": {
      const brand = AERO_BODY_SOURCE_BRANDS.find((b) => b.id === row.sourceBrandId);
      return brand?.label ?? "Brand";
    }
    case "custom":
      return row.sourceCustomName.trim() || "Custom / Artisan";
    default:
      return "—";
  }
}

export function aeroBodyComponentCounts(rows: AeroBodyComponentRow[]) {
  const installed = rows.filter((r) => r.installStatus === "installed").length;
  const planned = rows.filter((r) => r.upgradePlan === "planned").length;
  return { installed, planned, total: rows.length, tracked: rows.length };
}
