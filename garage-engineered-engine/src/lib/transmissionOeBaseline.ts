import type { SavedGarageCar } from "./garageStorage";

export type TransmissionOeBaseline = {
  transmissionType: string;
  gearCount: string;
  drivetrainLayout: string;
  drivetrainLabel: string;
  differentialType: string;
  differentialLabel: string;
};

function pickCar(car: SavedGarageCar | null, keys: string[]): string {
  if (!car) return "";
  const o = car as Record<string, unknown>;
  const extras =
    o.extras && typeof o.extras === "object" && !Array.isArray(o.extras)
      ? (o.extras as Record<string, unknown>)
      : {};
  const merged = { ...extras, ...o };
  for (const k of keys) {
    const v = merged[k];
    if (v != null && String(v).trim()) return String(v).trim();
  }
  return "";
}

export function buildTransmissionOeBaseline(car: SavedGarageCar | null): TransmissionOeBaseline {
  return {
    transmissionType: pickCar(car, [
      "configuration_transmission_type",
      "catalogTransmissionType",
      "transmission_type",
      "variant_transmission_type",
    ]),
    gearCount: pickCar(car, ["configuration_gear_count", "catalogGearCount", "gear_count", "variant_gear_count"]),
    drivetrainLayout: pickCar(car, [
      "configuration_drivetrain_layout",
      "catalogDrivetrainLayout",
      "drivetrain_layout",
      "variant_drivetrain_layout",
    ]),
    drivetrainLabel: pickCar(car, [
      "configuration_drivetrain_label",
      "catalogDrivetrainLabel",
      "drivetrain_label",
      "variant_drivetrain_label",
    ]),
    differentialType: pickCar(car, ["differential_type", "catalogDifferentialType"]),
    differentialLabel: pickCar(car, ["differential_label", "catalogDifferentialLabel"]),
  };
}

export function formatTransmissionType(baseline: TransmissionOeBaseline): string {
  const type = baseline.transmissionType || "—";
  const gears = baseline.gearCount ? `${baseline.gearCount}-speed` : "";
  return gears ? `${type} · ${gears}` : type;
}

export function formatDrivetrain(baseline: TransmissionOeBaseline): string {
  const layout = baseline.drivetrainLayout;
  const label = baseline.drivetrainLabel;
  if (layout && label) return `${layout} · ${label}`;
  return layout || label || "—";
}
