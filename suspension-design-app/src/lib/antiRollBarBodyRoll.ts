import type { AntiRollBarMode, AntiRollBarStiffness } from "../data/antiRollBar";

/** Unghi schematic de referință (°) — șasiu față de planul asfaltului în viraj. */
export function estimateBodyRollReferenceDeg(
  frontMode: AntiRollBarMode,
  rearMode: AntiRollBarMode,
  frontStiffness: AntiRollBarStiffness | null,
  rearStiffness: AntiRollBarStiffness | null,
): number {
  const BASE = 6.4;

  const tierDelta = (mode: AntiRollBarMode, stiffness: AntiRollBarStiffness | null): number => {
    if (mode === "na") return 0.15;
    if (mode === "stock") return -0.35;
    if (stiffness === "high") return -1.15;
    if (stiffness === "medium") return -0.55;
    if (stiffness === "low") return 0.45;
    return 0;
  };

  const raw =
    BASE + tierDelta(frontMode, frontStiffness) + tierDelta(rearMode, rearStiffness);
  return Math.round(Math.max(2.8, Math.min(8.8, raw)) * 10) / 10;
}
