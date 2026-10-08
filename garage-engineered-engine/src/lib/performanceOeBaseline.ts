import type { SavedGarageCar } from "./garageStorage";
import { parseHpFromText, parseNmFromText } from "./performanceCurveModel";
import { pickPerformanceSpecFields, recordFromCar } from "./performanceSpecRow";

export type PerformanceOeBaseline = {
  power: string;
  torque: string;
  weight: string;
  zeroTo100: string;
  drivetrainLoss: string;
  fuel: string;
  compressionRatio: string;
  redline: string;
  frontSuspension: string;
  rearSuspension: string;
};

function pick(row: Record<string, unknown> | null | undefined, keys: string[]): unknown {
  if (!row) return null;
  for (const k of keys) {
    const v = row[k];
    if (v != null && String(v).trim() !== "") return v;
  }
  return null;
}

function pickCar(car: SavedGarageCar | null, keys: string[]): unknown {
  if (!car) return null;
  const o = recordFromCar(car);
  for (const k of keys) {
    const v = o[k];
    if (v != null && String(v).trim() !== "") return v;
  }
  return null;
}

function num(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(",", ".").trim());
  return Number.isFinite(n) ? n : null;
}

function formatPower(row: Record<string, unknown> | null, car: SavedGarageCar | null): string {
  const pv = pick(row, ["power_value", "power_hp", "power_ps", "max_power_hp"]);
  const fromCar = pickCar(car, ["power_value", "powerCp", "power_cp", "powerHp", "power_hp", "powerValue", "catalogPowerValue"]);
  const fromEngine = car?.engine ? parseHpFromText(car.engine) : null;
  const raw = pv ?? fromCar ?? fromEngine;
  if (raw == null) return "—";

  const unitRaw = String(pick(row, ["power_unit"]) ?? pickCar(car, ["power_unit", "powerUnit", "catalogPowerUnit"]) ?? "hp")
    .trim()
    .toLowerCase();
  const unit =
    unitRaw === "cp" || unitRaw === "ps" || unitRaw === "hp" || unitRaw === "bhp"
      ? "hp"
      : unitRaw || "hp";
  const rpm = num(pick(row, ["power_rpm", "power_max_rpm", "max_power_rpm"]));
  const kw = num(pick(row, ["power_kw"]) ?? pickCar(car, ["power_kw", "powerKw", "catalogPowerKw"]));
  const n = num(raw);
  if (n == null) return String(raw).trim();

  const hpPart =
    rpm != null ? `${Math.round(n)} ${unit} @ ${Math.round(rpm)} rpm` : `${Math.round(n)} ${unit}`;
  if (kw != null) {
    const kwRounded = kw % 1 === 0 ? Math.round(kw) : Number(kw.toFixed(1));
    return `${hpPart} (${kwRounded} kW)`;
  }
  return hpPart;
}

function formatTorque(row: Record<string, unknown> | null, car: SavedGarageCar | null): string {
  const tv =
    pick(row, ["torque_nm", "max_torque_nm", "torque_max_nm", "torque_value", "max_torque"]) ??
    pickCar(car, ["torque_nm", "torqueNm", "maxTorqueNm", "catalogTorqueNm"]);
  const fromEngine = car?.engine ? parseNmFromText(car.engine) : null;
  const resolved = tv ?? fromEngine;
  const n = num(resolved);
  if (n == null) {
    if (resolved != null) return String(resolved).trim();
    return "—";
  }
  const rpm = num(
    pick(row, ["torque_rpm", "torque_max_rpm", "max_torque_rpm"]) ??
      pickCar(car, ["torque_rpm", "torqueRpm", "catalogTorqueRpm"]),
  );
  return rpm != null ? `${Math.round(n)} Nm @ ${Math.round(rpm)} rpm` : `${Math.round(n)} Nm`;
}

function formatWeight(row: Record<string, unknown> | null, car: SavedGarageCar | null): string {
  const fromRow = num(
    pick(row, ["curb_weight_kg", "curb_weight", "kerb_weight_kg", "weight_kg", "mass_curb_kg"]),
  );
  const fromCar = num(
    pickCar(car, ["curb_weight_kg", "curbWeightKg", "weightKg", "weight_kg", "catalogCurbWeightKg"]),
  );
  const n = fromRow ?? fromCar;
  return n != null ? `${Math.round(n)} kg` : "—";
}

function formatZeroTo100(row: Record<string, unknown> | null, car: SavedGarageCar | null): string {
  const n = num(
    pick(row, [
      "factory_0_100_s",
      "acceleration_0_100_s",
      "zero_to_100_s",
      "acceleration_0_100",
      "zero_to_100",
      "acceleration_0_100_sec",
    ]) ??
      pickCar(car, [
        "factory_0_100_s",
        "catalogFactory0100S",
        "zeroTo100",
        "acceleration0_100",
        "acceleration_0_100",
      ]),
  );
  return n != null ? `${n.toFixed(1)} s` : "—";
}

function drivetrainLayoutBlob(row: Record<string, unknown> | null, car: SavedGarageCar | null): string {
  const layout = String(
    pick(row, [
      "configuration_drivetrain_layout",
      "drivetrain_layout",
      "variant_drivetrain_layout",
    ]) ??
      pickCar(car, ["catalogDrivetrainLayout", "drivetrain_layout", "configuration_drivetrain_layout"]) ??
      "",
  );
  const label = String(
    pick(row, ["configuration_drivetrain_label", "drivetrain_label", "variant_drivetrain_label"]) ??
      pickCar(car, ["catalogDrivetrainLabel", "configuration_drivetrain_label"]) ??
      "",
  );
  return `${layout} ${label}`.trim();
}

function isAwdDrivetrain(blob: string): boolean {
  const s = blob.toLowerCase();
  return /\bawd\b|\b4wd\b|xdrive|4x4|all[-\s]?wheel|integrale|quattro/.test(s);
}

/** Fallback explicit: RWD/FWD 15%, AWD 20% — doar când DB nu are drivetrain_loss_pct. */
function defaultDrivetrainLossPct(row: Record<string, unknown> | null, car: SavedGarageCar | null): number {
  return isAwdDrivetrain(drivetrainLayoutBlob(row, car)) ? 20 : 15;
}

function formatDrivetrainLoss(row: Record<string, unknown> | null, car: SavedGarageCar | null): string {
  const fromDb = num(
    pick(row, ["drivetrain_loss_pct", "drivetrain_loss_percent", "drivetrain_loss", "transmission_loss_pct"]) ??
      pickCar(car, ["drivetrain_loss_pct", "drivetrainLossPct", "catalogDrivetrainLossPct"]),
  );
  const n = fromDb ?? defaultDrivetrainLossPct(row, car);
  return `${n % 1 === 0 ? Math.round(n) : n.toFixed(1)}%`;
}

function formatFuel(row: Record<string, unknown> | null, car: SavedGarageCar | null): string {
  const raw =
    pick(row, ["fuel_grade", "recommended_fuel", "fuel_recommendation", "fuel_octane"]) ??
    pick(row, ["fuel_type"]) ??
    pick(row, ["engine_type"]) ??
    pickCar(car, ["fuel_grade", "fuelGrade", "catalogFuelGrade", "fuel_type", "fuelType", "fuel", "engine_type"]);
  if (raw == null) return "—";
  const s = String(raw).trim();
  if (/^ron\s*\d+/i.test(s)) return s.toUpperCase().replace(/^ron/i, "RON");
  if (/^\d+$/.test(s)) return `RON ${s}`;
  return s;
}

function formatCompression(row: Record<string, unknown> | null, car: SavedGarageCar | null): string {
  const n = num(
    pick(row, ["compression_ratio", "compression", "compression_ratio_value"]) ??
      pickCar(car, ["compression_ratio", "compressionRatio", "catalogCompressionRatio"]),
  );
  if (n == null) return "—";
  return `${n.toFixed(1)} : 1`;
}

function formatRedline(row: Record<string, unknown> | null, car: SavedGarageCar | null): string {
  const n = num(
    pick(row, ["max_rpm", "redline_rpm", "rev_limit_rpm", "redline"]) ??
      pickCar(car, ["max_rpm", "maxRpm", "catalogMaxRpm"]),
  );
  return n != null ? `${Math.round(n)} rpm` : "—";
}

function formatSuspension(
  row: Record<string, unknown> | null,
  car: SavedGarageCar | null,
  side: "front" | "rear",
): string {
  const key = side === "front" ? "front_suspension_type" : "rear_suspension_type";
  const carKeys =
    side === "front"
      ? ["front_suspension_type", "bmwFrontSuspensionType"]
      : ["rear_suspension_type", "bmwRearSuspensionType"];
  const v = pick(row, [key]) ?? pickCar(car, carKeys);
  return v != null ? String(v).trim() : "—";
}

export function buildPerformanceOeBaseline(input: {
  car: SavedGarageCar | null;
  specRow: Record<string, unknown> | null;
}): PerformanceOeBaseline {
  const { car, specRow } = input;
  const row = specRow ? { ...pickPerformanceSpecFields(specRow), ...specRow } : null;

  return {
    power: formatPower(row, car),
    torque: formatTorque(row, car),
    weight: formatWeight(row, car),
    zeroTo100: formatZeroTo100(row, car),
    drivetrainLoss: formatDrivetrainLoss(row, car),
    fuel: formatFuel(row, car),
    compressionRatio: formatCompression(row, car),
    redline: formatRedline(row, car),
    frontSuspension: formatSuspension(row, car, "front"),
    rearSuspension: formatSuspension(row, car, "rear"),
  };
}
