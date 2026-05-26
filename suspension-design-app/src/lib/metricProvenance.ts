/**
 * Traceability for suspension UI: every numeric or categorical readout maps to a source class.
 * Not a simulation upgrade — classification only.
 */
export type MetricSource = "derived" | "declared" | "estimated" | "placeholder" | "manual";

export const SOURCE_SHORT: Record<MetricSource, string> = {
  derived: "derived",
  declared: "declared",
  estimated: "estimated",
  placeholder: "placeholder",
  manual: "manual",
};

export const SOURCE_HINT: Record<MetricSource, string> = {
  derived: "From live 2D hardpoints + bump transform in this session.",
  declared: "Authored / catalog value — not computed from geometry here.",
  estimated: "Simplified numeric model — not a full physical simulation.",
  placeholder: "Not computed in this build — no live value.",
  manual: "Entered by you (e.g. alignment sheet) — not from the 2D sketch model.",
};

export interface MetricDebugBlock {
  formula: string;
  inputs: string;
  confidence: "high" | "medium" | "low" | "n/a";
  /** Whether this quantity is driven by the kinematic solver vs data-only. */
  kinematicallySimulated: boolean;
}
