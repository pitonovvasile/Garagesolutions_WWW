import { useEffect } from "react";
import type { LeftStripModuleId } from "../lib/leftStripModule";
import { useSuspensionAssistantStore } from "../store/suspensionAssistantStore";

const SCROLL_TARGETS: Record<LeftStripModuleId, string> = {
  suspension: "sd-viewport-simulation",
  drivetrain: "sd-footer-drivetrain",
  tires: "sd-footer-tires",
  aero: "sd-footer-aero",
  analysis: "sd-setup-synthesis",
};

/**
 * După selectarea unei pictograme din strip, derulează la panoul corespunzător (viewport / footer / dreapta).
 */
export function LeftStripScrollBridge() {
  const mod = useSuspensionAssistantStore((s) => s.leftStripActiveModule);

  useEffect(() => {
    if (mod == null) return;
    const id = SCROLL_TARGETS[mod];
    const run = () => {
      const el = document.getElementById(id);
      el?.scrollIntoView({ behavior: "smooth", block: mod === "analysis" ? "start" : "nearest" });
    };
    requestAnimationFrame(() => requestAnimationFrame(run));
  }, [mod]);

  return null;
}
