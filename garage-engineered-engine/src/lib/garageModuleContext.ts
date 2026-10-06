export type GarageModuleContextStatus = "connected" | "partial";

export type GarageModuleContextItem = {
  id: string;
  label: string;
  status: GarageModuleContextStatus;
};

/** Cross-module linkage status for the garage vehicle workspace. */
export function buildGarageModuleContextItems(hasLinkedCar: boolean): GarageModuleContextItem[] {
  const linked = hasLinkedCar ? ("connected" as const) : ("partial" as const);

  return [
    { id: "vehicle", label: "Vehicle Data", status: linked },
    { id: "suspension", label: "Suspension", status: linked },
    { id: "tires", label: "Tires & Wheels", status: linked },
    { id: "drivetrain", label: "Drivetrain", status: linked },
    { id: "performance", label: "Performance", status: linked },
    { id: "cooling", label: "Cooling", status: "partial" },
    { id: "brakes", label: "Brakes", status: "partial" },
  ];
}

export function garageModuleContextStatusLabel(status: GarageModuleContextStatus): string {
  return status === "connected" ? "Connected" : "Partial";
}
