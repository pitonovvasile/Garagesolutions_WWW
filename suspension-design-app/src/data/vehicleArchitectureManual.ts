/** Valori manuale — arhitectură vehicul (subpagina Vehicul). */

export type VehicleArchitectureManual = {
  layout: string;
  drivetrain: string;
  enginePosition: string;
  /** Ex: `52 / 48` */
  weightDistribution: string;
  /** Înălțime CG în mm (doar număr în câmp; sufix „mm” în UI). */
  cgHeightMm: string;
};

export const VEHICLE_ARCHITECTURE_LAYOUT_OPTIONS = ["Front Engine", "Mid Engine", "Rear Engine"] as const;

export const VEHICLE_ARCHITECTURE_DRIVETRAIN_OPTIONS = ["RWD", "FWD", "AWD", "4WD"] as const;

export const VEHICLE_ARCHITECTURE_ENGINE_POSITION_OPTIONS = [
  "Front Longitudinal",
  "Front Transverse",
  "Mid Longitudinal",
  "Mid Transverse",
  "Rear Longitudinal",
  "Rear Transverse",
] as const;

export const DEFAULT_VEHICLE_ARCHITECTURE_MANUAL: VehicleArchitectureManual = {
  layout: "Front Engine",
  drivetrain: "RWD",
  enginePosition: "Front Longitudinal",
  weightDistribution: "52 / 48",
  cgHeightMm: "520",
};
