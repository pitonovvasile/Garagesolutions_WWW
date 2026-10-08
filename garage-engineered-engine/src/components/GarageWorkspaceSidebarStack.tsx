import type { ReactNode } from "react";
import { GarageModuleContextPanel } from "./GarageModuleContextPanel";
import { OptimizationPrioritiesPanel } from "./OptimizationPrioritiesPanel";
import { SetupModePanel } from "./SetupModePanel";
import { TargetUseProfilePanel } from "./TargetUseProfilePanel";

const shellClass =
  "flex min-h-0 w-full min-w-0 flex-1 flex-col gap-2 overflow-y-auto overflow-x-hidden rounded-md border border-white/10 bg-[#080c11]/50 p-1.5 shadow-inner";

/** Shared garage sidebar stack: optional hint/cards, then module context + target profile. */
export function GarageWorkspaceSidebarStack({
  hint,
  children,
}: {
  hint?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className={shellClass}>
      {hint}
      {children}
      <GarageModuleContextPanel />
      <TargetUseProfilePanel />
      <OptimizationPrioritiesPanel />
      <SetupModePanel />
    </div>
  );
}
