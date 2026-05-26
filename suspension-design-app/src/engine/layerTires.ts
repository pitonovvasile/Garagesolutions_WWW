import type { VehicleFooterTiresManual } from "../data/vehicleFooterTechnicalManual";
import type { TiresSection, TracedText } from "./vehicleDynamicsTypes";

function tireTypeGrip(t: string): string {
  const x = t.toLowerCase();
  if (x.includes("slick") && !x.includes("semi")) return "Slick: highest grip potential, narrowest setup window, high camber sensitivity.";
  if (x.includes("semi")) return "Semi-slick: sharp response, higher peak grip than street, more camber and heat sensitivity.";
  if (x.includes("street")) return "Street radial: forgiving slip curve, lower peak grip, wider operating window.";
  if (x.includes("all")) return "All-season: broader temperature window, lower ultimate grip vs summer performance tires.";
  return "Tire type: interpret manually from selection.";
}

function staggerText(setup: string): string {
  const x = setup.toLowerCase();
  if (x.includes("square")) return "Square setup: balanced end-to-end, easier to rotate balance with symmetric changes.";
  if (x.includes("rear wider")) return "Rear wider: more rear mechanical grip and stability; can reduce willingness to rotate.";
  if (x.includes("front wider")) return "Front wider: sharper front grip; can destabilize balance if rear cannot match.";
  return "Stagger: use manual selection as context.";
}

export function computeTiresSection(t: VehicleFooterTiresManual): TiresSection {
  const gripStyle: TracedText = {
    value: tireTypeGrip(t.tireType),
    source: "declared",
    simulated: false,
    formula: "rule map on tireType string",
    inputs: t.tireType,
    confidence: "low",
    explanation: "Fără model forțe anvelopă — doar clasă compus.",
  };

  const slipAngleBehavior: TracedText = {
    value:
      "Peak slip angle window tightens from street → semi-slick → slick; expect sharper breakaway and less audible warning on grippier compounds.",
    source: "estimated",
    simulated: false,
    formula: "n/a (qualitative class ladder)",
    inputs: t.tireType,
    confidence: "low",
    explanation: "Nu există output slip unghi simulat în aplicație.",
  };

  const camberSensitivity: TracedText = {
    value:
      "Grippier tires are generally more camber-sensitive: small camber errors show up as uneven wear and reduced braking patch faster than on street tires.",
    source: "estimated",
    simulated: false,
    formula: "n/a",
    inputs: `${t.tireType}, camberStiffnessKndeg=${t.camberStiffnessKndeg}`,
    confidence: "low",
    explanation: "Valorile stiffness din footer sunt declarate — nu sunt validate în model.",
  };

  const staggerBalance: TracedText = {
    value: staggerText(t.setup),
    source: "declared",
    simulated: false,
    formula: "rule map on stagger setup string",
    inputs: t.setup,
    confidence: "low",
    explanation: "Balans mecanic calitativ — fără distribuție laterală simulată.",
  };

  const widthAndSidewallNote: TracedText = {
    value: `Sizes F/R: ${t.frontSize} | ${t.rearSize}. Wider tires increase grip potential and load sensitivity; lower aspect ratio tends to sharpen response vs taller sidewall compliance.`,
    source: "declared",
    simulated: false,
    formula: "n/a (qualitative)",
    inputs: `${t.frontSize}, ${t.rearSize}, wheel=${t.wheelWidthFr}`,
    confidence: "low",
    explanation: "Nu este calculat profilul efectiv din secțiunea anvelopei aici.",
  };

  return {
    gripStyle,
    slipAngleBehavior,
    camberSensitivity,
    staggerBalance,
    widthAndSidewallNote,
  };
}
