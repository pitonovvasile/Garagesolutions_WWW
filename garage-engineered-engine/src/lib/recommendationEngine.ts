import type { SuspensionProduct, SuspensionGoalId } from "../data/suspensionCatalog";
import { SUSPENSION_PRODUCTS, getProductById } from "../data/suspensionCatalog";
import type { VehicleDefinition } from "../lib/vehicleTypes";
import { isOwnedOrInCart } from "./siteCart";

export function archForAxle(vehicle: VehicleDefinition, axle: "front" | "rear") {
  return axle === "front" ? vehicle.front.type : vehicle.rear.type;
}

export function isCompatibleWithCar(
  part: SuspensionProduct,
  vehicleId: string,
  axle: "front" | "rear",
  vehicle: VehicleDefinition,
): boolean {
  const arch = archForAxle(vehicle, axle);
  if (!part.fitmentArch.includes(arch)) return false;
  if (part.fitmentAxle !== "both" && part.fitmentAxle !== axle) return false;
  if (part.fitmentVehicleIds.length > 0 && !part.fitmentVehicleIds.includes(vehicleId)) {
    return false;
  }
  return true;
}

export function isCompatibleWithGoal(part: SuspensionProduct, goal: SuspensionGoalId): boolean {
  return part.compatibleGoals.includes(goal);
}

export function isOwnedOrInCartPart(part: SuspensionProduct): boolean {
  return isOwnedOrInCart(part.id);
}

export function getRecommendedPartsForSetup(
  vehicleId: string,
  axle: "front" | "rear",
  goal: SuspensionGoalId,
  vehicle: VehicleDefinition,
  preferredCatalogIds: string[],
): SuspensionProduct[] {
  const merged = [...new Set([...preferredCatalogIds])];
  const out: SuspensionProduct[] = [];
  for (const id of merged) {
    const p = getProductById(id);
    if (!p) continue;
    if (!isCompatibleWithCar(p, vehicleId, axle, vehicle)) continue;
    if (!isCompatibleWithGoal(p, goal)) continue;
    out.push(p);
  }
  for (const p of SUSPENSION_PRODUCTS) {
    if (out.some((x) => x.id === p.id)) continue;
    if (!isCompatibleWithCar(p, vehicleId, axle, vehicle)) continue;
    if (!isCompatibleWithGoal(p, goal)) continue;
    out.push(p);
  }
  return out.slice(0, 8);
}

export interface ValidationMessage {
  level: "info" | "warn" | "block";
  text: string;
}

export function validateAssistantSetup(input: {
  vehicle: VehicleDefinition;
  vehicleId: string;
  axle: "front" | "rear";
  goal: SuspensionGoalId;
  springRateNmm: number;
  damperDigressive: boolean;
  hasCamberPlate: boolean;
  catalogIdsInBuild: string[];
}): ValidationMessage[] {
  const msgs: ValidationMessage[] = [];
  const arch = archForAxle(input.vehicle, input.axle);

  if (input.goal === "comfort" && input.springRateNmm >= 48) {
    msgs.push({ level: "warn", text: "These springs are on the stiff side for a comfort-first setup." });
  }
  if (input.goal === "street" && input.springRateNmm >= 50) {
    msgs.push({
      level: "warn",
      text: "Very stiff springs for pure street use — expect NVH and less bump absorption.",
    });
  }
  if (input.goal === "stance" && input.springRateNmm < 44) {
    msgs.push({
      level: "info",
      text: "Stance goals usually pair with coilovers for height authority — verify bump travel at your ride height.",
    });
  }
  if ((input.goal === "track" || input.goal === "drift") && !input.hasCamberPlate && arch === "macpherson") {
    msgs.push({
      level: "warn",
      text: "This setup may need camber adjustment hardware (plates or adjustable top mounts) for repeatable front grip.",
    });
  }
  if ((input.goal === "track" || input.goal === "drift") && !input.damperDigressive) {
    msgs.push({
      level: "info",
      text: "Track / drift bias often uses digressive or adjustable dampers — verify your real damper curve vs this scalar model.",
    });
  }

  const hasAlignmentKit = input.catalogIdsInBuild.some((id) => {
    const p = getProductById(id);
    return p?.subcategory === "alignment_kit";
  });
  if (
    (input.goal === "track" || input.goal === "fast_road") &&
    input.vehicle.rear.type === "multi_link" &&
    !hasAlignmentKit
  ) {
    msgs.push({
      level: "info",
      text: "Multi-link rear often benefits from a race alignment shim kit for fine toe/camber windows.",
    });
  }

  for (const id of input.catalogIdsInBuild) {
    const p = getProductById(id);
    if (!p) continue;
    if (!isCompatibleWithCar(p, input.vehicleId, input.axle, input.vehicle)) {
      msgs.push({ level: "block", text: `${p.name} is not compatible with this chassis / axle selection.` });
    }
    if (!isCompatibleWithGoal(p, input.goal)) {
      msgs.push({
        level: "warn",
        text: `${p.name} is a weak match for the selected goal — double-check before buying.`,
      });
    }
  }

  return msgs;
}
