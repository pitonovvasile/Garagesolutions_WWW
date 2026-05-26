/**
 * Tire slip angle — interpretation & setup guidance only.
 * Not tire physics, Pacejka, telemetry, or simulated slip outputs.
 */

export type TireSlipCategoryId = "street_radial" | "semi_slick" | "slick" | "rally_dirt";

export interface TireSlipCategory {
  id: TireSlipCategoryId;
  label: string;
  shortHint: string;
  slipToleranceVsStreet: string;
  thermalNotes: string;
  typicalTradeoffs: string[];
}

export const TIRE_SLIP_DISCLAIMER =
  "This panel explains tire slip angle conceptually and relates alignment choices to expected handling behavior. It does not compute slip angle, tire forces, temperatures, or yaw — those require a full vehicle dynamic model not present in this app.";

export const SLIP_FUNDAMENTALS: { title: string; bullets: string[] }[] = [
  {
    title: "What slip angle is",
    bullets: [
      "Slip angle is the angle between the direction a tire is pointing and the direction it is actually travelling at the contact patch.",
      "Some slip angle is normal whenever you corner or brake/accelerate laterally: the contact patch must create lateral force, which typically involves deformation and slip at the rubber road interface.",
    ],
  },
  {
    title: "Why some slip is needed for grip",
    bullets: [
      "For a given vertical load, lateral force usually rises with slip angle up to a peak — moderate slip is associated with strong cornering force.",
      "Moderate slip angle is therefore consistent with operating near the friction circle relevant for that load.",
    ],
  },
  {
    title: "Why excessive slip reduces grip",
    bullets: [
      "Beyond the friction peak, increasing slip often trades lateral capability for sliding — cornering force may drop while scrub and heat rise.",
      "Excessive slip angle increases sliding work at the patch: rubber shear, scrub, and overheating risk rise together.",
    ],
  },
  {
    title: "How load changes slip behavior",
    bullets: [
      "Higher vertical load generally shifts available friction and often widens the envelope before saturation — but also heats the tire faster at the same slip duty.",
      "Low-load corners (inside tire in steady-state turn, light axle on crests) reach saturation sooner — slip dynamics feel less forgiving.",
      "Load transfer moves grip front/rear — balance shifts influence whether front or rear tires tend toward slip saturation first (understeer vs oversteer tendency).",
    ],
  },
];

export const HANDLING_CONCEPTS: { title: string; bullets: string[] }[] = [
  {
    title: "Cornering force & grip peak",
    bullets: [
      "Cornering force builds toward a peak vs slip near the tire's operating envelope for that load and temperature.",
      "Grip peak behavior depends on compound and temperature window — same slip angle can be below peak (under-used), near peak (best lateral capability), or past peak (sliding-dominated).",
    ],
  },
  {
    title: "Understeer / oversteer tendencies",
    bullets: [
      "Understeer tendency: front axle reaches slip saturation or lateral limit earlier than rear — car pushes wide.",
      "Oversteer tendency: rear axle saturates earlier — rear slides more than front at the limit.",
      "Balance is axle-by-axle load, stiffness, alignment, and tire capability — not a single scalar from this UI.",
    ],
  },
  {
    title: "Scrub, responsiveness, overheating",
    bullets: [
      "Scrub: lateral sliding work while generating cornering force — unavoidable at some level; excessive slip angle increases scrub intensity.",
      "Responsiveness: how quickly lateral force builds as steer angle changes — influenced by slip stiffness characteristics (compound-dependent), not modeled here.",
      "Overheating risk rises with sustained high slip duty and aggressive sliding — especially on softer compounds or narrow thermal windows.",
    ],
  },
];

export const ALIGNMENT_SLIP_GUIDANCE: { topic: string; relationToSlip: string[] }[] = [
  {
    topic: "Toe",
    relationToSlip: [
      "Toe changes the baseline slip angle demand at straight-ahead and in corner entry — toe-out tends to add front slip-angle sensitivity on initial steer; toe-in tends to stabilize straight-line slip.",
      "Aggressive toe-out may increase front slip angle sensitivity and transient bite at the cost of wear and straight-line stability.",
      "Rear toe influences slip angle distribution vs front — affects corner exit balance and tire scrub patterns.",
    ],
  },
  {
    topic: "Camber",
    relationToSlip: [
      "Negative camber biases the loaded outer tire toward a more favorable contact patch under lateral load — often lets you operate closer to optimal slip on the outer tire in steady cornering.",
      "Too much negative camber can hurt straight-line braking/acceleration capability and inner-edge wear — slip angle behavior becomes uneven across the tread.",
    ],
  },
  {
    topic: "Caster",
    relationToSlip: [
      "Higher mechanical trail increases aligning torque and steering weight — drivers often sense slip buildup differently even though slip angle is not computed here.",
      "Caster interacts with dynamic camber gain during steer — influences how slip develops through the turn on many MacPherson layouts.",
    ],
  },
  {
    topic: "Ackermann",
    relationToSlip: [
      "Ideal Ackermann targets slip-angle equality on inner vs outer tire at one reference radius — real cars compromise for packaging and wear.",
      "Too little Ackermann can overload the outer tire slip demand in tight corners; too much can waste inner tire capability — expressed here only as geometry tendency, not simulated.",
    ],
  },
];

export const EXAMPLE_CALLOUTS: string[] = [
  "Moderate slip angle is required for peak cornering force.",
  "Excessive slip angle may lead to tire scrub and overheating.",
  "Semi-slick tires tolerate larger slip angles than street radials before saturation for similar duty.",
  "Aggressive toe-out may increase front slip angle sensitivity on turn-in.",
];

export const TIRE_SLIP_CATEGORIES: TireSlipCategory[] = [
  {
    id: "street_radial",
    label: "Street radial",
    shortHint: "Prioritize thermal durability and progressive breakaway — narrower slip window vs motorsport tires.",
    slipToleranceVsStreet:
      "Baseline reference: moderate slip angles produce usable lateral force; large sustained slip overheats compound quickly.",
    thermalNotes: "Heat soak from repeated hard corners narrows grip peak — slip management matters on road tires.",
    typicalTradeoffs: [
      "More progressive limit behavior — easier to sense approaching slip saturation.",
      "Lower peak coefficient vs semi-slick/slick at equal load — past-peak drop-off often sharper under abuse.",
    ],
  },
  {
    id: "semi_slick",
    label: "Semi-slick",
    shortHint: "Higher peak lateral capability than street rubber; tolerates larger slip angles before saturation for similar vertical load.",
    slipToleranceVsStreet:
      "Typically tolerates larger slip angles than street radials before friction saturation under comparable conditions.",
    thermalNotes: "Needs temperature window — cold slippery / hot greasy extremes shift slip peak position.",
    typicalTradeoffs: [
      "Stronger transient bite — slip angles build lateral force quickly when in temperature.",
      "Wear and heat sensitivity higher than street tires under slip-heavy driving.",
    ],
  },
  {
    id: "slick",
    label: "Slick racing",
    shortHint: "Maximum dry envelope when hot — slip angle operating band can be wide but requires thermal management.",
    slipToleranceVsStreet:
      "Peak lateral forces at high loads often occur at slip angles beyond typical street tire comfort — still not computed here.",
    thermalNotes: "Graining/blistering risk when slip duty and temperature are mismatched.",
    typicalTradeoffs: [
      "Highest peak lateral potential in dry conditions within window.",
      "No tread relief — slip and temperature discipline dominate stint behavior.",
    ],
  },
  {
    id: "rally_dirt",
    label: "Rally / dirt",
    shortHint: "Loose surfaces: sliding work is often larger fraction of traction — slip angle interpretation differs from paved grip peaks.",
    slipToleranceVsStreet:
      "Slip angles may be intentionally larger for yaw control — peak lateral vs slip curve unlike dry pavement slicks.",
    thermalNotes: "Heat picture differs (cooling from loose surface, cutting fresh rubber) — still no simulation here.",
    typicalTradeoffs: [
      "Balance controlled slip vs hook-up — surface-dependent.",
      "Alignment still biases slip distribution front/rear for rotation vs stability.",
    ],
  },
];
