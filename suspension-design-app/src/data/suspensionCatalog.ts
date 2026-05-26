import type { SuspensionArch } from "../lib/vehicleTypes";

export type SuspensionGoalId =
  | "street"
  | "track"
  | "drift"
  | "fast_road"
  | "comfort"
  | "stance"
  | "balanced";

export interface SuspensionProduct {
  id: string;
  category: "suspension";
  subcategory: "spring" | "damper" | "coilover" | "camber" | "bushing" | "alignment_kit" | "other";
  brand: string;
  name: string;
  price: number;
  /** Vehicle preset ids this row is marketed for (empty = universal). */
  fitmentVehicleIds: string[];
  /** Front / rear / both */
  fitmentAxle: "front" | "rear" | "both";
  /** Compatible suspension architectures */
  fitmentArch: SuspensionArch[];
  specs: string;
  installType: "bolt_on" | "shop_recommended" | "alignment_only";
  compatibleGoals: SuspensionGoalId[];
  recommendedUse: string;
  isPartOfKit?: boolean;
  /** Relative link to shop (site root from garage/suspension-design.html → ../) */
  shopHref?: string;
}

/** Empty — no bundled shop catalog; wire CMS / API when ready. */
export const SUSPENSION_PRODUCTS: SuspensionProduct[] = [];

export function getProductById(id: string): SuspensionProduct | undefined {
  return SUSPENSION_PRODUCTS.find((p) => p.id === id);
}
