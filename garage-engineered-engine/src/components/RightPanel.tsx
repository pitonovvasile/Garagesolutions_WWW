import { camberPlatesCompatible, useSuspensionStore } from "../store/suspensionStore";
import { getVehicle } from "../data/vehicles";
import { getGarageProfile, getPresetById } from "../data/vehicleGarageProfiles";
import { getVehicleStockSuspensionDoc } from "../data/vehicleStockSuspension";
import { stockHardwareRecommendationMessages, validateAxleAgainstStockProfile } from "../lib/axleStockValidation";
import { analyzeAxle, applyBumpTravel, getAxlePreset } from "../lib/vehicleKinematics";
import type { MetricDebugBlock } from "../lib/metricProvenance";
import { useVehicleDynamicsReport } from "../hooks/useVehicleDynamicsReport";
import { validateAssistantSetup } from "../lib/recommendationEngine";
import { useSuspensionAssistantStore } from "../store/suspensionAssistantStore";
import { MetricTraceRow } from "./MetricTraceRow";
import { OemSuspensionSetupPanel } from "./OemSuspensionSetupPanel";
import { SuspensionHardwareSections } from "./SuspensionHardwareSections";
import { TireSlipInterpretationPanel } from "./TireSlipInterpretationPanel";
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

function tracedScalarDebug(t: {
  formula: string;
  inputs: string;
  confidence: string;
  simulated: boolean;
}): MetricDebugBlock {
  return {
    formula: t.formula,
    inputs: t.inputs,
    confidence: t.confidence as MetricDebugBlock["confidence"],
    kinematicallySimulated: t.simulated,
  };
}

export function RightPanel() {
  const vehicleId = useSuspensionStore((s) => s.vehicleId);
  const axleEnd = useSuspensionStore((s) => s.axle);
  const pointsFront = useSuspensionStore((s) => s.pointsFront);
  const pointsRear = useSuspensionStore((s) => s.pointsRear);
  const travelMm = useSuspensionStore((s) => s.travelMm);
  const springRateNmm = useSuspensionStore((s) => s.springRateNmm);
  const springStrokeMm = useSuspensionStore((s) => s.springStrokeMm);
  const damperStrokeMm = useSuspensionStore((s) => s.damperStrokeMm);
  const damperLinearDampingCoeff = useSuspensionStore((s) => s.damperLinearDampingCoeff);
  const damperDigressive = useSuspensionStore((s) => s.damperDigressive);
  const plateRangeDeg = useSuspensionStore((s) => s.plateRangeDeg);
  const measuredFrontCamberDeg = useSuspensionStore((s) => s.measuredFrontCamberDeg);
  const measuredRearCamberDeg = useSuspensionStore((s) => s.measuredRearCamberDeg);
  const workflow = useSuspensionStore((s) => s.workflow);

  const dynReport = useVehicleDynamicsReport();
  const g = dynReport.kinematicsActive;

  const goal = useSuspensionAssistantStore((s) => s.goal);
  const activePresetId = useSuspensionAssistantStore((s) => s.activePresetId);
  const stockSetupMode = useSuspensionAssistantStore((s) => s.stockSetupMode);
  const setStockSetupMode = useSuspensionAssistantStore((s) => s.setStockSetupMode);
  const applyOemStockBaselineSession = useSuspensionAssistantStore((s) => s.applyOemStockBaselineSession);
  const engineeringDebugMode = useSuspensionAssistantStore((s) => s.engineeringDebugMode);
  const setEngineeringDebugMode = useSuspensionAssistantStore((s) => s.setEngineeringDebugMode);
  const leftStripActiveModule = useSuspensionAssistantStore((s) => s.leftStripActiveModule);

  const vehicle = useMemo(() => getVehicle(vehicleId), [vehicleId]);
  const axlePreset = useMemo(() => getAxlePreset(vehicle, axleEnd), [vehicle, axleEnd]);

  const presetFront = useMemo(() => getAxlePreset(vehicle, "front"), [vehicle]);
  const presetRear = useMemo(() => getAxlePreset(vehicle, "rear"), [vehicle]);
  const liveFront = useMemo(() => applyBumpTravel(pointsFront, travelMm), [pointsFront, travelMm]);
  const liveRear = useMemo(() => applyBumpTravel(pointsRear, travelMm), [pointsRear, travelMm]);
  const kinFront = useMemo(
    () =>
      analyzeAxle(pointsFront, liveFront, presetFront, springRateNmm, damperLinearDampingCoeff, travelMm),
    [pointsFront, liveFront, presetFront, springRateNmm, damperLinearDampingCoeff, travelMm],
  );
  const kinRear = useMemo(
    () =>
      analyzeAxle(pointsRear, liveRear, presetRear, springRateNmm, damperLinearDampingCoeff, travelMm),
    [pointsRear, liveRear, presetRear, springRateNmm, damperLinearDampingCoeff, travelMm],
  );

  const plateCompat = camberPlatesCompatible(axlePreset.type);
  const hasAdjustablePlates = plateCompat && plateRangeDeg != null && plateRangeDeg > 0;

  const chartData = g.camberVsTravelChart;

  const showChart = workflow === "analyze" || workflow === "simulate";
  const layoutSep = axlePreset.layout === "separate";

  const profile = useMemo(() => getGarageProfile(vehicle), [vehicle]);
  const stockDoc = useMemo(() => getVehicleStockSuspensionDoc(vehicleId), [vehicleId]);

  const goalEff = goal ?? "balanced";
  const activePreset = activePresetId ? getPresetById(activePresetId) : null;
  const catalogBuildIds = useMemo<string[]>(() => [], []);

  const validation = useMemo(() => {
    const base = validateAssistantSetup({
      vehicle,
      vehicleId,
      axle: axleEnd,
      goal: goalEff,
      springRateNmm,
      damperDigressive,
      hasCamberPlate: hasAdjustablePlates && camberPlatesCompatible(vehicle.front.type),
      catalogIdsInBuild: catalogBuildIds,
    });
    if (!stockDoc) return base;
    const stockAxle = [
      ...validateAxleAgainstStockProfile({
        axle: "front",
        doc: stockDoc,
        currentCamberDeg: measuredFrontCamberDeg,
        targetCamberDeg: activePreset?.targetFront?.camberDeg ?? null,
        hasCamberPlates: hasAdjustablePlates && camberPlatesCompatible(vehicle.front.type),
        goal: goalEff,
      }),
      ...validateAxleAgainstStockProfile({
        axle: "rear",
        doc: stockDoc,
        currentCamberDeg: measuredRearCamberDeg,
        targetCamberDeg: activePreset?.targetRear?.camberDeg ?? null,
        hasCamberPlates: false,
        goal: goalEff,
      }),
    ];
    const hw = stockHardwareRecommendationMessages(stockDoc, goalEff, hasAdjustablePlates && camberPlatesCompatible(vehicle.front.type));
    return [...base, ...stockAxle, ...hw];
  }, [
    vehicle,
    vehicleId,
    axleEnd,
    goalEff,
    springRateNmm,
    damperDigressive,
    hasAdjustablePlates,
    catalogBuildIds,
    stockDoc,
    measuredFrontCamberDeg,
    measuredRearCamberDeg,
    activePreset,
  ]);

  return (
    <aside id="sd-right-panel" className="flex w-[360px] shrink-0 flex-col overflow-y-auto border-l border-white/10 bg-[#0b0f14]">
      <div className="border-b border-white/10 p-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-400/80">
          Setup assistant
        </p>
        <h2 className="text-sm font-semibold text-white">OEM stock · axă față / spate</h2>
        <p className="mt-2 text-[10px] leading-relaxed text-neutral-500">{profile.stockAlignment}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (stockSetupMode) setStockSetupMode(false);
              else applyOemStockBaselineSession();
            }}
            className={[
              "rounded-full border px-3 py-1 text-[9px] font-semibold uppercase tracking-wide",
              stockSetupMode
                ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-100"
                : "border-white/10 text-neutral-300 hover:bg-white/5",
            ].join(" ")}
          >
            {stockSetupMode ? "Mod OEM activ (apasă pentru ieșire)" : "Mod OEM (stock)"}
          </button>
          <label className="flex cursor-pointer items-center gap-1.5 text-[9px] text-neutral-500">
            <input
              type="checkbox"
              className="rounded border-white/20 bg-black/40"
              checked={engineeringDebugMode}
              onChange={(e) => setEngineeringDebugMode(e.target.checked)}
            />
            Eng. debug
          </label>
        </div>
        {activePreset ? (
          <p className="mt-2 text-[10px] leading-relaxed text-cyan-100/90">
            <span className="font-semibold text-cyan-400/90">Țintă preset: </span>
            {activePreset.alignmentSummary}
          </p>
        ) : null}
        {stockDoc ? (
          <div className="mt-3 space-y-2">
            <OemSuspensionSetupPanel
              doc={stockDoc}
              kinFront={kinFront}
              kinRear={kinRear}
              preset={activePreset ?? null}
              axleEnd={axleEnd}
              engineeringDebug={engineeringDebugMode}
              springRateNmm={springRateNmm}
              springStrokeMm={springStrokeMm}
              damperStrokeMm={damperStrokeMm}
              damperLinearDampingCoeff={damperLinearDampingCoeff}
            />
            <p className="text-[9px] text-neutral-500">
              Stock / țintă: <span className="text-sky-200/80">declared</span> din doc + preset. L/R la stock =
              fereastra OEM când există în date. <span className="text-violet-200/80">Curent</span> = camber de la
              banc (manual).
            </p>
          </div>
        ) : (
          <p className="mt-2 text-[10px] text-neutral-500">Profil OEM detaliat indisponibil pentru acest preset.</p>
        )}
        {validation.length > 0 ? (
          <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-[10px]">
            {validation.map((m, i) => (
              <li
                key={i}
                className={
                  m.level === "block"
                    ? "text-rose-300"
                    : m.level === "warn"
                      ? "text-amber-200/90"
                      : "text-neutral-400"
                }
              >
                {m.text}
              </li>
            ))}
          </ul>
        ) : null}
        <div
          id="sd-setup-synthesis"
          className={[
            "mt-3 rounded-lg border border-white/10 bg-black/20 p-2",
            leftStripActiveModule === "analysis" ? "ring-2 ring-cyan-400/35" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <p className="text-[9px] font-semibold uppercase tracking-wide text-cyan-200/85">
            Setup synthesis (rule-based)
          </p>
          <p className="mt-1 text-[8px] leading-snug text-neutral-500">
            Din motorul de calcule: vehicul + geometrie + suspensie simplificată + drivetrain + anvelope + aero
            — nu fizică completă.
          </p>
          <ul className="mt-1.5 list-inside list-disc space-y-0.5 text-[9px] leading-snug text-neutral-300">
            {dynReport.setupAssistant.summaryLines.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-b border-white/10 p-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-400/80">
          Recommended parts
        </p>
        <p className="text-[10px] leading-relaxed text-neutral-500">
          Nu există catalog de piese în acest modul. Integrarea cu magazinul poate veni ulterior.
        </p>
      </div>

      <div className="border-b border-white/10 p-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-400/80">
          Configuration
        </p>
        <h2 className="text-sm font-semibold text-white">Camber plates</h2>
      </div>

      <div className="space-y-4 p-3">
        <SuspensionHardwareSections />
      </div>

      <div id="sd-kinematics-readouts" className="border-t border-white/10 p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-400/80">Kinematics</p>
          <label className="flex cursor-pointer items-center gap-1.5 text-[9px] text-neutral-500">
            <input
              type="checkbox"
              className="rounded border-white/20 bg-black/40"
              checked={engineeringDebugMode}
              onChange={(e) => setEngineeringDebugMode(e.target.checked)}
            />
            Eng. debug
          </label>
        </div>
        <div className="rounded-xl border border-white/10 bg-[#12181f] p-3">
          <MetricTraceRow
            label="Camber (model 2D)"
            value={g.camberDeg.display}
            source={g.camberDeg.source}
            explanation={g.camberDeg.explanation}
            simulated={g.camberDeg.simulated}
            engineeringDebug={engineeringDebugMode}
            debug={tracedScalarDebug(g.camberDeg)}
          />
          <MetricTraceRow
            label="Camber gain (local)"
            value={g.camberGainDegPerMm.display}
            source={g.camberGainDegPerMm.source}
            explanation={g.camberGainDegPerMm.explanation}
            simulated={g.camberGainDegPerMm.simulated}
            engineeringDebug={engineeringDebugMode}
            debug={tracedScalarDebug(g.camberGainDegPerMm)}
          />
          <MetricTraceRow
            label="Camber gain class"
            value={g.camberGainClass.value}
            source={g.camberGainClass.source}
            explanation={g.camberGainClass.explanation}
            simulated={g.camberGainClass.simulated}
            engineeringDebug={engineeringDebugMode}
            debug={{
              formula: g.camberGainClass.formula,
              inputs: g.camberGainClass.inputs,
              confidence: g.camberGainClass.confidence,
              kinematicallySimulated: g.camberGainClass.simulated,
            }}
          />
          <MetricTraceRow
            label="Spring length"
            value={g.springLengthMm.display}
            source={g.springLengthMm.source}
            explanation={g.springLengthMm.explanation}
            simulated={g.springLengthMm.simulated}
            engineeringDebug={engineeringDebugMode}
            debug={tracedScalarDebug(g.springLengthMm)}
          />
          <MetricTraceRow
            label="Damper length"
            value={g.damperLengthMm.display}
            source={g.damperLengthMm.source}
            explanation={g.damperLengthMm.explanation}
            simulated={g.damperLengthMm.simulated}
            engineeringDebug={engineeringDebugMode}
            debug={tracedScalarDebug(g.damperLengthMm)}
          />
          <MetricTraceRow
            label={layoutSep ? "MR spring (ΔL/Δtravel)" : "Motion ratio (coilover)"}
            value={g.mrSpring.display}
            source={g.mrSpring.source}
            explanation={g.mrSpring.explanation}
            simulated={g.mrSpring.simulated}
            engineeringDebug={engineeringDebugMode}
            debug={tracedScalarDebug(g.mrSpring)}
          />
          {layoutSep ? (
            <MetricTraceRow
              label="MR damper (ΔL/Δtravel)"
              value={g.mrDamper.display}
              source={g.mrDamper.source}
              explanation={g.mrDamper.explanation}
              simulated={g.mrDamper.simulated}
              engineeringDebug={engineeringDebugMode}
              debug={tracedScalarDebug(g.mrDamper)}
            />
          ) : null}
          <MetricTraceRow
            label="Wheel rate"
            value={g.wheelRateNmm.display}
            source={g.wheelRateNmm.source}
            explanation={g.wheelRateNmm.explanation}
            simulated={g.wheelRateNmm.simulated}
            engineeringDebug={engineeringDebugMode}
            debug={tracedScalarDebug(g.wheelRateNmm)}
          />
          <MetricTraceRow
            label="Damping @ wheel (rel.)"
            value={g.dampingAtWheelRel.display}
            source={g.dampingAtWheelRel.source}
            explanation={g.dampingAtWheelRel.explanation}
            simulated={g.dampingAtWheelRel.simulated}
            engineeringDebug={engineeringDebugMode}
            debug={tracedScalarDebug(g.dampingAtWheelRel)}
          />
          <MetricTraceRow
            label="Toe (current)"
            value="—"
            source="placeholder"
            explanation="Not simulated — use OEM / Target columns for declared toe only."
            simulated={false}
            engineeringDebug={engineeringDebugMode}
            debug={{
              formula: "n/a",
              inputs: "n/a",
              confidence: "n/a",
              kinematicallySimulated: false,
            }}
          />
          <MetricTraceRow
            label="Caster (current)"
            value="—"
            source="placeholder"
            explanation="Not simulated — reference OEM stock / preset target (front) only."
            simulated={false}
            engineeringDebug={engineeringDebugMode}
            debug={{
              formula: "n/a",
              inputs: "n/a",
              confidence: "n/a",
              kinematicallySimulated: false,
            }}
          />
          <MetricTraceRow
            label="Roll center height"
            value="—"
            source="placeholder"
            explanation="Not computed in this app — do not infer from chart or Optimize mode."
            simulated={false}
            engineeringDebug={engineeringDebugMode}
            debug={{
              formula: "n/a",
              inputs: "n/a",
              confidence: "n/a",
              kinematicallySimulated: false,
            }}
          />
        </div>
      </div>

      {showChart && (
        <div className="border-t border-white/10 p-3 pb-6">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-400/80">
            Camber vs travel
          </p>
          <p className="mb-1.5 text-[9px] leading-snug text-neutral-500">
            Axa Y: camber <span className="text-emerald-200/85">derivat</span> din preset{" "}
            <span className="font-mono text-neutral-400">camberTop→camberBottom</span> (ca la Kinematics).
            Sweep −50…+50 mm bump; linia roz = poziția cursorului de travel.
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
      <TireSlipInterpretationPanel />
    </aside>
  );
}
