import type { TransmissionDrivetrainProfile } from "../lib/transmissionDrivetrainProfile";
import {
  isAutomaticTransmission,
  isDctTransmission,
  isManualTransmission,
} from "../lib/transmissionDrivetrainProfile";

export type TransmissionBadgeTone =
  | "high"
  | "awd"
  | "fourByFour"
  | "service"
  | "performance"
  | "manualOnly"
  | "automaticOnly"
  | "conversion"
  | "system"
  | "nvh"
  | "secondary";

export type TransmissionCatalogItem = {
  label: string;
  dbCategoryKey: string;
  dbSubcategory?: string;
  badges?: TransmissionBadgeTone[];
  hidden?: boolean;
  dimmed?: boolean;
};

export type TransmissionCatalogGroup = {
  id: string;
  title: string;
  icon: string;
  priority: "primary" | "secondary" | "tertiary";
  items: TransmissionCatalogItem[];
};

export type TransmissionRecommendedCard = {
  id: string;
  title: string;
  badge: TransmissionBadgeTone;
  items: string[];
  hidden?: boolean;
};

const BADGE_LABEL: Record<TransmissionBadgeTone, string> = {
  high: "High relevance",
  awd: "AWD specific",
  fourByFour: "4x4 specific",
  service: "Service item",
  performance: "Performance",
  manualOnly: "Manual only",
  automaticOnly: "Automatic only",
  conversion: "Conversion only",
  system: "System specific",
  nvh: "NVH / reliability",
  secondary: "Secondary",
};

export function transmissionBadgeLabel(tone: TransmissionBadgeTone): string {
  return BADGE_LABEL[tone];
}

export function transmissionBadgeClass(tone: TransmissionBadgeTone): string {
  switch (tone) {
    case "high":
    case "service":
      return "border-cyan-500/35 bg-cyan-500/10 text-cyan-200/90";
    case "awd":
    case "fourByFour":
    case "system":
      return "border-violet-500/35 bg-violet-500/10 text-violet-200/90";
    case "performance":
      return "border-amber-500/35 bg-amber-500/10 text-amber-200/90";
    case "manualOnly":
    case "conversion":
      return "border-orange-500/30 bg-orange-500/10 text-orange-200/80";
    case "automaticOnly":
      return "border-sky-500/30 bg-sky-500/10 text-sky-200/80";
    case "nvh":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200/80";
    default:
      return "border-white/10 bg-white/[0.04] text-neutral-400";
  }
}

function manualOnly(profile: TransmissionDrivetrainProfile): boolean {
  return isManualTransmission(profile);
}

function autoOnly(profile: TransmissionDrivetrainProfile): boolean {
  return isAutomaticTransmission(profile) || isDctTransmission(profile);
}

export function buildRecommendedCards(profile: TransmissionDrivetrainProfile): TransmissionRecommendedCard[] {
  const manual = manualOnly(profile);
  const automatic = autoOnly(profile);

  const cards: TransmissionRecommendedCard[] = [
    {
      id: "transmission-service",
      title: "Transmission Service",
      badge: "high",
      items: [
        automatic
          ? "Automatic transmission oil / ATF"
          : manual
            ? "Manual transmission oil / gear oil"
            : "Transmission fluid (check type)",
        automatic || manual ? "Filter / pan kit (if applicable)" : "Filter / pan kit",
        "Drain & fill plugs",
        automatic ? "Mechatronics / valve body (if supported)" : manual ? "Clutch service items" : undefined,
        manual ? "Flywheel inspection" : undefined,
      ].filter(Boolean) as string[],
    },
    {
      id: "transfer-case",
      title: "Transfer Case / AWD Coupling",
      badge: profile.drivetrainLayoutClass === "fourByFour" ? "fourByFour" : "awd",
      hidden: !profile.hasTransferCase && !profile.hasElectronicCoupling,
      items: [
        "Transfer case oil",
        profile.hasElectronicCoupling ? "Coupling service" : "Coupling inspection",
        "Output shaft seals",
        profile.hasElectronicCoupling ? "Adaptation reset note (if applicable)" : "Wear inspection",
      ],
    },
    {
      id: "axle-diff-service",
      title: "Front & Rear Differential Service",
      badge: profile.isAwdFamily ? "awd" : "service",
      hidden: profile.drivetrainLayoutClass === "fwd",
      items: [
        profile.drivetrainLayoutClass !== "rwd" ? "Front differential oil" : "Front differential (N/A)",
        "Rear differential oil",
        "Differential seals",
        "Bushings",
        "Reinforced bolts",
      ].filter((x) => !x.includes("N/A")),
    },
    {
      id: "center-diff",
      title: "Center Differential / Locking System",
      badge: "system",
      hidden: !profile.hasCenterDiffOrCoupling && !profile.hasLockingDiff,
      items: [
        profile.hasCenterDiffOrCoupling ? "Center differential / coupling oil" : "Locking actuator check",
        profile.hasLockingDiff ? "Locking actuator service" : "Electronic diff control",
        profile.hasElectronicCoupling ? "Coupling service" : "Wear inspection",
      ],
    },
    {
      id: "mounts",
      title: "Mounts & Drivetrain Stability",
      badge: "nvh",
      items: [
        "Gearbox mounts",
        profile.hasTransferCase ? "Transfer case mounts" : "Transfer case mounts (if equipped)",
        "Differential mounts",
        "Prop shaft support",
      ].filter((x) => !x.includes("if equipped") || profile.hasTransferCase),
    },
    {
      id: "upgrade-paths",
      title: "Upgrade Paths",
      badge: "performance",
      items: [
        "LSD conversion",
        "Locking differential",
        "Short final drive",
        "Oil cooling",
        "Heavy-duty mounts",
      ],
    },
  ];

  return cards.filter((c) => !c.hidden);
}

export function buildCatalogGroups(profile: TransmissionDrivetrainProfile): TransmissionCatalogGroup[] {
  const manual = manualOnly(profile);
  const automatic = autoOnly(profile);

  return [
    {
      id: "service-fluids",
      title: "Service & Fluids",
      icon: "🛢",
      priority: "primary",
      items: [
        { label: "Automatic transmission oil", dbCategoryKey: "oil", dbSubcategory: "Auto Transmission Oil", badges: ["service", "automaticOnly"], dimmed: manual, hidden: manual },
        { label: "Manual transmission oil", dbCategoryKey: "oil", dbSubcategory: "Manual Transmission Oil", badges: ["service", "manualOnly"], dimmed: automatic, hidden: automatic },
        { label: "Transfer case oil", dbCategoryKey: "oil", dbSubcategory: "All Oils", badges: ["awd", "service"], dimmed: !profile.hasTransferCase, hidden: !profile.hasTransferCase },
        { label: "Front differential oil", dbCategoryKey: "oil", dbSubcategory: "LSD Oils", badges: ["awd", "service"], dimmed: profile.drivetrainLayoutClass === "rwd" || profile.drivetrainLayoutClass === "fwd" },
        { label: "Rear differential oil", dbCategoryKey: "oil", dbSubcategory: "LSD Oils", badges: ["service"], dimmed: profile.drivetrainLayoutClass === "fwd" },
        { label: "Center differential oil", dbCategoryKey: "oil", badges: ["system", "service"], dimmed: !profile.hasCenterDiffOrCoupling, hidden: !profile.hasCenterDiffOrCoupling },
        { label: "LSD oil", dbCategoryKey: "oil", dbSubcategory: "LSD Oils", badges: ["service", "performance"] },
        { label: "Filters, pans & gaskets", dbCategoryKey: "oil", badges: ["service", "automaticOnly"], dimmed: manual },
        { label: "Drain / fill plugs", dbCategoryKey: "accessories", badges: ["service"] },
        { label: "Service kits", dbCategoryKey: "oil", dbSubcategory: "All Oils", badges: ["high", "service"] },
      ],
    },
    {
      id: "transmission-system",
      title: "Transmission System",
      icon: "⚙️",
      priority: "primary",
      items: [
        { label: "Automatic transmission parts", dbCategoryKey: "gearbox", badges: ["automaticOnly"], dimmed: manual },
        { label: "Manual transmission parts", dbCategoryKey: "gearbox", badges: ["manualOnly"], dimmed: automatic },
        { label: "Gearboxes", dbCategoryKey: "gearbox", badges: ["performance"] },
        { label: "Torque converters", dbCategoryKey: "gearbox", badges: ["automaticOnly"], dimmed: manual || isDctTransmission(profile) },
        { label: "Clutch packs", dbCategoryKey: "clutch", dbSubcategory: "Clutch Kits", badges: ["manualOnly", "conversion"], dimmed: automatic },
        { label: "Mechatronics / valve body", dbCategoryKey: "gearbox", badges: ["automaticOnly"], dimmed: manual },
        { label: "Gearbox rebuild kits", dbCategoryKey: "gearbox", badges: ["performance"] },
        { label: "Gearbox mounts", dbCategoryKey: "mounts", dbSubcategory: "Gearbox Mounts", badges: ["nvh"] },
      ],
    },
    {
      id: "awd-transfer",
      title: "AWD / 4x4 Transfer System",
      icon: "🔗",
      priority: profile.isAwdFamily ? "primary" : "tertiary",
      items: [
        { label: "Transfer case", dbCategoryKey: "gearbox", badges: ["awd"], hidden: !profile.hasTransferCase, dimmed: !profile.hasTransferCase },
        { label: "Transfer case oil", dbCategoryKey: "oil", badges: ["awd", "service"], hidden: !profile.hasTransferCase },
        { label: "Transfer case chain", dbCategoryKey: "gearbox", badges: ["awd"], hidden: !profile.hasTransferCase, dimmed: !profile.hasTransferCase },
        { label: "Transfer case actuator", dbCategoryKey: "accessories", badges: ["system"], hidden: !profile.hasTransferCase },
        { label: "Viscous coupling", dbCategoryKey: "differential", badges: ["system"], hidden: !profile.hasCenterDiffOrCoupling },
        { label: "Haldex / electronic coupling", dbCategoryKey: "differential", badges: ["system", "awd"], hidden: !profile.hasElectronicCoupling, dimmed: !profile.hasElectronicCoupling },
        { label: "Center differential", dbCategoryKey: "differential", badges: ["system"], hidden: !profile.hasCenterDiffOrCoupling },
        { label: "Output shaft seals", dbCategoryKey: "differential", badges: ["service", "awd"], hidden: !profile.hasTransferCase },
        { label: "Prop shaft / driveshaft components", dbCategoryKey: "accessories", badges: ["awd", "nvh"], dimmed: !profile.isAwdFamily },
      ],
    },
    {
      id: "differentials",
      title: "Differentials & Final Drive",
      icon: "🛞",
      priority: "primary",
      items: [
        { label: "Front differential", dbCategoryKey: "differential", badges: ["awd"], dimmed: profile.drivetrainLayoutClass === "rwd" },
        { label: "Rear differential", dbCategoryKey: "differential", badges: ["service"], dimmed: profile.drivetrainLayoutClass === "fwd" },
        { label: "Center differential", dbCategoryKey: "differential", badges: ["system"], hidden: !profile.hasCenterDiffOrCoupling },
        { label: "LSD upgrades", dbCategoryKey: "differential", dbSubcategory: "Limited Slip Diff", badges: ["performance"] },
        { label: "Locking differential parts", dbCategoryKey: "differential", badges: ["performance", "fourByFour"], dimmed: !profile.hasLockingDiff && !profile.isAwdFamily },
        { label: "Final drive ratios", dbCategoryKey: "differential", dbSubcategory: "Short Ratio Diff", badges: ["performance"] },
        { label: "Halfshafts / driveshafts", dbCategoryKey: "differential", dbSubcategory: "Halfshafts", badges: ["service"] },
        { label: "Differential bushings", dbCategoryKey: "differential", dbSubcategory: "Bushings", badges: ["nvh"] },
        { label: "Reinforced bolts", dbCategoryKey: "differential", dbSubcategory: "Reinforced Bolts", badges: ["performance"] },
      ],
    },
    {
      id: "mounts-bushings",
      title: "Mounts & Bushings",
      icon: "🔩",
      priority: "secondary",
      items: [
        { label: "Gearbox mounts", dbCategoryKey: "mounts", dbSubcategory: "Gearbox Mounts", badges: ["nvh"] },
        { label: "Transfer case mounts", dbCategoryKey: "mounts", badges: ["awd"], hidden: !profile.hasTransferCase, dimmed: !profile.hasTransferCase },
        { label: "Differential mounts", dbCategoryKey: "mounts", dbSubcategory: "Differential Mounts", badges: ["nvh"] },
        { label: "Prop shaft supports", dbCategoryKey: "accessories", badges: ["awd", "nvh"], dimmed: !profile.isAwdFamily },
        { label: "Subframe bushings", dbCategoryKey: "mounts", badges: ["nvh"] },
        { label: "Reinforced mount kits", dbCategoryKey: "mounts", badges: ["performance"] },
        { label: "Engine & gearbox swap kits", dbCategoryKey: "mounts", dbSubcategory: "Engine & Box Swap Kits", badges: ["conversion"] },
      ],
    },
    {
      id: "performance-upgrades",
      title: "Performance Upgrades",
      icon: "🏁",
      priority: "secondary",
      items: [
        { label: "LSD conversion", dbCategoryKey: "differential", dbSubcategory: "Limited Slip Diff", badges: ["performance"] },
        { label: "Locking differential conversion", dbCategoryKey: "differential", badges: ["performance", "fourByFour"] },
        { label: "Racing diff kits", dbCategoryKey: "differential", dbSubcategory: "RacingDiffs Kits", badges: ["performance"] },
        { label: "Oil coolers", dbCategoryKey: "accessories", dbSubcategory: "Oil Coolers", badges: ["performance"] },
        { label: "Short ratio final drive", dbCategoryKey: "differential", dbSubcategory: "Short Ratio Diff", badges: ["performance"] },
        { label: "Heavy-duty transfer case parts", dbCategoryKey: "gearbox", badges: ["awd", "performance"], hidden: !profile.hasTransferCase },
        { label: "Swap kits", dbCategoryKey: "mounts", dbSubcategory: "Engine & Box Swap Kits", badges: ["conversion"] },
      ],
    },
    {
      id: "manual-conversion",
      title: "Manual Conversion / Other",
      icon: "🧲",
      priority: manual ? "secondary" : "tertiary",
      items: [
        { label: "Clutch kits", dbCategoryKey: "clutch", dbSubcategory: "Clutch Kits", badges: manual ? ["high"] : ["manualOnly", "conversion"], dimmed: automatic },
        { label: "Flywheels", dbCategoryKey: "clutch", dbSubcategory: "Flywheels", badges: ["manualOnly", "conversion"], dimmed: automatic },
        { label: "Clutch cylinders", dbCategoryKey: "clutch", dbSubcategory: "Clutch Cylinders", badges: ["manualOnly", "conversion"], dimmed: automatic },
        { label: "Braided clutch lines", dbCategoryKey: "clutch", dbSubcategory: "Bearings & Braided Hoses", badges: ["manualOnly", "conversion"], dimmed: automatic },
        { label: "Short shifters", dbCategoryKey: "accessories", dbSubcategory: "Short Shifters", badges: ["manualOnly", "conversion"], dimmed: automatic, hidden: automatic },
        { label: "Shift knobs", dbCategoryKey: "accessories", dbSubcategory: "Shift Knobs", badges: ["manualOnly", "conversion"], dimmed: automatic },
      ],
    },
  ];
}

export const TRANSMISSION_CONFIG_FLOW = [
  { id: "identify", label: "Identify setup", section: "overview", icon: "◎" },
  { id: "recommended", label: "Recommended service", section: "recommended", icon: "★" },
  { id: "parts", label: "Select parts", section: "catalog", icon: "▦" },
  { id: "fitment", label: "Check fitment", section: "catalog", icon: "⬡" },
  { id: "save", label: "Save / Buy", section: "saved", icon: "✓" },
] as const;

export type TransmissionConfigFlowStepId = (typeof TRANSMISSION_CONFIG_FLOW)[number]["id"];

export const TRANSMISSION_NAV_SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "recommended", label: "Recommended service" },
  { id: "awd-systems", label: "AWD / 4x4 systems" },
  { id: "catalog", label: "Parts catalog" },
  { id: "upgrades", label: "Upgrade paths" },
  { id: "drivetrain-data", label: "Drivetrain data" },
  { id: "saved", label: "Saved setup" },
] as const;

export type TransmissionNavSectionId = (typeof TRANSMISSION_NAV_SECTIONS)[number]["id"] | "products";
