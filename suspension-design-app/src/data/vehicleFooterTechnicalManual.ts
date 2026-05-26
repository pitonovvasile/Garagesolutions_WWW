/** Manual inputs for footer technical tri-panels (drivetrain / tires / aero). */

export const FOOTER_TRANSMISSION_TYPES = ["Sequential", "Manual", "Automatic", "DCT"] as const;

export const FOOTER_FINAL_DRIVE_OPTIONS = ["3.15", "3.23", "3.46", "3.62", "3.90", "4.10"] as const;

export const FOOTER_DIFFERENTIAL_OPTIONS = ["Open", "Limited Slip", "Welded"] as const;

export const FOOTER_LOCK_PCT_OPTIONS = ["20%", "40%", "60%", "80%"] as const;

export const FOOTER_PRELOAD_OPTIONS = ["20 Nm", "40 Nm", "60 Nm", "80 Nm", "100 Nm"] as const;

export const FOOTER_TIRE_TYPE_OPTIONS = ["Slick", "Semi Slick", "Street", "All Season"] as const;

export const FOOTER_TIRE_SIZE_OPTIONS = [
  "225 / 40 R18",
  "245 / 35 R18",
  "245 / 40 R18",
  "255 / 35 R18",
  "265 / 35 R18",
  "275 / 35 R18",
  "275 / 40 R18",
] as const;

export const FOOTER_WHEEL_WIDTH_OPTIONS = ["8.0J / 9.0J", "8.5J / 9.5J", "8.5J / 10.0J", "9.0J / 10.5J"] as const;

export const FOOTER_OFFSET_OPTIONS = ["ET25 / ET35", "ET30 / ET40", "ET35 / ET25", "ET40 / ET45"] as const;

export const FOOTER_STAGGER_OPTIONS = [
  "Square",
  "Staggered (Rear Wider)",
  "Staggered (Front Wider)",
] as const;

export type VehicleFooterDrivetrainManual = {
  transmissionType: string;
  gearRatio1: string;
  gearRatio2: string;
  gearRatio3: string;
  gearRatio4: string;
  gearRatio5: string;
  gearRatio6: string;
  finalDrive: string;
  differential: string;
  lockPercentage: string;
  preloadNm: string;
};

export type VehicleFooterTiresManual = {
  tireType: string;
  frontSize: string;
  rearSize: string;
  wheelWidthFr: string;
  offsetFr: string;
  setup: string;
  verticalStiffnessKnm: string;
  lateralStiffnessKndeg: string;
  camberStiffnessKndeg: string;
  optimalSlipAngleDeg: string;
};

export type VehicleFooterAeroManual = {
  frontDownforceN: string;
  rearDownforceN: string;
  totalDownforceN: string;
  aeroBalancePct: string;
  rideHeightSensPctPerMm: string;
};

export const DEFAULT_VEHICLE_FOOTER_DRIVETRAIN_MANUAL: VehicleFooterDrivetrainManual = {
  transmissionType: "Sequential",
  gearRatio1: "2.92",
  gearRatio2: "2.10",
  gearRatio3: "1.61",
  gearRatio4: "1.28",
  gearRatio5: "1.05",
  gearRatio6: "0.87",
  finalDrive: "3.90",
  differential: "Limited Slip",
  lockPercentage: "60%",
  preloadNm: "80 Nm",
};

export const DEFAULT_VEHICLE_FOOTER_TIRES_MANUAL: VehicleFooterTiresManual = {
  tireType: "Semi Slick",
  frontSize: "245 / 40 R18",
  rearSize: "275 / 40 R18",
  wheelWidthFr: "8.5J / 10.0J",
  offsetFr: "ET35 / ET25",
  setup: "Staggered (Rear Wider)",
  verticalStiffnessKnm: "200",
  lateralStiffnessKndeg: "120",
  camberStiffnessKndeg: "-80",
  optimalSlipAngleDeg: "6.5",
};

export const DEFAULT_VEHICLE_FOOTER_AERO_MANUAL: VehicleFooterAeroManual = {
  frontDownforceN: "625",
  rearDownforceN: "625",
  totalDownforceN: "1250",
  aeroBalancePct: "50",
  rideHeightSensPctPerMm: "2.2",
};
