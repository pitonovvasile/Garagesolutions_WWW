import type { MetricSource } from "../lib/metricProvenance";

export type TraceConfidence = "high" | "medium" | "low" | "n/a";

/** Traceable scalar for UI + engineering debug. */
export interface TracedScalar {
  value: number | null;
  display: string;
  source: MetricSource;
  simulated: boolean;
  formula: string;
  inputs: string;
  confidence: TraceConfidence;
  /** Short user-facing explanation (provenance / limits). */
  explanation: string;
}

export interface TracedText {
  value: string;
  source: MetricSource;
  simulated: boolean;
  formula: string;
  inputs: string;
  confidence: TraceConfidence;
  explanation: string;
}

export interface VehicleStaticSection {
  totalMassKg: TracedScalar;
  frontAxleLoadN: TracedScalar;
  rearAxleLoadN: TracedScalar;
  balanceBias: TracedText;
  architectureBehavior: TracedText;
  cornerWeights: TracedText;
}

export interface KinematicsTraceForAxle {
  axle: "front" | "rear";
  camberDeg: TracedScalar;
  camberGainDegPerMm: TracedScalar;
  camberGainClass: TracedText;
  springLengthMm: TracedScalar;
  damperLengthMm: TracedScalar;
  mrSpring: TracedScalar;
  mrDamper: TracedScalar;
  wheelRateNmm: TracedScalar;
  dampingAtWheelRel: TracedScalar;
  camberVsTravelChart: { travel: number; camber: number }[];
}

export interface SuspensionSetupSection {
  rideFreqHzFront: TracedScalar;
  rideFreqHzRear: TracedScalar;
  stiffnessInterpretation: TracedText;
  dampingBehavior: TracedText;
  rollStiffnessProxy: TracedText;
  springOnlyRollBalance: TracedScalar;
  camberBehavior: TracedText;
  toeBehavior: TracedText;
  casterBehavior: TracedText;
  bumpReboundNote: TracedText;
  antiRollBarNote: TracedText;
}

export interface DrivetrainSection {
  differentialBehavior: TracedText;
  lockEffect: TracedText;
  gearAggressiveness: TracedText;
  transmissionBehavior: TracedText;
  drivetrainBias: TracedText;
  tractionSummary: TracedText;
  powerDeliverySummary: TracedText;
}

export interface TiresSection {
  gripStyle: TracedText;
  slipAngleBehavior: TracedText;
  camberSensitivity: TracedText;
  staggerBalance: TracedText;
  widthAndSidewallNote: TracedText;
}

export interface AeroSection {
  frontAeroBalance: TracedScalar;
  pitchSensitivity: TracedText;
  stabilityModifiers: TracedText;
}

export interface SetupAssistantSection {
  understeerOversteer: TracedText;
  stability: TracedText;
  traction: TracedText;
  responsiveness: TracedText;
  compliance: TracedText;
  confidence: TracedText;
  tireWearRisk: TracedText;
  steeringResponse: TracedText;
  rotationTendency: TracedText;
  /** One-line bullets for compact UI. */
  summaryLines: string[];
}

export interface VehicleDynamicsReport {
  vehicle: VehicleStaticSection;
  kinematicsActive: KinematicsTraceForAxle;
  kinematicsFront: KinematicsTraceForAxle;
  kinematicsRear: KinematicsTraceForAxle;
  suspension: SuspensionSetupSection;
  drivetrain: DrivetrainSection;
  tires: TiresSection;
  aero: AeroSection;
  setupAssistant: SetupAssistantSection;
}
