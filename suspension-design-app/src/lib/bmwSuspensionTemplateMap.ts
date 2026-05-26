function normArchLabel(s: string): string {
  return String(s || "")
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Mapează etichetele din `bmw_variant_configurations` la un `vehicleId` din simulare.
 * Simularea are un singur șablon pe ambele punți — alegem cel mai apropiat set cunoscut.
 */
export function mapBmwDbSuspensionToVehicleTemplateId(front: string, rear: string): string | null {
  const f = normArchLabel(front);
  const r = normArchLabel(rear);
  if (!f && !r) return null;

  const frontMp =
    f.includes("macpherson") || f.includes("strut") || /\bmp\b/.test(f) || f === "mac pherson";
  const frontDw =
    f.includes("wishbone") ||
    f.includes("double wishbone") ||
    f.includes("dw ") ||
    f.endsWith(" dw") ||
    f.includes("sla ") ||
    f.includes("short long arm");

  const rearMl =
    (r.includes("multi") && r.includes("link")) ||
    r.includes("multilink") ||
    r.includes("multi link");
  const rearMp = r.includes("macpherson") || r.includes("strut") || /\bbeam\b/.test(r);
  const rearDw = r.includes("wishbone") || r.includes("double wishbone");

  if (frontMp && (rearMl || !r)) return "bmw-e46";
  if (frontMp && rearMp) return "generic-mp";
  if (frontDw || rearDw) return "generic-dw";
  if (frontMp) return "generic-mp";

  return null;
}