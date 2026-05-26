/** Valori manuale — dimensiuni și mase (subpagina Vehicul). */

export type VehicleDimensionsManual = {
  wheelbaseMm: string;
  frontTrackMm: string;
  rearTrackMm: string;
  vehicleWidthMm: string;
  vehicleLengthMm: string;
};

export type VehicleMassManual = {
  curbWeightKg: string;
  fuelLiters: string;
  fuelMassKg: string;
  totalWeightKg: string;
  /** Ex. `62 / 68` — kg față / spate nesuspendat */
  unsprungMassFrKg: string;
};

export const DEFAULT_VEHICLE_DIMENSIONS_MANUAL: VehicleDimensionsManual = {
  wheelbaseMm: "2650",
  frontTrackMm: "1620",
  rearTrackMm: "1630",
  vehicleWidthMm: "1810",
  vehicleLengthMm: "4580",
};

export const DEFAULT_VEHICLE_MASS_MANUAL: VehicleMassManual = {
  curbWeightKg: "1350",
  fuelLiters: "50",
  fuelMassKg: "30",
  totalWeightKg: "1380",
  unsprungMassFrKg: "62 / 68",
};
