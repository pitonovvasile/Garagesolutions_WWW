import aerodynamicsIcon from "../../../assets/garage-aerodynamics-body-icon.png";
import brakingIcon from "../../../assets/garage-braking-system-icon.png";
import performanceIcon from "../../../assets/garage-performance-icon.png";
import suspensionIcon from "../../../assets/garage-suspension-design-icon.png";
import transmissionIcon from "../../../assets/transmission-icon.png";

export type GarageCategoryId = "suspension" | "transmission" | "braking" | "aerodynamics" | "performance";

export type GarageCategoryAccent = "cyan" | "amber" | "rose" | "violet" | "orange";

export type GarageCategoryDef = {
  id: GarageCategoryId;
  label: string;
  shortLabel: string;
  subLabel?: string;
  href: string;
  icon: string;
  accent: GarageCategoryAccent;
};

export const GARAGE_CATEGORIES: GarageCategoryDef[] = [
  {
    id: "suspension",
    label: "Suspension design",
    shortLabel: "Suspension",
    subLabel: "Design",
    href: "suspension-design.html#work",
    icon: suspensionIcon,
    accent: "cyan",
  },
  {
    id: "transmission",
    label: "Transmission",
    shortLabel: "Transmission",
    href: "transmission.html",
    icon: transmissionIcon,
    accent: "violet",
  },
  {
    id: "braking",
    label: "Sistemul de frânare",
    shortLabel: "Frânare",
    href: "braking.html",
    icon: brakingIcon,
    accent: "rose",
  },
  {
    id: "aerodynamics",
    label: "Aerodynamics body",
    shortLabel: "Aerodynamics",
    href: "aerodynamics-body.html",
    icon: aerodynamicsIcon,
    accent: "orange",
  },
  {
    id: "performance",
    label: "Dinamics & Performance",
    shortLabel: "Dinamics",
    subLabel: "& Performance",
    href: "performance.html",
    icon: performanceIcon,
    accent: "amber",
  },
];

const CATEGORY_BY_ID = Object.fromEntries(GARAGE_CATEGORIES.map((c) => [c.id, c])) as Record<
  GarageCategoryId,
  GarageCategoryDef
>;

export function getGarageCategoryById(id: GarageCategoryId): GarageCategoryDef {
  return CATEGORY_BY_ID[id];
}

/** Categoria activă din URL (`garage/*.html`). */
export function getGarageCategoryFromPath(): GarageCategoryId {
  if (typeof window === "undefined") return "suspension";
  const path = window.location.pathname.replace(/\\/g, "/").toLowerCase();
  if (path.includes("performance.html") || path.endsWith("/performance")) return "performance";
  if (path.includes("transmission")) return "transmission";
  if (path.includes("braking")) return "braking";
  if (path.includes("aerodynamics")) return "aerodynamics";
  if (path.includes("suspension-design") || path.includes("suspension")) return "suspension";
  return "suspension";
}

/** Link relativ în același folder `garage/`, păstrează `?car=` când există. */
export function buildGarageCategoryUrl(category: GarageCategoryDef, carIndex: number | null): string {
  const hashIdx = category.href.indexOf("#");
  const pathPart = hashIdx >= 0 ? category.href.slice(0, hashIdx) : category.href;
  const hash = hashIdx >= 0 ? category.href.slice(hashIdx) : "";
  const url = new URL(pathPart, window.location.href);
  if (carIndex !== null && carIndex >= 0) {
    url.searchParams.set("car", String(carIndex));
  }
  return `${url.pathname}${url.search}${hash}`;
}

export function buildGarageHubUrl(carIndex: number | null): string {
  const url = new URL("../garage.html", window.location.href);
  if (carIndex !== null && carIndex >= 0) {
    url.searchParams.set("car", String(carIndex));
  }
  return `${url.pathname}${url.search}`;
}

export const ACCENT_RING: Record<GarageCategoryAccent, string> = {
  cyan: "ring-cyan-400/35 border-cyan-500/30",
  amber: "ring-amber-400/35 border-amber-500/30",
  rose: "ring-rose-400/35 border-rose-500/30",
  violet: "ring-violet-400/35 border-violet-500/30",
  orange: "ring-orange-400/35 border-orange-500/30",
};

export const ACCENT_TEXT: Record<GarageCategoryAccent, string> = {
  cyan: "text-cyan-400/90",
  amber: "text-amber-400/90",
  rose: "text-rose-400/90",
  violet: "text-violet-400/90",
  orange: "text-orange-400/90",
};

export const ACCENT_BG: Record<GarageCategoryAccent, string> = {
  cyan: "bg-cyan-500/15",
  amber: "bg-amber-500/15",
  rose: "bg-rose-500/15",
  violet: "bg-violet-500/15",
  orange: "bg-orange-500/15",
};
