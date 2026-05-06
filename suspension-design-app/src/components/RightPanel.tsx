import {
  DAMPERS,
  PLATES,
  SPRINGS,
  camberPlatesCompatible,
  useSuspensionStore,
} from "../store/suspensionStore";
import { getVehicle } from "../data/vehicles";
import { analyzeAxle, applyBumpTravel, getAxlePreset, sampleCamberVsTravel } from "../lib/vehicleKinematics";
import { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2 border-b border-white/5 py-1.5 text-xs last:border-0">
      <span className="text-neutral-500">{label}</span>
      <span className="font-mono text-neutral-100">{value}</span>
    </div>
  );
}

export function RightPanel() {
  const vehicleId = useSuspensionStore((s) => s.vehicleId);
  const axleEnd = useSuspensionStore((s) => s.axle);
  const points = useSuspensionStore((s) => s.points);
  const travelMm = useSuspensionStore((s) => s.travelMm);
  const springId = useSuspensionStore((s) => s.springId);
  const damperId = useSuspensionStore((s) => s.damperId);
  const plateId = useSuspensionStore((s) => s.plateId);
  const setSpring = useSuspensionStore((s) => s.setSpringId);
  const setDamper = useSuspensionStore((s) => s.setDamperId);
  const setPlate = useSuspensionStore((s) => s.setPlateId);
  const workflow = useSuspensionStore((s) => s.workflow);

  const axlePreset = useMemo(
    () => getAxlePreset(getVehicle(vehicleId), axleEnd),
    [vehicleId, axleEnd],
  );

  const live = useMemo(() => applyBumpTravel(points, travelMm), [points, travelMm]);

  const spring = SPRINGS.find((s) => s.id === springId) ?? SPRINGS[0];
  const damper = DAMPERS.find((d) => d.id === damperId) ?? DAMPERS[0];

  const kin = useMemo(
    () => analyzeAxle(points, live, axlePreset, spring.rateNmm, damper.linearDampingCoeff, travelMm),
    [points, live, axlePreset, spring.rateNmm, damper.linearDampingCoeff, travelMm],
  );

  const plateCompat = camberPlatesCompatible(axlePreset.type);
  const plate = plateCompat ? PLATES.find((p) => p.id === plateId) ?? null : null;

  const chartData = useMemo(
    () => sampleCamberVsTravel(points, axlePreset, -50, 50, 36),
    [points, axlePreset],
  );

  const showChart = workflow === "analyze" || workflow === "simulate";
  const layoutSep = axlePreset.layout === "separate";

  return (
    <aside className="flex w-[320px] shrink-0 flex-col overflow-y-auto border-l border-white/10 bg-[#0b0f14]">
      <div className="border-b border-white/10 p-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-400/80">
          Configuration
        </p>
        <h2 className="text-sm font-semibold text-white">Components (vendor)</h2>
      </div>

      <div className="space-y-4 p-3">
        <section className="rounded-xl border border-white/10 bg-[#12181f] p-3">
          <div className="mb-2 text-[11px] font-semibold text-neutral-400">Spring</div>
          <select
            className="mb-2 w-full rounded-lg border border-white/10 bg-black/40 px-2 py-2 text-sm text-white outline-none focus:border-cyan-500/40"
            value={spring.id}
            onChange={(e) => setSpring(e.target.value)}
          >
            {SPRINGS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.vendor} · {s.name}
              </option>
            ))}
          </select>
          <SpecRow label="Rate" value={`${spring.rateNmm} N/mm`} />
          <SpecRow label="Stroke" value={`${spring.strokeMm} mm`} />
        </section>

        <section className="rounded-xl border border-white/10 bg-[#12181f] p-3">
          <div className="mb-2 text-[11px] font-semibold text-neutral-400">Damper</div>
          <select
            className="mb-2 w-full rounded-lg border border-white/10 bg-black/40 px-2 py-2 text-sm text-white outline-none focus:border-cyan-500/40"
            value={damper.id}
            onChange={(e) => setDamper(e.target.value)}
          >
            {DAMPERS.map((d) => (
              <option key={d.id} value={d.id}>
                {d.vendor} · {d.name}
              </option>
            ))}
          </select>
          <SpecRow label="Valving" value={damper.digressive ? "Digressive" : "Linear / street"} />
          <SpecRow label="Stroke" value={`${damper.strokeMm} mm`} />
          <SpecRow label="Damping coeff. (rel.)" value={damper.linearDampingCoeff.toFixed(2)} />
        </section>

        <section
          className={`rounded-xl border border-white/10 bg-[#12181f] p-3 ${
            !plateCompat ? "opacity-45" : ""
          }`}
        >
          <div className="mb-2 text-[11px] font-semibold text-neutral-400">Camber plates</div>
          <p className="mb-2 text-[11px] text-neutral-500">
            {!plateCompat
              ? "Nu se modelează aici pentru double wishbone (camber la brațe / upright)."
              : "Compatibil MacPherson / multi-link cu treaptă reglabilă."}
          </p>
          <select
            disabled={!plateCompat}
            className="mb-2 w-full rounded-lg border border-white/10 bg-black/40 px-2 py-2 text-sm text-white outline-none focus:border-cyan-500/40 disabled:cursor-not-allowed"
            value={plate?.id ?? ""}
            onChange={(e) => setPlate(e.target.value || null)}
          >
            <option value="">None</option>
            {PLATES.map((p) => (
              <option key={p.id} value={p.id}>
                {p.vendor} · {p.name}
              </option>
            ))}
          </select>
          {plate ? <SpecRow label="Adj. range" value={`±${plate.rangeDeg}°`} /> : null}
        </section>
      </div>

      <div className="border-t border-white/10 p-3">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-400/80">
          Kinematics
        </p>
        <div className="rounded-xl border border-white/10 bg-[#12181f] p-3">
          <SpecRow label="Camber" value={`${kin.camberDeg.toFixed(2)}°`} />
          <SpecRow
            label="Spring length"
            value={kin.springLengthMm != null ? `${kin.springLengthMm.toFixed(1)} mm` : "—"}
          />
          <SpecRow
            label="Damper length"
            value={kin.damperLengthMm != null ? `${kin.damperLengthMm.toFixed(1)} mm` : "—"}
          />
          <SpecRow
            label={layoutSep ? "MR spring (ΔL/Δtravel)" : "Motion ratio (coilover)"}
            value={kin.mrSpring.toFixed(4)}
          />
          {layoutSep ? (
            <SpecRow label="MR damper (ΔL/Δtravel)" value={kin.mrDamper.toFixed(4)} />
          ) : null}
          <SpecRow label="Wheel rate" value={`${kin.wheelRateNmm.toFixed(1)} N/mm`} />
          <SpecRow label="Damping @ wheel (rel.)" value={kin.dampingAtWheel.toFixed(3)} />
        </div>
      </div>

      {showChart && (
        <div className="border-t border-white/10 p-3 pb-6">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-400/80">
            Camber vs travel
          </p>
          <div className="h-44 w-full rounded-xl border border-white/10 bg-[#090c12] p-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" />
                <XAxis
                  dataKey="travel"
                  tick={{ fill: "#64748b", fontSize: 10 }}
                  tickFormatter={(v) => `${v}`}
                  label={{ value: "mm", fill: "#475569", fontSize: 10, position: "insideBottom", dy: 10 }}
                />
                <YAxis
                  dataKey="camber"
                  tick={{ fill: "#64748b", fontSize: 10 }}
                  width={36}
                  label={{
                    value: "°",
                    fill: "#475569",
                    fontSize: 10,
                    angle: -90,
                    position: "insideLeft",
                  }}
                />
                <Tooltip
                  contentStyle={{
                    background: "#0f172a",
                    border: "1px solid rgba(34,211,238,0.25)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  labelFormatter={(v) => `Travel ${v} mm`}
                />
                <ReferenceLine x={travelMm} stroke="#f472b6" strokeDasharray="4 4" />
                <Line type="monotone" dataKey="camber" stroke="#22d3ee" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </aside>
  );
}
