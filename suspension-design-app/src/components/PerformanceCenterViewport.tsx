import { PerformancePowerCurveDashboard } from "./PerformancePowerCurveDashboard";

export function PerformanceCenterViewport() {
  return (
    <main className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[#06080c]">
      <PerformancePowerCurveDashboard />
    </main>
  );
}
