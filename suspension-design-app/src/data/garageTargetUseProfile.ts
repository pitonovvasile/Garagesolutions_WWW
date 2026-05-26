export type GarageTargetUseProfileId =
  | "street"
  | "track"
  | "rally"
  | "drift"
  | "drag"
  | "top_speed"
  | "dtm"
  | "show";

export type GarageTargetUseProfile = {
  id: GarageTargetUseProfileId;
  label: string;
};

export const GARAGE_TARGET_USE_PROFILES: GarageTargetUseProfile[] = [
  { id: "street", label: "Street" },
  { id: "track", label: "Track" },
  { id: "rally", label: "Rally" },
  { id: "drift", label: "Drift" },
  { id: "drag", label: "Drag" },
  { id: "top_speed", label: "Top Speed" },
  { id: "dtm", label: "DTM" },
  { id: "show", label: "Show" },
];
