import type { SuspensionGoalId } from "../data/suspensionCatalog";
import type { VehicleStockSuspensionDoc } from "../data/vehicleStockSuspension";
import type { ValidationMessage } from "./recommendationEngine";

function inRange(v: number, [a, b]: readonly [number, number]): boolean {
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  return v >= lo && v <= hi;
}

/** Compare user-measured camber (optional) vs OEM windows and optional preset target. */
export function validateAxleAgainstStockProfile(input: {
  axle: "front" | "rear";
  doc: VehicleStockSuspensionDoc;
  /** Camber after alignment / banc — user-entered; omit kinematic model here. */
  currentCamberDeg: number | null;
  /** Optional target from preset (negative = neg camber). */
  targetCamberDeg: number | null;
  hasCamberPlates: boolean;
  goal: SuspensionGoalId;
}): ValidationMessage[] {
  const msgs: ValidationMessage[] = [];
  const bundle = input.axle === "front" ? input.doc.front : input.doc.rear;
  const lim = bundle.adjustmentLimits;
  const oem = lim.camberOemWithoutExtraHardwareDeg;
  const ext = lim.camberWithHardwareExtendedDeg;

  const cur = input.currentCamberDeg;
  if (cur != null) {
    if (!inRange(cur, oem) && inRange(cur, ext ?? oem)) {
      msgs.push({
        level: "info",
        text:
          input.axle === "front"
            ? "Front camber is outside the narrow OEM-eccentric window but still plausible with camber plates / mounts."
            : "Rear camber is outside the typical OEM shim window — verify with adjustable arms or shims.",
      });
    }

    if (!inRange(cur, ext ?? oem)) {
      msgs.push({
        level: "warn",
        text: `${
          input.axle === "front" ? "Front" : "Rear"
        } declared current camber (${cur.toFixed(2)}°) exceeds the modeled OEM+hardware window — verify hardware or re-measure.`,
      });
    }
  }

  if (input.targetCamberDeg != null) {
    const t = input.targetCamberDeg;
    if (!inRange(t, oem) && (ext == null || !inRange(t, ext))) {
      msgs.push({
        level: "warn",
        text: `${
          input.axle === "front" ? "Front" : "Rear"
        } target camber (${t.toFixed(2)}°) exceeds modeled OEM adjustment capability — plan adjustable ${
          input.axle === "front" ? "plates / mounts" : "arms or shim stack"
        }.`,
      });
    }
    if (input.axle === "front" && input.goal !== "comfort" && input.goal !== "stance" && t < -2.2 && !input.hasCamberPlates) {
      msgs.push({
        level: "warn",
        text: "Front camber target is aggressive for MacPherson without camber plates — expect limited repeatability on OEM adjustment.",
      });
    }
  }

  if ((input.goal === "track" || input.goal === "drift") && input.axle === "rear") {
    msgs.push({
      level: "info",
      text: "Track / drift: confirm rear toe under power/brake on fresh bushings — stock rubber compliance can mask alignment errors.",
    });
  }

  return msgs;
}

export function stockHardwareRecommendationMessages(
  doc: VehicleStockSuspensionDoc,
  goal: SuspensionGoalId,
  hasCamberPlates: boolean,
): ValidationMessage[] {
  const out: ValidationMessage[] = [];
  const f = doc.front.stockSuspension;
  const r = doc.rear.stockSuspension;

  if ((goal === "track" || goal === "drift" || goal === "fast_road") && !hasCamberPlates && f.architecture === "macpherson") {
    out.push({
      level: "info",
      text: `Front (${f.suspensionType}): ${f.recommendedHardwareForMoreAdjustment[0] ?? "Consider camber hardware for repeatable camber."}`,
    });
  }

  if (goal === "track" || goal === "drift") {
    out.push({
      level: "info",
      text: `Rear (${r.suspensionType}): ${r.recommendedHardwareForMoreAdjustment[0] ?? "Consider adjustable rear links if chasing toe/camber windows."}`,
    });
  }

  if (r.separateSpringDamper) {
    out.push({
      level: "info",
      text: "Rear uses separate spring vs damper paths — validate bump/droop stroke independently when lowering.",
    });
  }

  return out;
}
