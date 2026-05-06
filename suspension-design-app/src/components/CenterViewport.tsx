import { getVehicle } from "../data/vehicles";
import { useGarageCars } from "../hooks/useGarageCars";
import { formatSavedCarLabel } from "../lib/garageStorage";
import { useSuspensionStore } from "../store/suspensionStore";
import { SuspensionCanvas } from "./SuspensionCanvas";

export function CenterViewport() {
  const garageCars = useGarageCars();
  const travelMm = useSuspensionStore((s) => s.travelMm);
  const setTravel = useSuspensionStore((s) => s.setTravelMm);
  const workflow = useSuspensionStore((s) => s.workflow);
  const vehicleId = useSuspensionStore((s) => s.vehicleId);
  const garageCarIndex = useSuspensionStore((s) => s.garageCarIndex);
  const axle = useSuspensionStore((s) => s.axle);

  const sim = workflow === "simulate";
  const vLabel = getVehicle(vehicleId).label;
  const garageSubtitle =
    garageCarIndex !== null &&
    garageCarIndex >= 0 &&
    garageCarIndex < garageCars.length &&
    garageCars[garageCarIndex]
      ? `Garaj: ${formatSavedCarLabel(garageCars[garageCarIndex]!, garageCarIndex)}`
      : null;

  return (
    <div className="relative flex min-h-0 min-w-0 flex-1 flex-col bg-[#070a10]">
      <header className="flex items-center justify-between border-b border-white/10 px-4 py-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-400/80">
            Simulation
          </p>
          <h1 className="text-sm font-semibold text-white">
            {workflow === "design" && "Geometry & layout"}
            {workflow === "simulate" && "Ride & bump travel"}
            {workflow === "analyze" && "Live readouts & curves"}
            {workflow === "optimize" && "Iteration targets"}
            {workflow === "save" && "Session & export"}
          </h1>
        </div>
        <span
          className="max-w-[min(440px,55vw)] rounded border border-white/10 bg-black/40 px-2 py-1 text-right font-mono text-[11px] text-cyan-200/90 leading-snug"
          title={garageSubtitle ?? undefined}
        >
          {vLabel} · {axle}
          {garageSubtitle ? (
            <>
              <span className="text-neutral-500"> · </span>
              <span className="text-neutral-400">{garageSubtitle}</span>
            </>
          ) : null}
          <span className="text-neutral-500"> · side</span>
        </span>
      </header>

      <div className="relative min-h-0 flex-1 basis-0" style={{ minHeight: 0 }}>
        {workflow === "optimize" && (
          <div className="absolute left-3 top-3 z-10 max-w-md rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-100/95 backdrop-blur-sm">
            <strong className="font-semibold">Optimize</strong> — targets for camber gain & roll center;
            connect solver / GA in a later iteration.
          </div>
        )}
        {workflow === "save" && (
          <div className="absolute left-3 top-3 z-10 max-w-md rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100/95 backdrop-blur-sm">
            Use <span className="font-medium">Export</span> in the sidebar or finalize naming for cloud
            saves.
          </div>
        )}
        <SuspensionCanvas />
      </div>

      <div
        className={`border-t border-white/10 bg-[#0b0f14]/95 px-4 py-3 backdrop-blur-md transition-shadow ${
          sim ? "shadow-[0_0_0_1px_rgba(34,211,238,0.25)]" : ""
        }`}
      >
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className="text-xs font-medium uppercase tracking-wide text-neutral-400">
            Travel (bump + / droop −)
          </span>
          <span className="font-mono text-sm tabular-nums text-cyan-200">{travelMm.toFixed(1)} mm</span>
        </div>
        <input
          type="range"
          className="sd-rail h-2 w-full cursor-pointer"
          min={-50}
          max={50}
          step={0.5}
          value={travelMm}
          onChange={(e) => setTravel(Number(e.target.value))}
        />
        <div className="mt-1 flex justify-between font-mono text-[10px] text-neutral-500">
          <span>−50 mm</span>
          <span>0</span>
          <span>+50 mm</span>
        </div>
      </div>
    </div>
  );
}
