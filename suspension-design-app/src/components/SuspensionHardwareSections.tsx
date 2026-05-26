import { useMemo } from "react";
import { getVehicle } from "../data/vehicles";
import { camberPlatesCompatible, useSuspensionStore } from "../store/suspensionStore";
import { useSuspensionAssistantStore } from "../store/suspensionAssistantStore";
import { getAxlePreset } from "../lib/vehicleKinematics";
import { MetricTraceRow } from "./MetricTraceRow";

/** Plăci camber reglabile — panoul drept „Configuration”. */
export function SuspensionHardwareSections() {
  const vehicleId = useSuspensionStore((s) => s.vehicleId);
  const axleEnd = useSuspensionStore((s) => s.axle);
  const plateRangeDeg = useSuspensionStore((s) => s.plateRangeDeg);
  const setPlateRangeDeg = useSuspensionStore((s) => s.setPlateRangeDeg);

  const engineeringDebugMode = useSuspensionAssistantStore((s) => s.engineeringDebugMode);

  const vehicle = useMemo(() => getVehicle(vehicleId), [vehicleId]);
  const axlePreset = useMemo(() => getAxlePreset(vehicle, axleEnd), [vehicle, axleEnd]);
  const plateCompat = camberPlatesCompatible(axlePreset.type);

  return (
    <section
      className={`rounded-xl border border-white/10 bg-[#12181f] p-3 ${
        !plateCompat ? "opacity-45" : ""
      }`}
    >
      <div className="mb-2 text-[11px] font-semibold text-neutral-400">Camber plates</div>
      <p className="mb-2 text-[11px] text-neutral-500">
        {!plateCompat
          ? "Nu se modelează aici pentru double wishbone (camber la brațe / upright)."
          : "Bifează dacă ai plăci reglabile; introduce fereastra ± grade (referință, nu se aplică automat pe geometrie)."}
      </p>
      {plateCompat ? (
        <>
          <label className="mb-2 flex cursor-pointer items-center gap-2 text-[11px] text-neutral-400">
            <input
              type="checkbox"
              className="rounded border-white/20 bg-black/40"
              checked={plateRangeDeg != null}
              onChange={(e) => {
                if (e.target.checked) setPlateRangeDeg(1.5);
                else setPlateRangeDeg(null);
              }}
            />
            Folosesc plăci camber reglabile
          </label>
          {plateRangeDeg != null ? (
            <label className="mb-2 block text-[10px] text-neutral-500">
              Gamă ± (°)
              <input
                type="number"
                step={0.1}
                min={0.05}
                max={6}
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-2 py-2 font-mono text-sm text-white outline-none focus:border-cyan-500/40"
                value={plateRangeDeg}
                onChange={(e) => setPlateRangeDeg(Number(e.target.value))}
              />
            </label>
          ) : null}
          {plateRangeDeg != null ? (
            <MetricTraceRow
              label="Adj. range"
              value={`±${plateRangeDeg}°`}
              source="declared"
              explanation="Valoare introdusă — geometria nu aplică automat offset de placă."
              simulated={false}
              engineeringDebug={engineeringDebugMode}
              debug={{
                formula: "n/a (user input)",
                inputs: "plateRangeDeg",
                confidence: "n/a",
                kinematicallySimulated: false,
              }}
            />
          ) : null}
        </>
      ) : null}
    </section>
  );
}
