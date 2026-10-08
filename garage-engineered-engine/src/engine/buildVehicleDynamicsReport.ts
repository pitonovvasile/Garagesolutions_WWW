import { getVehicle } from "../data/vehicles";
import { getVehicleStockSuspensionDoc } from "../data/vehicleStockSuspension";
import { analyzeAxle } from "../lib/vehicleKinematics";
import { getAxlePreset } from "../lib/vehicleKinematics";
import { computeAeroSection } from "./layerAero";
import { computeDrivetrainSection } from "./layerDrivetrain";
import { buildKinematicsTraceForAxle, liveForAxle } from "./layerGeometryKinematics";
import { synthesizeSetupAssistant } from "./layerSetupAssistant";
import { computeSuspensionSetupSection } from "./layerSuspensionSetup";
import { computeTiresSection } from "./layerTires";
import { computeVehicleStaticSection } from "./layerVehicleStatic";
import {
  parseUnsprungPairKg,
  parseWeightDistributionFr,
  totalMassKgFromManual,
} from "./manualParsers";
import type { VehiclePointMap } from "../lib/vehicleTypes";
import type { VehicleArchitectureManual } from "../data/vehicleArchitectureManual";
import type { VehicleDimensionsManual, VehicleMassManual } from "../data/vehicleDimensionsMassManual";
import type {
  VehicleFooterAeroManual,
  VehicleFooterDrivetrainManual,
  VehicleFooterTiresManual,
} from "../data/vehicleFooterTechnicalManual";
import type { AntiRollBarMode, AntiRollBarStiffness } from "../data/antiRollBar";
import type { VehicleDynamicsReport } from "./vehicleDynamicsTypes";

export interface VehicleDynamicsStateSnapshot {
  vehicleId: string;
  axle: "front" | "rear";
  pointsFront: VehiclePointMap;
  pointsRear: VehiclePointMap;
  travelMm: number;
  springRateNmm: number;
  damperLinearDampingCoeff: number;
  damperDigressive: boolean;
  vehicleArchitectureManual: VehicleArchitectureManual;
  vehicleDimensionsManual: VehicleDimensionsManual;
  vehicleMassManual: VehicleMassManual;
  vehicleFooterDrivetrainManual: VehicleFooterDrivetrainManual;
  vehicleFooterTiresManual: VehicleFooterTiresManual;
  vehicleFooterAeroManual: VehicleFooterAeroManual;
  antiRollBarFrontMode: AntiRollBarMode;
  antiRollBarRearMode: AntiRollBarMode;
  antiRollBarFrontBrand: string | null;
  antiRollBarRearBrand: string | null;
  antiRollBarFrontStiffness: AntiRollBarStiffness | null;
  antiRollBarRearStiffness: AntiRollBarStiffness | null;
}

/**
 * Deterministic layered report: vehicle manuals → geometry kinematics →
 * simplified suspension / drivetrain / tire / aero interpretations → setup assistant synthesis.
 */
export function buildVehicleDynamicsReport(s: VehicleDynamicsStateSnapshot): VehicleDynamicsReport {
  void s.vehicleDimensionsManual;
  const vehicle = getVehicle(s.vehicleId);
  const stock = getVehicleStockSuspensionDoc(s.vehicleId);

  const vStatic = computeVehicleStaticSection(s.vehicleArchitectureManual, s.vehicleMassManual);

  const presetF = getAxlePreset(vehicle, "front");
  const presetR = getAxlePreset(vehicle, "rear");
  const liveF = liveForAxle(s.pointsFront, s.travelMm);
  const liveR = liveForAxle(s.pointsRear, s.travelMm);

  const kinTraceF = buildKinematicsTraceForAxle(
    "front",
    s.pointsFront,
    liveF,
    presetF,
    s.springRateNmm,
    s.damperLinearDampingCoeff,
    s.travelMm,
  );
  const kinTraceR = buildKinematicsTraceForAxle(
    "rear",
    s.pointsRear,
    liveR,
    presetR,
    s.springRateNmm,
    s.damperLinearDampingCoeff,
    s.travelMm,
  );

  const kinFAnalysis = analyzeAxle(
    s.pointsFront,
    liveF,
    presetF,
    s.springRateNmm,
    s.damperLinearDampingCoeff,
    s.travelMm,
  );
  const kinRAnalysis = analyzeAxle(
    s.pointsRear,
    liveR,
    presetR,
    s.springRateNmm,
    s.damperLinearDampingCoeff,
    s.travelMm,
  );

  const dist = parseWeightDistributionFr(s.vehicleArchitectureManual.weightDistribution);
  const uns = parseUnsprungPairKg(s.vehicleMassManual.unsprungMassFrKg);
  const mKg = totalMassKgFromManual(s.vehicleMassManual);

  const activeTrace = s.axle === "front" ? kinTraceF : kinTraceR;
  const activeLiveCamber = activeTrace.camberDeg.value ?? 0;

  const susp = computeSuspensionSetupSection({
    springRateNmm: s.springRateNmm,
    damperLinearCoeff: s.damperLinearDampingCoeff,
    damperDigressive: s.damperDigressive,
    activeAxle: s.axle,
    liveCamberDeg: activeLiveCamber,
    kinFront: kinFAnalysis,
    kinRear: kinRAnalysis,
    vehicleMassKg: mKg,
    weightFrontFrac: dist?.front ?? null,
    weightRearFrac: dist?.rear ?? null,
    unsprungFrontKg: uns.front,
    unsprungRearKg: uns.rear,
    stock,
    antiRollBarFrontMode: s.antiRollBarFrontMode,
    antiRollBarRearMode: s.antiRollBarRearMode,
    antiRollBarFrontBrand: s.antiRollBarFrontBrand,
    antiRollBarRearBrand: s.antiRollBarRearBrand,
    antiRollBarFrontStiffness: s.antiRollBarFrontStiffness,
    antiRollBarRearStiffness: s.antiRollBarRearStiffness,
  });

  const drivetrain = computeDrivetrainSection(
    s.vehicleFooterDrivetrainManual,
    s.vehicleArchitectureManual,
  );
  const tires = computeTiresSection(s.vehicleFooterTiresManual);
  const aero = computeAeroSection(s.vehicleFooterAeroManual);

  const setupAssistant = synthesizeSetupAssistant({
    arch: s.vehicleArchitectureManual,
    rollFrontFrac: susp.springOnlyRollBalance.value,
    liveCamberDeg: activeLiveCamber,
    differential: s.vehicleFooterDrivetrainManual.differential,
    tireType: s.vehicleFooterTiresManual.tireType,
    aeroFrontBal: aero.frontAeroBalance.value,
    springRateNmm: s.springRateNmm,
    damperCoeff: s.damperLinearDampingCoeff,
  });

  return {
    vehicle: vStatic,
    kinematicsActive: activeTrace,
    kinematicsFront: kinTraceF,
    kinematicsRear: kinTraceR,
    suspension: susp,
    drivetrain,
    tires,
    aero,
    setupAssistant,
  };
}
