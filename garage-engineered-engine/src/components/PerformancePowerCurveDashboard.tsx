import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from "recharts";
import { useGarageCars } from "../hooks/useGarageCars";
import { usePerformanceOeBaseline } from "../hooks/usePerformanceOeBaseline";
import { buildPerformanceCurveModel } from "../lib/performanceCurveModel";
import { usePerformanceStore } from "../store/performanceStore";
import { useSuspensionStore } from "../store/suspensionStore";
import { PerformancePowerGauge, PerformanceSemiGauge } from "./PerformanceSemiGauge";
import { PerformanceSystemReadinessView } from "./PerformanceSystemReadinessView";

const TABS = [
  "Power curve",
  "Target builder",
  "System readiness",
  "Tuning data",
  "Calculators",
  "Dyno / logs",
  "Parts matching",
] as const;

const LEGEND = [
  { key: "oePower", label: (oe: number) => `OE Power (${oe} hp)`, color: "#7dd3fc", dash: "4 3" },
  { key: "estPower", label: (t: number) => `Estimated (${t} hp)`, color: "#22d3ee", dash: undefined },
  { key: "dynoPower", label: (d: number) => `Dyno Measured (${d} hp)`, color: "#f87171", dash: undefined },
  { key: "oeTorque", label: (t: number) => `OE Torque (${t} Nm)`, color: "#c084fc", dash: "4 3" },
  { key: "estTorque", label: (t: number) => `Estimated Torque (${t} Nm)`, color: "#fb923c", dash: "4 3" },
  { key: "boost", label: () => "Boost (bar)", color: "#4ade80", dash: "4 3" },
  { key: "afr", label: () => "AFR", color: "#a78bfa", dash: "4 3" },
] as const;

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-md border border-white/[0.07] bg-black/25 px-2.5 py-1.5">
      <p className="truncate text-[8px] font-semibold uppercase tracking-wide text-neutral-500">{label}</p>
      <p className="truncate text-[11px] font-semibold tabular-nums text-neutral-100">{value}</p>
    </div>
  );
}

export function PerformancePowerCurveDashboard() {
  const activeCenterTab = usePerformanceStore((s) => s.activeCenterTab);
  const [activeTab, setActiveTab] = useState(activeCenterTab);
  const setActiveCenterTab = usePerformanceStore((s) => s.setActiveCenterTab);

  useEffect(() => {
    setActiveTab(activeCenterTab);
  }, [activeCenterTab]);

  useEffect(() => {
    setActiveCenterTab(activeTab);
  }, [activeTab, setActiveCenterTab]);

  const garageCars = useGarageCars();
  const garageCarIndex = useSuspensionStore((s) => s.garageCarIndex);
  const linkedCar =
    garageCarIndex !== null && garageCarIndex >= 0 && garageCarIndex < garageCars.length
      ? garageCars[garageCarIndex]!
      : null;

  const targetHp = usePerformanceStore((s) => s.targetPowerHp);
  const buildType = usePerformanceStore((s) => s.buildType);
  const budgetLevel = usePerformanceStore((s) => s.budgetLevel);
  const setTargetModalOpen = usePerformanceStore((s) => s.setTargetModalOpen);

  const { baseline, loading } = usePerformanceOeBaseline(linkedCar);

  const model = useMemo(
    () =>
      buildPerformanceCurveModel({
        baseline,
        targetHp,
        buildType,
        budgetLevel,
        engineLabel: linkedCar?.engine ?? "",
      }),
    [baseline, targetHp, buildType, budgetLevel, linkedCar?.engine],
  );

  const readinessColor =
    model.overallReadinessPct >= 75
      ? "text-emerald-400"
      : model.overallReadinessPct >= 55
        ? "text-amber-400"
        : "text-orange-400";

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <nav
        className="flex shrink-0 gap-0 overflow-x-auto border-b border-white/10 bg-[#060910] px-2"
        aria-label="Performance modules"
      >
        {TABS.map((tab, i) => {
          const active = i === activeTab;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(i)}
              className={[
                "shrink-0 border-b-2 px-3 py-2.5 text-[9px] font-semibold uppercase tracking-[0.12em] transition sm:text-[10px]",
                active
                  ? "border-cyan-400 text-cyan-200"
                  : "border-transparent text-neutral-500 hover:text-neutral-300",
              ].join(" ")}
            >
              {tab}
            </button>
          );
        })}
      </nav>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {activeTab === 2 ? (
          <PerformanceSystemReadinessView />
        ) : activeTab !== 0 ? (
          <div className="flex h-full min-h-[12rem] flex-col items-center justify-center rounded-lg border border-white/10 bg-[#080c11]/80 p-6 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-neutral-300">{TABS[activeTab]}</p>
            <p className="mt-2 max-w-md text-xs text-neutral-500">Secțiunea este în curs de dezvoltare.</p>
          </div>
        ) : (
          <div className="flex min-h-0 flex-col gap-3">
            <section className="rounded-lg border border-white/10 bg-[#080c11]/90 p-3 shadow-inner">
              <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-200">
                  Power, torque &amp; boost curve
                </h2>
                {loading ? (
                  <span className="text-[10px] text-neutral-500">Se încarcă baseline OEM…</span>
                ) : null}
              </div>

              <div className="mb-2 flex flex-wrap gap-x-3 gap-y-1">
                {LEGEND.map((item) => {
                  let text = "";
                  if (item.key === "oePower") text = item.label(model.oeHp);
                  else if (item.key === "estPower") text = item.label(model.targetHp);
                  else if (item.key === "dynoPower") text = item.label(model.dynoHp);
                  else if (item.key === "oeTorque") text = item.label(model.oeTorque);
                  else if (item.key === "estTorque") text = item.label(model.targetTorque);
                  else text = item.label();

                  return (
                    <span key={item.key} className="inline-flex items-center gap-1.5 text-[9px] text-neutral-400">
                      <span
                        className="inline-block h-0.5 w-4 rounded-full"
                        style={{
                          background: item.color,
                          opacity: item.dash ? 0.85 : 1,
                        }}
                      />
                      {text}
                    </span>
                  );
                })}
              </div>

              <div className="h-[min(42vh,320px)] min-h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={model.points} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis
                      dataKey="rpm"
                      tick={{ fill: "#64748b", fontSize: 10 }}
                      axisLine={{ stroke: "rgba(255,255,255,0.12)" }}
                      tickLine={false}
                      label={{ value: "RPM", position: "insideBottomRight", offset: -2, fill: "#64748b", fontSize: 10 }}
                    />
                    <YAxis
                      yAxisId="left"
                      tick={{ fill: "#64748b", fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      domain={[0, Math.max(600, model.targetHp + 80)]}
                      label={{
                        value: "Power (hp) / Torque (Nm)",
                        angle: -90,
                        position: "insideLeft",
                        fill: "#64748b",
                        fontSize: 9,
                        dx: 8,
                      }}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tick={{ fill: "#64748b", fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      domain={[0, 16]}
                      label={{
                        value: "Boost (bar) / AFR (λ/10)",
                        angle: 90,
                        position: "insideRight",
                        fill: "#64748b",
                        fontSize: 9,
                        dx: -8,
                      }}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "#0b0f14",
                        border: "1px solid rgba(255,255,255,0.12)",
                        borderRadius: 8,
                        fontSize: 11,
                      }}
                      labelFormatter={(rpm) => `${rpm} rpm`}
                      formatter={(value: number, name: string) => {
                        if (name === "boost") return [`${value} bar`, "Boost"];
                        if (name === "afr") return [`${value} : 1`, "AFR"];
                        if (name.includes("Torque") || name === "oeTorque" || name === "estTorque") {
                          return [`${value} Nm`, name];
                        }
                        return [`${value} hp`, name];
                      }}
                    />
                    <Legend wrapperStyle={{ display: "none" }} />
                    <Line yAxisId="left" type="monotone" dataKey="oePower" name="OE Power" stroke="#7dd3fc" strokeDasharray="4 3" dot={false} strokeWidth={1.5} />
                    <Line yAxisId="left" type="monotone" dataKey="estPower" name="Est. Power" stroke="#22d3ee" dot={false} strokeWidth={2} />
                    <Line yAxisId="left" type="monotone" dataKey="dynoPower" name="Dyno Power" stroke="#f87171" dot={false} strokeWidth={1.5} />
                    <Line yAxisId="left" type="monotone" dataKey="oeTorque" name="OE Torque" stroke="#c084fc" strokeDasharray="4 3" dot={false} strokeWidth={1.5} />
                    <Line yAxisId="left" type="monotone" dataKey="estTorque" name="Est. Torque" stroke="#fb923c" strokeDasharray="4 3" dot={false} strokeWidth={1.5} />
                    <Line yAxisId="right" type="monotone" dataKey="boost" name="Boost" stroke="#4ade80" strokeDasharray="4 3" dot={false} strokeWidth={1.5} />
                    <Line yAxisId="right" type="monotone" dataKey="afr" name="AFR" stroke="#a78bfa" strokeDasharray="4 3" dot={false} strokeWidth={1.5} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                <StatPill label="Peak Power (Est.)" value={`${model.peaks.estPowerHp} hp @ ${model.peaks.estPowerRpm} rpm`} />
                <StatPill label="Peak Torque (Est.)" value={`${model.peaks.estTorqueNm} Nm @ ${model.peaks.estTorqueRpm} rpm`} />
                <StatPill label="Peak Boost" value={`${model.peaks.peakBoostBar.toFixed(2)} bar`} />
                <StatPill label="Max AFR" value={model.peaks.maxAfr} />
                <StatPill label="Redline" value={`${model.peaks.redlineRpm} rpm`} />
              </div>

              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  className="rounded-md border border-white/10 bg-black/30 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-wide text-neutral-400 transition hover:border-cyan-500/35 hover:text-cyan-200"
                >
                  Compare runs
                </button>
              </div>
            </section>

            <div className="grid min-h-0 grid-cols-1 gap-3 xl:grid-cols-3">
              <section className="flex min-h-[14rem] flex-col rounded-lg border border-white/10 bg-[#080c11]/90 p-3 shadow-inner">
                <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-200">
                  Performance build readiness
                </h3>
                <div className="min-h-0 flex-1">
                  <ResponsiveContainer width="100%" height="100%" minHeight={140}>
                    <RadarChart data={model.readiness} outerRadius="72%">
                      <PolarGrid stroke="rgba(255,255,255,0.08)" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: "#94a3b8", fontSize: 8 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                      <Radar dataKey="value" stroke="#22d3ee" fill="#22d3ee" fillOpacity={0.22} strokeWidth={1.5} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-1 flex flex-wrap gap-2 text-[8px] text-neutral-500">
                  <span className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Ready</span>
                  <span className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-yellow-400" /> Good</span>
                  <span className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-orange-400" /> Upgrade</span>
                  <span className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-red-400" /> Critical</span>
                </div>
                <div className="mt-2 flex items-end justify-between gap-2">
                  <div>
                    <p className="text-[9px] uppercase tracking-wide text-neutral-500">Overall readiness</p>
                    <p className={`text-3xl font-bold tabular-nums ${readinessColor}`}>
                      {model.overallReadinessPct}%
                    </p>
                  </div>
                  <button
                    type="button"
                    className="rounded-md border border-cyan-500/35 bg-cyan-500/10 px-2.5 py-1.5 text-[9px] font-semibold uppercase tracking-wide text-cyan-100 hover:bg-cyan-500/20"
                  >
                    How to improve
                  </button>
                </div>
              </section>

              <section className="flex min-h-[14rem] flex-col rounded-lg border border-white/10 bg-[#080c11]/90 p-3 shadow-inner">
                <h3 className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-200">
                  Power potential
                </h3>
                <div className="flex flex-1 flex-col items-center justify-center py-1">
                  <PerformancePowerGauge oeHp={model.oeHp} targetHp={model.targetHp} />
                </div>
                <div className="mt-2 space-y-1 border-t border-white/[0.06] pt-2 text-[10px]">
                  <div className="flex justify-between gap-2">
                    <span className="text-neutral-500">Power gain</span>
                    <span className="font-semibold tabular-nums text-white">
                      +{model.powerGainHp} hp (+{model.powerGainPct}%)
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-neutral-500">Torque gain</span>
                    <span className="font-semibold tabular-nums text-white">
                      +{model.torqueGainNm} Nm (+{model.torqueGainPct}%)
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-neutral-500">Power / weight</span>
                    <span className="font-semibold tabular-nums text-white">
                      {model.powerToWeight} kg/hp{" "}
                      <span className="text-neutral-500">(target: {model.powerToWeightTarget} kg/hp)</span>
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setTargetModalOpen(true)}
                  className="mt-2 rounded-md border border-white/10 bg-black/25 py-1.5 text-[9px] font-semibold uppercase tracking-wide text-neutral-400 hover:border-cyan-500/35 hover:text-cyan-200"
                >
                  Edit target
                </button>
              </section>

              <section className="flex min-h-[14rem] flex-col rounded-lg border border-white/10 bg-[#080c11]/90 p-3 shadow-inner">
                <h3 className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-200">
                  Drivetrain load
                </h3>
                <div className="flex flex-1 flex-col items-center justify-center py-1">
                  <PerformanceSemiGauge
                    value={model.drivetrainLoadPct}
                    label="Of capacity"
                    displayValue={`${model.drivetrainLoadPct}%`}
                  />
                </div>
                <div className="mt-2 space-y-1 border-t border-white/[0.06] pt-2 text-[10px]">
                  <div className="flex justify-between gap-2">
                    <span className="text-neutral-500">Wheel torque</span>
                    <span className="font-semibold tabular-nums text-white">{model.wheelTorqueNm} Nm</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-neutral-500">Clutch load</span>
                    <span className="font-semibold tabular-nums text-amber-200">{model.clutchLoadPct}%</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-neutral-500">Gearbox load</span>
                    <span className="font-semibold tabular-nums text-amber-200">{model.gearboxLoadPct}%</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="mt-2 rounded-md border border-cyan-500/35 bg-cyan-500/10 py-1.5 text-[9px] font-semibold uppercase tracking-wide text-cyan-100 hover:bg-cyan-500/20"
                >
                  View drivetrain analysis
                </button>
              </section>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
