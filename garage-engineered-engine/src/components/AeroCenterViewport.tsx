import { BodyComponentsMaterialPlanner } from "./aero/BodyComponentsMaterialPlanner";

export function AeroCenterViewport() {
  return (
    <main className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[#06080c]">
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-2 sm:p-3">
        <BodyComponentsMaterialPlanner />
      </div>
    </main>
  );
}
