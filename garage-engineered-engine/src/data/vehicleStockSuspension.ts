import type { AntiRollBarStiffness } from "./antiRollBar";

/**
 * OEM / stock suspension knowledge per vehicle, **front and rear kept separate**.
 * Used for validation, recommendations, and setup guidance — not merged into one axle.
 */

export interface TypicalAlignmentNumbers {
  /** Typical static camber (negative = negative camber). */
  camberDegMid: number;
  camberDegOemWindow?: readonly [number, number];
  toeTotalMinutesMid?: number;
  toeTotalMinutesOemWindow?: readonly [number, number];
  casterDegMid?: number;
}

export interface AxleStockSuspension {
  suspensionType: string;
  architecture: string;
  layoutNotes?: string;
  oemCamberAdjustmentMethod: string;
  casterBehavior: string;
  toeBehavior: string;
  stockRideCharacteristics: string;
  oemDesignIntent: string;
  limitations: string[];
  recommendedHardwareForMoreAdjustment: string[];
  typicalAlignment: TypicalAlignmentNumbers;
  /** Rear / IRS: bushing windup, diff reaction, subframe shift under load. */
  bushingComplianceNotes?: string;
  subframeBehavior?: string;
  diffMountNotes?: string;
  /** True when spring and damper are not colocated on one strut (e.g. E46 rear). */
  separateSpringDamper?: boolean;
  /** Mașina are bară stabilizatoare OEM pe această axă. */
  factoryAntiRollBar?: boolean;
  /** Rigiditate ARB OEM: low / medium / high — pentru preset Stock. */
  factoryAntiRollBarStiffness?: AntiRollBarStiffness;
}

export interface AxleAdjustmentLimits {
  /** Camber achievable with factory eccentrics / slots only (deg, [min, max] often negative band). */
  camberOemWithoutExtraHardwareDeg: readonly [number, number];
  /** With camber plates (front MP) or adjustable arms (rear ML). */
  camberWithHardwareExtendedDeg?: readonly [number, number];
  toeOemAdjustmentMinutes?: readonly [number, number];
  /** Beyond this |toe| total (minutes), adjustable links usually required. */
  rearToeBeyondOemLikelyNeedsArmsMinutes?: number;
  casterOemTypicalDeltaDeg?: readonly [number, number];
}

export interface AxleStockBundle {
  stockSuspension: AxleStockSuspension;
  adjustmentLimits: AxleAdjustmentLimits;
  notes: string[];
}

export interface VehicleStockSuspensionDoc {
  vehicleId: string;
  vehicleLabel: string;
  front: AxleStockBundle;
  rear: AxleStockBundle;
}

const E46_FRONT: AxleStockBundle = {
  stockSuspension: {
    suspensionType: "MacPherson strut (coilover path in sim)",
    architecture: "macpherson",
    factoryAntiRollBar: true,
    factoryAntiRollBarStiffness: "medium",
    layoutNotes: "Camber path: top mount vs wheel center; caster set mainly by LCA / strut axis.",
    oemCamberAdjustmentMethod:
      "Limited factory camber via strut-to-knuckle slot / eccentric (model-year dependent); small range only.",
    casterBehavior: "Mostly fixed by LCA inner pivots and strut angle; large caster changes need offset bushings or plates.",
    toeBehavior: "Tie-rod length sets toe; primary daily adjustment axis.",
    stockRideCharacteristics: "Compliance-forward for NVH; understeer bias at the limit.",
    oemDesignIntent: "Safe daily handling, predictable breakaway, tire life.",
    limitations: [
      "OEM front camber window is narrow vs track needs.",
      "Lowering without correction often makes camber more negative but not always controllable to target.",
    ],
    recommendedHardwareForMoreAdjustment: [
      "Adjustable camber plates or camber-correct top mounts for repeatable track camber.",
      "Offset/caster bushings if chasing drift caster without excessive static camber.",
    ],
    typicalAlignment: {
      camberDegMid: -1.0,
      camberDegOemWindow: [-0.6, -1.4],
      toeTotalMinutesMid: 2,
      toeTotalMinutesOemWindow: [0, 6],
      casterDegMid: 6.2,
    },
  },
  adjustmentLimits: {
    camberOemWithoutExtraHardwareDeg: [-0.5, -1.5],
    camberWithHardwareExtendedDeg: [-3.8, -0.3],
    toeOemAdjustmentMinutes: [-15, 18],
    casterOemTypicalDeltaDeg: [5.5, 7.2],
  },
  notes: [
    "Track / drift targets beyond ~−2.0° static often need plates or slotted mounts.",
    "If simulated camber exceeds OEM eccentric capability, treat as hardware-required.",
  ],
};

const E46_REAR: AxleStockBundle = {
  stockSuspension: {
    suspensionType: "Multi-link IRS",
    architecture: "multi_link",
    factoryAntiRollBar: true,
    factoryAntiRollBarStiffness: "low",
    layoutNotes: "Spring on trailing arm / chassis; damper often angled — separate spring vs damper travel.",
    oemCamberAdjustmentMethod: "Usually minimal factory camber change; shims or adjustable arms for meaningful camber.",
    casterBehavior: "Rear caster is not a primary consumer alignment axis on this layout.",
    toeBehavior: "Rear toe is highly sensitive; bushing deflection shows as toe change under drive/brake.",
    stockRideCharacteristics: "Rear steer compliance for comfort; toe stability depends on bush health.",
    oemDesignIntent: "Straight-line stability and tire wear; mild toe-in under load.",
    limitations: [
      "Stock rear camber/toe authority is limited without adjustable arms or shims.",
      "Worn RTAB / arm bushings dominate alignment drift.",
    ],
    recommendedHardwareForMoreAdjustment: [
      "Adjustable rear toe arms for precise track toe.",
      "Race shim kit or adjustable camber arms if camber windows are insufficient.",
    ],
    typicalAlignment: {
      camberDegMid: -1.35,
      camberDegOemWindow: [-1.0, -1.7],
      toeTotalMinutesMid: 4,
      toeTotalMinutesOemWindow: [0, 10],
    },
    bushingComplianceNotes: "Subframe and diff bushings allow small alignment shift under torque; align at settled ride height.",
    subframeBehavior: "Subframe is rubber-isolated; small toe/camber change possible under hard cornering until bushings are fresh.",
    diffMountNotes: "Diff mount bushings affect NVH and small rear geometry compliance under on/off throttle.",
    separateSpringDamper: true,
  },
  adjustmentLimits: {
    camberOemWithoutExtraHardwareDeg: [-1.0, -1.8],
    camberWithHardwareExtendedDeg: [-2.8, -0.8],
    toeOemAdjustmentMinutes: [-8, 14],
    rearToeBeyondOemLikelyNeedsArmsMinutes: 12,
  },
  notes: [
    "If you need more than ~±10′ total rear toe change from OEM center, plan adjustable toe links.",
    "Track rear camber past ~−2.0° usually needs hardware, not shims alone.",
  ],
};

function genericFrontMp(): AxleStockBundle {
  return {
    stockSuspension: {
      suspensionType: "MacPherson (template)",
      architecture: "macpherson",
      factoryAntiRollBar: true,
      factoryAntiRollBarStiffness: "medium",
      oemCamberAdjustmentMethod: "Template: eccentric / slot typical; confirm on real car.",
      casterBehavior: "Template: moderate caster sensitivity to ride height.",
      toeBehavior: "Tie-rod primary.",
      stockRideCharacteristics: "Template baseline.",
      oemDesignIntent: "Generalized OEM-like behavior.",
      limitations: ["Template is not VIN-specific — validate on rack."],
      recommendedHardwareForMoreAdjustment: ["Camber plates if MacPherson and track goals."],
      typicalAlignment: { camberDegMid: -1.0, camberDegOemWindow: [-0.5, -1.5], toeTotalMinutesMid: 3 },
    },
    adjustmentLimits: {
      camberOemWithoutExtraHardwareDeg: [-0.4, -1.6],
      camberWithHardwareExtendedDeg: [-3.5, -0.3],
      toeOemAdjustmentMinutes: [-12, 16],
    },
    notes: ["Replace with real vehicle data when VIN is known."],
  };
}

function genericRearMp(): AxleStockBundle {
  return {
    stockSuspension: {
      suspensionType: "MacPherson / twist-beam style (template rear)",
      architecture: "macpherson",
      factoryAntiRollBar: true,
      factoryAntiRollBarStiffness: "low",
      oemCamberAdjustmentMethod: "Often minimal rear camber authority on twist-beam; template illustrative.",
      casterBehavior: "N/A template",
      toeBehavior: "Often fixed or shim-only on economy layouts.",
      stockRideCharacteristics: "Template",
      oemDesignIntent: "Template",
      limitations: ["Rear template may not match your actual IRS / twist-beam."],
      recommendedHardwareForMoreAdjustment: ["Confirm adjustable hardware with alignment shop."],
      typicalAlignment: { camberDegMid: -0.8, camberDegOemWindow: [-0.3, -1.2], toeTotalMinutesMid: 2 },
    },
    adjustmentLimits: {
      camberOemWithoutExtraHardwareDeg: [-0.3, -1.3],
      camberWithHardwareExtendedDeg: [-2.0, -0.2],
      toeOemAdjustmentMinutes: [-6, 10],
      rearToeBeyondOemLikelyNeedsArmsMinutes: 8,
    },
    notes: [],
  };
}

function genericDwAxle(which: "front" | "rear"): AxleStockBundle {
  return {
    stockSuspension: {
      suspensionType: "Double wishbone (template)",
      architecture: "double_wishbone",
      factoryAntiRollBar: true,
      factoryAntiRollBarStiffness: "medium",
      oemCamberAdjustmentMethod: "Shims at upright / arm inner pivots (car-dependent).",
      casterBehavior: "Adjustable via shims or eccentric at upper/lower inner pivots (car-dependent).",
      toeBehavior: "Toe links or rack geometry — template.",
      stockRideCharacteristics: "Template: camber gain in bump tuned for grip + comfort.",
      oemDesignIntent: "Independent camber/caster/toe tuning planes (template).",
      limitations: ["Template — real car may use different link count and adjustment planes."],
      recommendedHardwareForMoreAdjustment: ["Track blocks: shim kits, adjustable upper/lower links."],
      typicalAlignment: {
        camberDegMid: which === "front" ? -1.1 : -1.2,
        camberDegOemWindow: [-0.7, -1.6],
        toeTotalMinutesMid: 3,
      },
    },
    adjustmentLimits: {
      camberOemWithoutExtraHardwareDeg: [-0.6, -1.7],
      camberWithHardwareExtendedDeg: [-3.2, -0.4],
      toeOemAdjustmentMinutes: [-10, 14],
    },
    notes: [],
  };
}

export const VEHICLE_STOCK_SUSPENSION: Record<string, VehicleStockSuspensionDoc> = {
  "bmw-e46": {
    vehicleId: "bmw-e46",
    vehicleLabel: "BMW E46",
    front: E46_FRONT,
    rear: E46_REAR,
  },
  "generic-dw": {
    vehicleId: "generic-dw",
    vehicleLabel: "Generic double wishbone",
    front: genericDwAxle("front"),
    rear: genericDwAxle("rear"),
  },
  "generic-mp": {
    vehicleId: "generic-mp",
    vehicleLabel: "Generic MacPherson",
    front: genericFrontMp(),
    rear: genericRearMp(),
  },
};

export function getVehicleStockSuspensionDoc(vehicleId: string): VehicleStockSuspensionDoc | null {
  return VEHICLE_STOCK_SUSPENSION[vehicleId] ?? null;
}
