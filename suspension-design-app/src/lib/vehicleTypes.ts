/** Side-view geometry in mm (x lateral, y vertical up), z unused (0). */
export type Vec2 = { x: number; y: number };

export type VehiclePointKey =
  | "control_arm_inner"
  | "control_arm_outer"
  | "upper_arm_inner"
  | "upper_arm_outer"
  | "top_mount"
  | "wheel_center"
  | "spring_mount_chassis"
  | "spring_mount_arm"
  | "damper_mount_chassis"
  | "damper_mount_arm";

export type VehiclePointMap = Partial<Record<VehiclePointKey, Vec2>>;

export type SuspensionArch = "double_wishbone" | "macpherson" | "multi_link";

export type LayoutType = "coilover" | "separate";

export interface AxlePreset {
  type: SuspensionArch;
  layout: LayoutType;
  /** Puncte folosite pentru camber lateral din geometria live (după bump): vector top → bottom în plan lateral. */
  camberTop: VehiclePointKey;
  camberBottom: VehiclePointKey;
  points: VehiclePointMap;
}

export interface VehicleDefinition {
  id: string;
  label: string;
  front: AxlePreset;
  rear: AxlePreset;
}

export const BUMP_TRANSLATE_KEYS: VehiclePointKey[] = [
  "wheel_center",
  "control_arm_outer",
  "upper_arm_outer",
  "spring_mount_arm",
  "damper_mount_arm",
];
