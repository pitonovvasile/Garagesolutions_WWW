import type { SavedGarageCar } from "./garageStorage";
import { recordFromCar } from "./performanceSpecRow";

export type DrivetrainLayoutClass = "awd" | "fourByFour" | "rwd" | "fwd" | "unknown";
export type TransmissionClass = "manual" | "automatic" | "dct" | "cvt" | "unknown";
export type DifferentialClass = "open" | "lsd" | "locking" | "electronic" | "unknown";
export type FitmentMode = "Garage-linked" | "Generic catalog" | "Partial data";

export type TransmissionDrivetrainProfile = {
  vehicleLabel: string;
  transmissionType: string;
  gearCount: string;
  transmissionClass: TransmissionClass;
  drivetrainType: string;
  drivetrainLayoutClass: DrivetrainLayoutClass;
  transferCaseStatus: string;
  hasTransferCase: boolean;
  frontDifferentialType: string;
  rearDifferentialType: string;
  centerDiffOrCoupling: string;
  hasCenterDiffOrCoupling: boolean;
  hasElectronicCoupling: boolean;
  hasLockingDiff: boolean;
  differentialClass: DifferentialClass;
  fitmentMode: FitmentMode;
  isAwdFamily: boolean;
};

function pick(car: SavedGarageCar | null, keys: string[]): string {
  if (!car) return "";
  const o = recordFromCar(car);
  for (const k of keys) {
    const v = o[k];
    if (v != null && String(v).trim()) return String(v).trim();
  }
  return "";
}

function blob(car: SavedGarageCar | null): string {
  if (!car) return "";
  const o = recordFromCar(car);
  return [
    pick(car, ["configuration_transmission_type", "catalogTransmissionType", "transmission_type", "variant_transmission_type"]),
    pick(car, ["configuration_drivetrain_layout", "catalogDrivetrainLayout", "drivetrain_layout", "variant_drivetrain_layout"]),
    pick(car, ["configuration_drivetrain_label", "catalogDrivetrainLabel", "drivetrain_label", "variant_drivetrain_label"]),
    pick(car, ["differential_type", "catalogDifferentialType", "differential_label", "catalogDifferentialLabel"]),
    String(o.engine ?? ""),
    String(o.model ?? ""),
  ]
    .join(" ")
    .toLowerCase();
}

export function classifyTransmission(raw: string): TransmissionClass {
  const s = raw.toLowerCase();
  if (!s) return "unknown";
  if (/cvt|continuously variable/.test(s)) return "cvt";
  if (/dct|dual clutch|dsg|pdk|s-tronic|steptronic sport|smg|sequential/.test(s)) return "dct";
  if (/manual|getrag|6mt|5mt|6-speed manual|5-speed manual/.test(s)) return "manual";
  if (/auto|automatic|tiptronic|steptronic|zf8|8hp|9hp|torque converter|atf/.test(s)) return "automatic";
  return "unknown";
}

export function classifyDrivetrainLayout(layout: string, label: string): DrivetrainLayoutClass {
  const s = `${layout} ${label}`.toLowerCase();
  if (!s.trim()) return "unknown";
  if (/\b4x4\b|\b4wd\b|quattro|xdrive|4matic|4motion|all[-\s]?wheel|\bawd\b|integrale|4matic|4wd/.test(s)) {
    if (/\b4x4\b|\b4wd\b|quattro|integrale/.test(s)) return "fourByFour";
    return "awd";
  }
  if (/\bfwd\b|front[-\s]?wheel|transverse front/.test(s)) return "fwd";
  if (/\brwd\b|rear[-\s]?wheel|longitudinal rear/.test(s)) return "rwd";
  return "unknown";
}

export function classifyDifferential(raw: string): DifferentialClass {
  const s = raw.toLowerCase();
  if (!s) return "unknown";
  if (/electronic|e-diff|e diff|vectoring|haldex|coupling|clutch pack awd/.test(s)) return "electronic";
  if (/lock|locking|locker|arb/.test(s)) return "locking";
  if (/lsd|limited slip|ls diff|plate diff|torsen|quaife|peloquin/.test(s)) return "lsd";
  if (/open|standard|conventional/.test(s)) return "open";
  return "unknown";
}

function inferTransferCase(layoutClass: DrivetrainLayoutClass, text: string): { status: string; has: boolean } {
  if (layoutClass === "awd" || layoutClass === "fourByFour") {
    if (/haldex|electronic coupling|multi-plate|viscous|t-case|transfer case|transfer box/.test(text)) {
      return { status: "Present (AWD / 4x4 layout)", has: true };
    }
    return { status: "Present (inferred from AWD / 4x4)", has: true };
  }
  if (/transfer case|transfer box|t-case/.test(text)) {
    return { status: "Present", has: true };
  }
  return { status: "Not applicable / not detected", has: false };
}

function inferCenterCoupling(
  layoutClass: DrivetrainLayoutClass,
  text: string,
  diffClass: DifferentialClass,
): { label: string; has: boolean; electronic: boolean } {
  if (/haldex|electronic coupling|multi-plate clutch|viscous coupling|center diff|centre diff|center differential/.test(text)) {
    const electronic = /haldex|electronic|e-diff|vectoring|coupling/.test(text) || diffClass === "electronic";
    return {
      label: electronic ? "Electronic coupling / Haldex-type" : "Center differential / coupling",
      has: true,
      electronic,
    };
  }
  if (layoutClass === "awd" || layoutClass === "fourByFour") {
    return {
      label: "AWD coupling (layout inferred)",
      has: true,
      electronic: /xdrive|4matic|haldex|4motion/.test(text),
    };
  }
  return { label: "Not detected", has: false, electronic: false };
}

function inferAxleDiffs(
  layoutClass: DrivetrainLayoutClass,
  diffRaw: string,
  diffClass: DifferentialClass,
): { front: string; rear: string } {
  const base =
    diffRaw ||
    (diffClass === "unknown"
      ? "—"
      : diffClass === "open"
        ? "Open differential"
        : diffClass === "lsd"
          ? "Limited slip"
          : diffClass === "locking"
            ? "Locking differential"
            : "Electronic differential");

  switch (layoutClass) {
    case "fwd":
      return { front: base !== "—" ? base : "Integrated transaxle / open", rear: "Not driven" };
    case "rwd":
      return { front: "Not driven", rear: base !== "—" ? base : "Open / OEM" };
    case "awd":
    case "fourByFour":
      return {
        front: base !== "—" ? base : "Open / OEM (front axle)",
        rear: base !== "—" ? base : "Open / OEM (rear axle)",
      };
    default:
      return { front: "—", rear: base !== "—" ? base : "—" };
  }
}

export function buildTransmissionDrivetrainProfile(
  car: SavedGarageCar | null,
  vehicleLabel: string,
): TransmissionDrivetrainProfile {
  const transmissionType = pick(car, [
    "configuration_transmission_type",
    "catalogTransmissionType",
    "transmission_type",
    "variant_transmission_type",
  ]);
  const gearCount = pick(car, ["configuration_gear_count", "catalogGearCount", "gear_count", "variant_gear_count"]);
  const drivetrainLayout = pick(car, [
    "configuration_drivetrain_layout",
    "catalogDrivetrainLayout",
    "drivetrain_layout",
    "variant_drivetrain_layout",
  ]);
  const drivetrainLabel = pick(car, [
    "configuration_drivetrain_label",
    "catalogDrivetrainLabel",
    "drivetrain_label",
    "variant_drivetrain_label",
  ]);
  const diffRaw = pick(car, ["differential_label", "catalogDifferentialLabel", "differential_type", "catalogDifferentialType"]);
  const text = blob(car);

  const transmissionClass = classifyTransmission(transmissionType);
  const drivetrainLayoutClass = classifyDrivetrainLayout(drivetrainLayout, drivetrainLabel);
  const differentialClass = classifyDifferential(diffRaw || text);
  const isAwdFamily = drivetrainLayoutClass === "awd" || drivetrainLayoutClass === "fourByFour";

  const drivetrainType =
    drivetrainLabel ||
    drivetrainLayout ||
    (drivetrainLayoutClass === "awd"
      ? "AWD"
      : drivetrainLayoutClass === "fourByFour"
        ? "4x4 / 4WD"
        : drivetrainLayoutClass === "rwd"
          ? "RWD"
          : drivetrainLayoutClass === "fwd"
            ? "FWD"
            : "—");

  const transfer = inferTransferCase(drivetrainLayoutClass, text);
  const center = inferCenterCoupling(drivetrainLayoutClass, text, differentialClass);
  const axles = inferAxleDiffs(drivetrainLayoutClass, diffRaw, differentialClass);

  const hasData = Boolean(transmissionType || drivetrainLayout || drivetrainLabel || diffRaw);
  const fitmentMode: FitmentMode = !car
    ? "Generic catalog"
    : hasData
      ? "Garage-linked"
      : "Partial data";

  return {
    vehicleLabel: vehicleLabel || "No vehicle selected",
    transmissionType: transmissionType || "—",
    gearCount: gearCount || "—",
    transmissionClass,
    drivetrainType,
    drivetrainLayoutClass,
    transferCaseStatus: transfer.status,
    hasTransferCase: transfer.has,
    frontDifferentialType: axles.front,
    rearDifferentialType: axles.rear,
    centerDiffOrCoupling: center.label,
    hasCenterDiffOrCoupling: center.has,
    hasElectronicCoupling: center.electronic,
    hasLockingDiff: differentialClass === "locking" || /lock|locking/.test(text),
    differentialClass,
    fitmentMode,
    isAwdFamily,
  };
}

export function formatTransmissionDisplay(profile: TransmissionDrivetrainProfile): string {
  if (profile.transmissionType === "—") return "—";
  return profile.gearCount !== "—"
    ? `${profile.transmissionType} / ${profile.gearCount}-speed`
    : profile.transmissionType;
}

export function isManualTransmission(profile: TransmissionDrivetrainProfile): boolean {
  return profile.transmissionClass === "manual";
}

export function isAutomaticTransmission(profile: TransmissionDrivetrainProfile): boolean {
  return profile.transmissionClass === "automatic" || profile.transmissionClass === "cvt";
}

export function isDctTransmission(profile: TransmissionDrivetrainProfile): boolean {
  return profile.transmissionClass === "dct";
}
