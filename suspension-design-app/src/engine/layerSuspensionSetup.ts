import {
  type AntiRollBarMode,
  type AntiRollBarStiffness,
  axleHasFactoryAntiRollBar,
  formatAntiRollBarSessionSummary,
} from "../data/antiRollBar";
import type { VehicleStockSuspensionDoc } from "../data/vehicleStockSuspension";
import type { VehicleAnalysis } from "../lib/vehicleKinematics";
import type { SuspensionSetupSection, TracedScalar, TracedText } from "./vehicleDynamicsTypes";

const TWO_PI = Math.PI * 2;

function rideFreqHz(wheelRateNmm: number, sprungMassKg: number | null): number | null {
  if (sprungMassKg == null || sprungMassKg <= 0 || wheelRateNmm <= 0) return null;
  const kNPerM = wheelRateNmm * 1000;
  const omega = Math.sqrt(kNPerM / sprungMassKg);
  return omega / TWO_PI;
}

function sprungAxleKg(
  totalKg: number | null,
  axleFrac: number | null,
  unsprungKg: number | null,
): { kg: number | null; confidence: "high" | "medium" | "low" | "n/a" } {
  if (totalKg == null || axleFrac == null) return { kg: null, confidence: "n/a" };
  if (unsprungKg != null) {
    const kg = Math.max(30, totalKg * axleFrac - unsprungKg);
    return { kg, confidence: "medium" };
  }
  const kg = Math.max(30, totalKg * axleFrac * 0.88);
  return { kg, confidence: "low" };
}

function camberInterpretation(deg: number): string {
  const a = Math.abs(deg);
  const sign = deg < -0.25 ? "negative" : deg > 0.25 ? "positive" : "near-neutral";
  let mag = "mild";
  if (a > 5) mag = "extreme";
  else if (a > 3) mag = "aggressive";
  else if (a > 1.2) mag = "moderate";
  else if (a > 0.35) mag = "mild";
  else mag = "very mild";
  const beh =
    sign === "negative"
      ? "More negative camber tends to support cornering contact; excessive negative hurts straight-line patch and can increase inner wear."
      : sign === "positive"
        ? "Positive camber reduces lateral bite — unusual for performance setups."
        : "Near-zero camber is street-friendly and drag-friendly but offers less lateral support.";
  return `${sign} (${mag} |${deg.toFixed(2)}°|): ${beh}`;
}

function toeInterpretationFront(minutes: number | null): TracedText {
  if (minutes == null) {
    return {
      value: "—",
      source: "placeholder",
      simulated: false,
      formula: "n/a",
      inputs: "no OEM toe mid in stock profile",
      confidence: "n/a",
      explanation: "Toe nu este simulat dinamic — lipsește valoare OEM declarată pentru față.",
    };
  }
  const out = minutes > 0;
  const v = out
    ? "Front toe-out tends to sharpen turn-in at the cost of straight-line stability."
    : "Front toe-in tends to improve straight-line stability and can slow turn-in.";
  return {
    value: v,
    source: "declared",
    simulated: false,
    formula: "OEM typical toe total (minutes) → qualitative behavior rules",
    inputs: `toeTotalMinutesMid=${minutes}`,
    confidence: "low",
    explanation: "Interpretare euristică pe baza valorii OEM tipice — nu solver toe live.",
  };
}

function toeInterpretationRear(minutes: number | null): TracedText {
  if (minutes == null) {
    return {
      value: "—",
      source: "placeholder",
      simulated: false,
      formula: "n/a",
      inputs: "no OEM toe mid in stock profile",
      confidence: "n/a",
      explanation: "Toe spate: fără valoare OEM declarată în profil.",
    };
  }
  const inToe = minutes > 0;
  const v = inToe
    ? "Rear toe-in often feels more stable under traction."
    : "Rear toe-out can add rotation but may feel nervous if excessive.";
  return {
    value: v,
    source: "declared",
    simulated: false,
    formula: "OEM typical toe total (minutes) → qualitative behavior rules",
    inputs: `toeTotalMinutesMid=${minutes}`,
    confidence: "low",
    explanation: "Interpretare calitativă — nu este simulare IRS bump-steer.",
  };
}

function casterInterpretation(deg: number | null): TracedText {
  if (deg == null) {
    return {
      value: "—",
      source: "placeholder",
      simulated: false,
      formula: "n/a",
      inputs: "no OEM caster mid",
      confidence: "n/a",
      explanation: "Caster nu este simulat dinamic — lipsește valoare OEM tipică.",
    };
  }
  const v =
    deg > 5.5
      ? "Higher positive caster improves self-centering and straight-line stability; too much can feel heavy and add jacking feel."
      : deg > 3
        ? "Moderate positive caster balances feedback and effort."
        : "Low caster reduces steering effort and self-centering versus strong positive caster.";
  return {
    value: v,
    source: "declared",
    simulated: false,
    formula: "OEM typical caster mid → qualitative rules",
    inputs: `casterDegMid=${deg}`,
    confidence: "low",
    explanation: "Nu există axă de direcție modelată — doar ghid din date declarate.",
  };
}

export function computeSuspensionSetupSection(input: {
  springRateNmm: number;
  damperLinearCoeff: number;
  damperDigressive: boolean;
  activeAxle: "front" | "rear";
  liveCamberDeg: number;
  kinFront: VehicleAnalysis;
  kinRear: VehicleAnalysis;
  vehicleMassKg: number | null;
  weightFrontFrac: number | null;
  weightRearFrac: number | null;
  unsprungFrontKg: number | null;
  unsprungRearKg: number | null;
  stock: VehicleStockSuspensionDoc | null;
  antiRollBarFrontMode: AntiRollBarMode;
  antiRollBarRearMode: AntiRollBarMode;
  antiRollBarFrontBrand: string | null;
  antiRollBarRearBrand: string | null;
  antiRollBarFrontStiffness: AntiRollBarStiffness | null;
  antiRollBarRearStiffness: AntiRollBarStiffness | null;
}): SuspensionSetupSection {
  const sf = sprungAxleKg(input.vehicleMassKg, input.weightFrontFrac, input.unsprungFrontKg);
  const sr = sprungAxleKg(input.vehicleMassKg, input.weightRearFrac, input.unsprungRearKg);

  const fHz = rideFreqHz(input.kinFront.wheelRateNmm, sf.kg);
  const rHz = rideFreqHz(input.kinRear.wheelRateNmm, sr.kg);

  const rideFreqHzFront: TracedScalar = {
    value: fHz,
    display: fHz != null ? `${fHz.toFixed(2)} Hz` : "—",
    source: "estimated",
    simulated: false,
    formula: "(1/(2π)) * sqrt(wheelRateSpring / sprungMassFront)",
    inputs: `wheelRate=${input.kinFront.wheelRateNmm.toFixed(2)} N/mm, sprung≈${sf.kg?.toFixed(1) ?? "n/a"} kg`,
    confidence: sf.confidence === "low" ? "low" : "medium",
    explanation:
      "Ride frequency aproximativă din rigiditate la roată și masă suspendată estimată — fără model complet 7-DOF.",
  };

  const rideFreqHzRear: TracedScalar = {
    value: rHz,
    display: rHz != null ? `${rHz.toFixed(2)} Hz` : "—",
    source: "estimated",
    simulated: false,
    formula: "(1/(2π)) * sqrt(wheelRateSpring / sprungMassRear)",
    inputs: `wheelRate=${input.kinRear.wheelRateNmm.toFixed(2)} N/mm, sprung≈${sr.kg?.toFixed(1) ?? "n/a"} kg`,
    confidence: sr.confidence === "low" ? "low" : "medium",
    explanation: "Aceeași aproximare ca la față — resortul din sesiune e unic pentru ambele punți în UI.",
  };

  const avgHz = fHz != null && rHz != null ? (fHz + rHz) / 2 : fHz ?? rHz;
  const stiffnessInterpretation: TracedText = {
    value:
      avgHz == null
        ? "—"
        : avgHz < 1.35
          ? "Softer ride frequency band — more compliance, slower body control."
          : avgHz > 1.85
            ? "Firmer ride frequency band — quicker response, less compliance."
            : "Mid ride frequency band — balanced street/track feel in this coarse model.",
    source: "estimated",
    simulated: false,
    formula: "qualitative bands on estimated ride frequency",
    inputs: `fFront=${fHz?.toFixed(3) ?? "n/a"}, fRear=${rHz?.toFixed(3) ?? "n/a"}`,
    confidence: "low",
    explanation: "Interpretare pe frecvență verticală simplificată — nu include amortizare non-liniară.",
  };

  const dig = input.damperDigressive ? "Digressive valving flag: expect more high-speed damping capability vs linear label." : "";
  const dampingBehavior: TracedText = {
    value: [
      `Bump/rebound knobs are not separate inputs in this module — relative coeff=${input.damperLinearCoeff.toFixed(2)} scales MR² at wheel (indicator only).`,
      "More bump damping (conceptually) improves impact control but can feel harsh; more rebound slows extension and adds body control.",
      dig,
    ]
      .filter(Boolean)
      .join(" "),
    source: "estimated",
    simulated: false,
    formula: "n/a (qualitative damping setup guidance)",
    inputs: `damperLinearCoeff=${input.damperLinearCoeff}, digressive=${input.damperDigressive}`,
    confidence: "low",
    explanation: "Nu există curbe de forță amortizor — doar indicii de setup.",
  };

  const wf = input.kinFront.wheelRateNmm;
  const wr = input.kinRear.wheelRateNmm;
  const sum = wf + wr;
  const rollBal =
    sum > 0
      ? wf / sum
      : null;

  const springOnlyRollBalance: TracedScalar = {
    value: rollBal,
    display: rollBal != null ? `${(rollBal * 100).toFixed(1)}% front` : "—",
    source: "estimated",
    simulated: false,
    formula: "wheelRateFront / (wheelRateFront + wheelRateRear)",
    inputs: `wf=${wf.toFixed(2)}, wr=${wr.toFixed(2)}`,
    confidence: "low",
    explanation:
      "Proxy roll split din rigiditate la roată (resort) — bare stabilizatoare și geometrie roll center nu sunt modelate.",
  };

  const rollStiffnessProxy: TracedText = {
    value:
      "Roll moment distribution not fully simulated — spring-only split above omits ARB stiffness, bushing compliance, and track-width effects.",
    source: "estimated",
    simulated: false,
    formula: "n/a",
    inputs: `springOnlyRollBalance=${springOnlyRollBalance.display}`,
    confidence: "low",
    explanation: "Honest limit: ARB rates are not entered in this build.",
  };

  const arbEnd = input.activeAxle;
  const arbMode = arbEnd === "front" ? input.antiRollBarFrontMode : input.antiRollBarRearMode;
  const arbBrand = arbEnd === "front" ? input.antiRollBarFrontBrand : input.antiRollBarRearBrand;
  const arbStiffness =
    arbEnd === "front" ? input.antiRollBarFrontStiffness : input.antiRollBarRearStiffness;
  const arbBundle = input.stock ? (arbEnd === "front" ? input.stock.front : input.stock.rear) : null;
  const arbFactory = arbBundle ? axleHasFactoryAntiRollBar(arbBundle) : false;
  const arbSummary = formatAntiRollBarSessionSummary(
    arbFactory,
    arbMode,
    arbBrand,
    arbStiffness,
  );
  const antiRollBarNote: TracedText = {
    value:
      arbMode === "na"
        ? `Anti-roll bar: ${arbSummary} — fără contribuție ARB în simularea curentă.`
        : arbStiffness == null
          ? `Anti-roll bar (${arbSummary}) — rigiditatea (Low/Medium/High) nu este completată.`
          : `Anti-roll bar (${arbSummary}) — rigiditate declarată; roll balance rămâne proxy spring-only până la model ARB.`,
    source: "declared",
    simulated: false,
    formula: "session ARB stiffness tier (low | medium | high) — not yet in roll stiffness sum",
    inputs: `axle=${arbEnd}, factory=${arbFactory}, mode=${arbMode}, brand=${arbBrand ?? "—"}, stiffness=${arbStiffness ?? "—"}`,
    confidence:
      arbMode !== "na" && arbStiffness != null
        ? arbMode === "tuning" && !arbBrand
          ? "low"
          : "medium"
        : "low",
    explanation:
      "Low / Medium / High este introdus de utilizator; va alimenta distribuția de roll când stratul ARB este activ.",
  };

  const bumpReboundNote: TracedText = {
    value: "Bump and rebound click positions are not modeled as separate scalars in this session — use damper relative coeff + qualitative notes.",
    source: "placeholder",
    simulated: false,
    formula: "n/a",
    inputs: "n/a",
    confidence: "n/a",
    explanation: "UI nu expune încă bump/rebound ca intrări numerice distincte.",
  };

  const stockF = input.stock?.front.stockSuspension.typicalAlignment;
  const stockR = input.stock?.rear.stockSuspension.typicalAlignment;

  const toeF = toeInterpretationFront(stockF?.toeTotalMinutesMid ?? null);
  const toeR = toeInterpretationRear(stockR?.toeTotalMinutesMid ?? null);
  const toeBehavior: TracedText = {
    value: `Front: ${toeF.value} Rear: ${toeR.value}`,
    source: "estimated",
    simulated: false,
    formula: "combine declared OEM mids + heuristics",
    inputs: "stock typicalAlignment toe (minutes)",
    confidence: "low",
    explanation: "Toe curent live rămâne „not simulated” în panoul Kinematics.",
  };

  const casterF = casterInterpretation(stockF?.casterDegMid ?? null);
  const casterBehavior: TracedText = {
    value: `Front reference: ${casterF.value}`,
    source: casterF.source === "placeholder" ? "placeholder" : "declared",
    simulated: false,
    formula: casterF.formula,
    inputs: casterF.inputs,
    confidence: casterF.confidence,
    explanation: casterF.explanation,
  };

  const camberBehavior: TracedText = {
    value: camberInterpretation(input.liveCamberDeg),
    source: "estimated",
    simulated: false,
    formula: "rules on sign/magnitude of live model camber (active axle)",
    inputs: `liveCamberDeg=${input.liveCamberDeg.toFixed(3)}, activeAxle=${input.activeAxle}`,
    confidence: "low",
    explanation: "Strat interpretare peste camberul geometric derivat pentru axa activă.",
  };

  return {
    rideFreqHzFront,
    rideFreqHzRear,
    stiffnessInterpretation,
    dampingBehavior,
    rollStiffnessProxy,
    springOnlyRollBalance,
    camberBehavior,
    toeBehavior,
    casterBehavior,
    bumpReboundNote,
    antiRollBarNote,
  };
}
