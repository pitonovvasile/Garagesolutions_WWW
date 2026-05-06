import type { VehicleDefinition } from "../lib/vehicleTypes";

const c = (x: number, y: number) => ({ x, y });

/** Stock-style side-view presets (mm). Tunable baselines — not CAD data. */
export const VEHICLE_LIST: VehicleDefinition[] = [
  {
    id: "bmw-e46",
    label: "BMW E46",
    front: {
      type: "macpherson",
      layout: "coilover",
      camberTop: "top_mount",
      camberBottom: "wheel_center",
      points: {
        control_arm_inner: c(-205, 92),
        control_arm_outer: c(226, 86),
        top_mount: c(-38, 488),
        wheel_center: c(206, -128),
        spring_mount_chassis: c(-34, 462),
        spring_mount_arm: c(218, 98),
        damper_mount_chassis: c(-34, 462),
        damper_mount_arm: c(218, 98),
      },
    },
    rear: {
      type: "multi_link",
      layout: "separate",
      camberTop: "upper_arm_outer",
      camberBottom: "wheel_center",
      points: {
        upper_arm_inner: c(55, 298),
        upper_arm_outer: c(168, 248),
        control_arm_inner: c(-188, 98),
        control_arm_outer: c(208, 84),
        wheel_center: c(198, -122),
        spring_mount_chassis: c(-118, 252),
        spring_mount_arm: c(155, 208),
        damper_mount_chassis: c(28, 332),
        damper_mount_arm: c(192, 108),
      },
    },
  },
  {
    id: "bmw-m2",
    label: "BMW M2",
    front: {
      type: "double_wishbone",
      layout: "coilover",
      camberTop: "upper_arm_outer",
      camberBottom: "control_arm_outer",
      points: {
        upper_arm_inner: c(-108, 418),
        upper_arm_outer: c(178, 392),
        control_arm_inner: c(-198, 118),
        control_arm_outer: c(232, 90),
        wheel_center: c(218, -142),
        spring_mount_chassis: c(-78, 392),
        spring_mount_arm: c(198, 228),
        damper_mount_chassis: c(-78, 392),
        damper_mount_arm: c(198, 228),
      },
    },
    rear: {
      type: "multi_link",
      layout: "coilover",
      camberTop: "upper_arm_outer",
      camberBottom: "wheel_center",
      points: {
        upper_arm_inner: c(48, 288),
        upper_arm_outer: c(172, 232),
        control_arm_inner: c(-178, 102),
        control_arm_outer: c(202, 86),
        wheel_center: c(200, -128),
        spring_mount_chassis: c(-52, 318),
        spring_mount_arm: c(178, 198),
        damper_mount_chassis: c(-52, 318),
        damper_mount_arm: c(178, 198),
      },
    },
  },
  {
    id: "generic-dw",
    label: "Generic Double Wishbone",
    front: {
      type: "double_wishbone",
      layout: "coilover",
      camberTop: "upper_arm_outer",
      camberBottom: "control_arm_outer",
      points: {
        upper_arm_inner: c(-120, 420),
        upper_arm_outer: c(180, 380),
        control_arm_inner: c(-200, 120),
        control_arm_outer: c(220, 82),
        wheel_center: c(200, -180),
        spring_mount_chassis: c(-90, 380),
        spring_mount_arm: c(190, 200),
        damper_mount_chassis: c(-90, 380),
        damper_mount_arm: c(190, 200),
      },
    },
    rear: {
      type: "double_wishbone",
      layout: "coilover",
      camberTop: "upper_arm_outer",
      camberBottom: "control_arm_outer",
      points: {
        upper_arm_inner: c(-115, 400),
        upper_arm_outer: c(170, 365),
        control_arm_inner: c(-195, 115),
        control_arm_outer: c(210, 78),
        wheel_center: c(190, -175),
        spring_mount_chassis: c(-85, 360),
        spring_mount_arm: c(180, 195),
        damper_mount_chassis: c(-85, 360),
        damper_mount_arm: c(180, 195),
      },
    },
  },
  {
    id: "generic-mp",
    label: "Generic MacPherson",
    front: {
      type: "macpherson",
      layout: "coilover",
      camberTop: "top_mount",
      camberBottom: "wheel_center",
      points: {
        control_arm_inner: c(-200, 118),
        control_arm_outer: c(238, 88),
        top_mount: c(-42, 522),
        wheel_center: c(200, -160),
        spring_mount_chassis: c(-36, 488),
        spring_mount_arm: c(220, 102),
        damper_mount_chassis: c(-36, 488),
        damper_mount_arm: c(220, 102),
      },
    },
    rear: {
      type: "macpherson",
      layout: "coilover",
      camberTop: "top_mount",
      camberBottom: "wheel_center",
      points: {
        control_arm_inner: c(-195, 112),
        control_arm_outer: c(228, 82),
        top_mount: c(-38, 495),
        wheel_center: c(192, -150),
        spring_mount_chassis: c(-32, 468),
        spring_mount_arm: c(210, 96),
        damper_mount_chassis: c(-32, 468),
        damper_mount_arm: c(210, 96),
      },
    },
  },
];

export const GENERIC_ARCHETYPE_OPTIONS: { id: string; label: string }[] = [
  { id: "generic-dw", label: "Double Wishbone" },
  { id: "generic-mp", label: "MacPherson" },
];

export function isGenericVehicleId(id: string): boolean {
  return id === "generic-dw" || id === "generic-mp";
}

export const VEHICLES_BY_ID: Record<string, VehicleDefinition> = Object.fromEntries(
  VEHICLE_LIST.map((v) => [v.id, v]),
);

export const DEFAULT_VEHICLE_ID = "bmw-e46";

export function getVehicle(id: string): VehicleDefinition {
  return VEHICLES_BY_ID[id] ?? VEHICLE_LIST[0];
}

export function camberPlatesAllowed(arch: VehicleDefinition["front"]["type"]): boolean {
  return arch === "macpherson" || arch === "multi_link";
}
