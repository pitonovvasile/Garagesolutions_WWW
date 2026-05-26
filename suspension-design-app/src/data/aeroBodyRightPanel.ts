import type { AeroBodyComponentRow } from "./aeroBodyComponents";
import { AERO_BODY_MATERIALS, formatAeroBodySource } from "./aeroBodyComponents";

export type AeroRecommendationPriority = "high" | "medium" | "low";

export type AeroBodyRecommendation = {
  id: string;
  componentId: string;
  priority: AeroRecommendationPriority;
  title: string;
  detail: string;
};

export const AERO_BODY_MOUNTING: Record<string, string> = {
  hood: "Hood Pins",
  "front-bumper": "OEM Bolts",
  "front-splitter": "Bracket / Rod",
  "rear-bumper": "OEM Bolts",
  "rear-diffuser": "Undertray Mount",
  trunk: "OEM Hinges",
  spoiler: "Trunk / Deck Mount",
  "side-skirts": "Clip / Screw",
  "front-fenders": "OEM Bolts",
  "rear-fenders": "OEM Bolts",
  undertray: "Underbody Clips",
  widebody: "Widebody Hardware",
};

const RECOMMENDATIONS: AeroBodyRecommendation[] = [
  {
    id: "rec-splitter",
    componentId: "front-splitter",
    priority: "high",
    title: "Add front splitter (medium)",
    detail: "+35–60 N front downforce",
  },
  {
    id: "rec-diffuser",
    componentId: "rear-diffuser",
    priority: "high",
    title: "Add rear diffuser",
    detail: "+40–80 N rear downforce",
  },
  {
    id: "rec-brake-ducts",
    componentId: "front-fenders",
    priority: "medium",
    title: "Add brake ducts",
    detail: "Improve repeated braking stability",
  },
  {
    id: "rec-hood-vents",
    componentId: "hood",
    priority: "medium",
    title: "Add hood vents",
    detail: "Better engine bay heat extraction",
  },
  {
    id: "rec-skirts",
    componentId: "side-skirts",
    priority: "low",
    title: "Side skirts",
    detail: "Reduce side turbulence & improve stability",
  },
  {
    id: "rec-undertray",
    componentId: "undertray",
    priority: "medium",
    title: "Add undertray",
    detail: "Underbody flow & diffuser feed",
  },
  {
    id: "rec-spoiler",
    componentId: "spoiler",
    priority: "medium",
    title: "Add rear wing / spoiler",
    detail: "+25–50 N rear downforce",
  },
];

export function materialLabel(material: AeroBodyComponentRow["material"]): string {
  return AERO_BODY_MATERIALS.find((m) => m.id === material)?.label ?? "—";
}

export function formatComponentSourceDetail(row: AeroBodyComponentRow): string {
  if (row.installStatus === "missing") return "Missing";
  if (row.sourceKind === "user-input") return "User Input (Existing)";
  return formatAeroBodySource(row);
}

export function deriveComponentConfidence(row: AeroBodyComponentRow): "Catalog" | "Estimated" | null {
  if (row.installStatus === "missing") return null;
  if (row.sourceKind === "oem" || row.sourceKind === "brand") return "Catalog";
  return "Estimated";
}

export function formatInstallStatusLabel(row: AeroBodyComponentRow): string {
  if (row.upgradePlan === "planned") return "Planned";
  return row.installStatus === "installed" ? "Installed" : "Missing";
}

export function getActiveRecommendations(
  components: AeroBodyComponentRow[],
  limit = 5,
): AeroBodyRecommendation[] {
  const missingIds = new Set(
    components.filter((c) => c.installStatus === "missing" || c.upgradePlan === "planned").map((c) => c.id),
  );
  const priorityOrder: Record<AeroRecommendationPriority, number> = { high: 0, medium: 1, low: 2 };
  return RECOMMENDATIONS.filter((r) => missingIds.has(r.componentId))
    .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
    .slice(0, limit);
}

export function priorityLabel(p: AeroRecommendationPriority): string {
  return p === "high" ? "HIGH" : p === "medium" ? "MEDIUM" : "LOW";
}

export function priorityTone(p: AeroRecommendationPriority): string {
  if (p === "high") return "border-red-500/40 bg-red-500/15 text-red-300";
  if (p === "medium") return "border-amber-500/40 bg-amber-500/15 text-amber-200";
  return "border-cyan-500/40 bg-cyan-500/15 text-cyan-200";
}
