import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import bmwE46TopdownWireframeWhite from "../assets/reference/bmw-e46-topdown-wireframe-white.png";
import {
  DEFAULT_STAND_DIAGRAM_GUIDE,
  parseLocaleFloat,
  standBodyDiagonalsFromWheelbaseTrackMm,
  standDeltaLabel,
  standMetricStatus,
  standStatusClass,
  standStatusFillClass,
  type StandMetricStatus,
} from "../data/standAlignmentForm";
import { useSuspensionAssistantStore } from "../store/suspensionAssistantStore";
import { SaveSuspensionConfigurationButton } from "./SaveSuspensionConfigurationButton";

function worstStatus(a: StandMetricStatus, b: StandMetricStatus): StandMetricStatus {
  if (a === "bad" || b === "bad") return "bad";
  if (a === "ref" && b === "ref") return "ref";
  if (a === "ref") return b;
  if (b === "ref") return a;
  return "ok";
}

function InputPair(props: {
  label: string;
  unit: string;
  current: string;
  target: string;
  onCurrent: (v: string) => void;
  onTarget: (v: string) => void;
  status: StandMetricStatus;
  dense?: boolean;
}) {
  const { label, unit, current, target, onCurrent, onTarget, status, dense } = props;
  const base =
    "w-full rounded border bg-black/45 px-1.5 py-1 font-mono text-[10px] outline-none focus:border-violet-400/65 focus:ring-1 focus:ring-violet-500/25";
  return (
    <div className={dense ? "space-y-0.5" : "space-y-1"}>
      <div className="flex items-center justify-between gap-1">
        <span className="text-[9px] text-neutral-500">{label}</span>
        <span className="text-[8px] text-neutral-600">{unit}</span>
      </div>
      <div className="grid grid-cols-2 gap-1">
        <div className="min-w-0">
          <span className="text-[7px] uppercase tracking-wide text-neutral-600">Curent</span>
          <input
            type="text"
            inputMode="decimal"
            value={current}
            onChange={(e) => onCurrent(e.target.value)}
            className={[base, standStatusClass(status)].join(" ")}
            aria-label={`${label} curent`}
          />
        </div>
        <div className="min-w-0">
          <span className="text-[7px] uppercase tracking-wide text-neutral-600">Țintă</span>
          <input
            type="text"
            inputMode="decimal"
            value={target}
            onChange={(e) => onTarget(e.target.value)}
            className={`${base} border-violet-500/40 text-neutral-400`}
            aria-label={`${label} țintă nominală`}
          />
        </div>
      </div>
    </div>
  );
}

function DerivedDiagonalReadout(props: { label: string; formula: string; valueMm: number | null }) {
  const { label, formula, valueMm } = props;
  return (
    <div className="rounded-lg border border-violet-500/25 bg-black/25 px-2 py-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[9px] text-neutral-400">{label}</span>
        <span className="shrink-0 font-mono text-[10px] text-cyan-100/95">
          {valueMm != null ? `${valueMm.toFixed(1)} mm` : "—"}
        </span>
      </div>
      <p className="mt-0.5 text-[7px] leading-relaxed text-neutral-600">{formula}</p>
    </div>
  );
}

function PanelTitle(props: { children: string }) {
  return (
    <p className="border-b border-violet-500/30 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-300">
      {props.children}
    </p>
  );
}

function clampDiagramVb(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

/** Mărește distanța vizuală între axa față (sus) și axa spate (jos), în px ecran. */
const STAND_AXLE_SPREAD_EXTRA_SCREEN_PX = 40;
/**
 * Nudge linia cyan axă față (sus): `<line x1="22" … x2="78" y1/y2={frontAxleY}">`.
 * În px ecran — în SVG Y mai mic = mai sus.
 */
const STAND_FRONT_AXLE_NUDGE_UP_SCREEN_PX = 80;
/** Nudge linia cyan axă spate (jos) — în px ecran, Y mai mare = mai jos. */
const STAND_REAR_AXLE_NUDGE_DOWN_SCREEN_PX = 40;
/** Lungime linie thrust galbenă față de distanța axă spate–față. */
const STAND_THRUST_LINE_LENGTH_SCALE = 2;

function AlignmentDiagram(props: {
  thrustDeg: number;
  diagLeft: number | null;
  diagRight: number | null;
  fl: StandMetricStatus;
  fr: StandMetricStatus;
  rl: StandMetricStatus;
  rr: StandMetricStatus;
  /** Ghidaje: coordonate Y în viewBox (0–100), fața mașinii = sus. */
  guideFrontY: number;
  guideRearY: number;
  guideSymmetryY1: number;
  guideSymmetryY2: number;
  /** Capăt față al liniei de thrust (lângă bot / axă longitudinală). */
  guideThrustFrontY: number;
}) {
  const {
    thrustDeg,
    diagLeft,
    diagRight,
    fl,
    fr,
    rl,
    rr,
    guideFrontY,
    guideRearY,
    guideSymmetryY1,
    guideSymmetryY2,
  } = props;
  const thrustVisual = Math.max(-1.2, Math.min(1.2, thrustDeg)) * 6;
  const shellRef = useRef<HTMLDivElement | null>(null);
  const [diagramHeightPx, setDiagramHeightPx] = useState(400);

  useLayoutEffect(() => {
    const el = shellRef.current;
    if (!el) return;
    const sync = () => {
      const h = el.getBoundingClientRect().height;
      if (h > 0) setDiagramHeightPx(h);
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const spreadHalfVb = (STAND_AXLE_SPREAD_EXTRA_SCREEN_PX / 2 / diagramHeightPx) * 100;
  const frontAxleNudgeUpVb = (STAND_FRONT_AXLE_NUDGE_UP_SCREEN_PX / diagramHeightPx) * 100;
  /** Axă față (linia cyan orizontală sus) — roți față + diagonale pornesc de aici. */
  const rearAxleNudgeDownVb = (STAND_REAR_AXLE_NUDGE_DOWN_SCREEN_PX / diagramHeightPx) * 100;
  const frontAxleY = clampDiagramVb(guideFrontY - spreadHalfVb - frontAxleNudgeUpVb);
  /** Axă spate (linia cyan orizontală jos) */
  const rearAxleY = clampDiagramVb(guideRearY + spreadHalfVb + rearAxleNudgeDownVb);

  const thrustBaseX1 = 50 - thrustVisual * 0.15;
  const thrustBaseX2 = 50 + thrustVisual;
  const thrustMidX = (thrustBaseX1 + thrustBaseX2) / 2;
  const thrustMidY = (rearAxleY + frontAxleY) / 2;
  const thrustHalfDx = (thrustBaseX2 - thrustBaseX1) / 2;
  const thrustHalfDy = (rearAxleY - frontAxleY) / 2;
  const thrustLineX1 = clampDiagramVb(thrustMidX - thrustHalfDx * STAND_THRUST_LINE_LENGTH_SCALE);
  const thrustLineY1 = clampDiagramVb(thrustMidY + thrustHalfDy * STAND_THRUST_LINE_LENGTH_SCALE);
  const thrustLineX2 = clampDiagramVb(thrustMidX + thrustHalfDx * STAND_THRUST_LINE_LENGTH_SCALE);
  const thrustLineY2 = clampDiagramVb(thrustMidY - thrustHalfDy * STAND_THRUST_LINE_LENGTH_SCALE);

  return (
    <div className="relative mx-auto w-full max-w-[min(100%,420px)] overflow-hidden rounded-lg border border-violet-500/35 bg-[#05070a]">
      <div ref={shellRef} className="relative aspect-[644/1024] w-full overflow-hidden">
        <img
          src={bmwE46TopdownWireframeWhite}
          alt="BMW E46 — wireframe vedere de sus, față în sus"
          className="pointer-events-none absolute left-1/2 top-1/2 max-h-full max-w-full w-auto select-none object-contain"
          style={{
            height: "100%",
            transform: "translate(calc(-50% + 20px), -50%) rotate(-90deg) scale(1.336)",
          }}
          draggable={false}
          decoding="async"
        />
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="xMidYMid meet"
          aria-hidden="true"
        >
          <defs>
            <marker id="sd-stand-align-arr" markerWidth="4" markerHeight="4" refX="3" refY="2" orient="auto">
              <path d="M0,0 L4,2 L0,4 Z" fill="rgba(148,163,184,0.75)" />
            </marker>
          </defs>

          {/* Reference / symmetry (gray) */}
          <line
            x1="50"
            y1={guideSymmetryY1}
            x2="50"
            y2={guideSymmetryY2}
            stroke="rgba(148,163,184,0.35)"
            strokeWidth="0.35"
            strokeDasharray="1.2 1"
          />

          {/* Thrust angle — linie galbenă (lungime × STAND_THRUST_LINE_LENGTH_SCALE) */}
          <line
            x1={thrustLineX1}
            y1={thrustLineY1}
            x2={thrustLineX2}
            y2={thrustLineY2}
            stroke="rgba(251,191,36,0.85)"
            strokeWidth="0.45"
          />

          {/* Wheel positions */}
          <circle cx="24" cy={frontAxleY} r="2.8" className={standStatusFillClass(fl)} stroke="rgba(0,0,0,0.45)" strokeWidth="0.2" />
          <circle cx="76" cy={frontAxleY} r="2.8" className={standStatusFillClass(fr)} stroke="rgba(0,0,0,0.45)" strokeWidth="0.2" />
          <circle cx="24" cy={rearAxleY} r="2.8" className={standStatusFillClass(rl)} stroke="rgba(0,0,0,0.45)" strokeWidth="0.2" />
          <circle cx="76" cy={rearAxleY} r="2.8" className={standStatusFillClass(rr)} stroke="rgba(0,0,0,0.45)" strokeWidth="0.2" />

          {/* Axă față (sus) — linia cyan */}
          <line
            x1="22"
            y1={frontAxleY}
            x2="78"
            y2={frontAxleY}
            stroke="rgba(56,189,248,0.55)"
            strokeWidth="0.35"
          />
          {/* Axă spate (jos) — linia cyan */}
          <line
            x1="22"
            y1={rearAxleY}
            x2="78"
            y2={rearAxleY}
            stroke="rgba(56,189,248,0.45)"
            strokeWidth="0.35"
          />

          {/* Diagonals (body check) */}
          <line
            x1="24"
            y1={frontAxleY}
            x2="76"
            y2={rearAxleY}
            stroke={
              diagLeft != null && diagRight != null && Math.abs(diagLeft - diagRight) > 1
                ? "rgba(244,63,94,0.45)"
                : "rgba(148,163,184,0.28)"
            }
            strokeWidth="0.28"
            strokeDasharray="1.5 1.2"
          />
          <line
            x1="76"
            y1={frontAxleY}
            x2="24"
            y2={rearAxleY}
            stroke={
              diagLeft != null && diagRight != null && Math.abs(diagLeft - diagRight) > 1
                ? "rgba(244,63,94,0.45)"
                : "rgba(148,163,184,0.28)"
            }
            strokeWidth="0.28"
            strokeDasharray="1.5 1.2"
          />

          {/* Wheelbase side arrows (schematic) */}
          <line
            x1="17"
            y1={frontAxleY}
            x2="17"
            y2={rearAxleY}
            stroke="rgba(148,163,184,0.4)"
            strokeWidth="0.25"
            markerEnd="url(#sd-stand-align-arr)"
          />
          <line x1="83" y1={frontAxleY} x2="83" y2={rearAxleY} stroke="rgba(148,163,184,0.4)" strokeWidth="0.25" />

          <text x="50" y="6.5" textAnchor="middle" fill="rgba(148,163,184,0.75)" fontSize="3.2">
            Thrust angle · axă · diagonale
          </text>
        </svg>
      </div>
    </div>
  );
}

export function OemStandAlignmentModal() {
  const open = useSuspensionAssistantStore((s) => s.standAlignmentModalOpen);
  const setOpen = useSuspensionAssistantStore((s) => s.setStandAlignmentModalOpen);
  const applyOemStockBaselineSession = useSuspensionAssistantStore((s) => s.applyOemStockBaselineSession);
  const stockSetupMode = useSuspensionAssistantStore((s) => s.stockSetupMode);

  const form = useSuspensionAssistantStore((s) => s.standAlignmentForm);
  const targets = useSuspensionAssistantStore((s) => s.standAlignmentTargets);
  const patchStandAlignmentForm = useSuspensionAssistantStore((s) => s.patchStandAlignmentForm);
  const patchStandAlignmentTargets = useSuspensionAssistantStore((s) => s.patchStandAlignmentTargets);
  const standDiagramGuide = useSuspensionAssistantStore((s) => s.standDiagramGuide);
  const setStandDiagramGuide = useSuspensionAssistantStore((s) => s.setStandDiagramGuide);
  const tolDeg = useSuspensionAssistantStore((s) => s.standReportToleranceDegStr);
  const tolMin = useSuspensionAssistantStore((s) => s.standReportToleranceMinStr);
  const tolMm = useSuspensionAssistantStore((s) => s.standReportToleranceMmStr);
  const patchStandReportTolerances = useSuspensionAssistantStore((s) => s.patchStandReportTolerances);
  const resetStandAlignmentReport = useSuspensionAssistantStore((s) => s.resetStandAlignmentReport);
  const patchStandFormCorner = useSuspensionAssistantStore((s) => s.patchStandFormCorner);
  const patchStandTargetsCorner = useSuspensionAssistantStore((s) => s.patchStandTargetsCorner);

  const td = useMemo(() => parseLocaleFloat(tolDeg) ?? 0.25, [tolDeg]);
  const tm = useMemo(() => parseLocaleFloat(tolMin) ?? 5, [tolMin]);
  const tmm = useMemo(() => parseLocaleFloat(tolMm) ?? 2, [tolMm]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  const sFlC = standMetricStatus(form.frontLeft.camberDeg, targets.frontLeft.camberDeg, td, "deg");
  const sFlT = standMetricStatus(form.frontLeft.toeMin, targets.frontLeft.toeMin, tm, "min");
  const sFlS = standMetricStatus(form.frontLeft.casterDeg, targets.frontLeft.casterDeg, td, "deg");
  const cornerFl = worstStatus(worstStatus(sFlC, sFlT), sFlS);

  const sFrC = standMetricStatus(form.frontRight.camberDeg, targets.frontRight.camberDeg, td, "deg");
  const sFrT = standMetricStatus(form.frontRight.toeMin, targets.frontRight.toeMin, tm, "min");
  const sFrS = standMetricStatus(form.frontRight.casterDeg, targets.frontRight.casterDeg, td, "deg");
  const cornerFr = worstStatus(worstStatus(sFrC, sFrT), sFrS);

  const sRlC = standMetricStatus(form.rearLeft.camberDeg, targets.rearLeft.camberDeg, td, "deg");
  const sRlT = standMetricStatus(form.rearLeft.toeMin, targets.rearLeft.toeMin, tm, "min");
  const cornerRl = worstStatus(sRlC, sRlT);

  const sRrC = standMetricStatus(form.rearRight.camberDeg, targets.rearRight.camberDeg, td, "deg");
  const sRrT = standMetricStatus(form.rearRight.toeMin, targets.rearRight.toeMin, tm, "min");
  const cornerRr = worstStatus(sRrC, sRrT);

  const bodyDiagonals = useMemo(() => {
    const wb = parseLocaleFloat(form.wheelbaseMm);
    const tf = parseLocaleFloat(form.trackFrontMm);
    if (wb == null || tf == null) return null;
    return standBodyDiagonalsFromWheelbaseTrackMm(wb, tf);
  }, [form.wheelbaseMm, form.trackFrontMm]);

  const thrustDeg = parseLocaleFloat(form.thrustAngleDeg) ?? 0;
  const dL = bodyDiagonals?.leftMm ?? null;
  const dR = bodyDiagonals?.rightMm ?? null;

  const titleId = "sd-oem-stand-alignment-modal-title";

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[88] flex items-center justify-center bg-black/80 p-2 backdrop-blur-sm sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={() => setOpen(false)}
    >
      <div
        className="flex max-h-[min(96dvh,980px)] w-full max-w-[1200px] flex-col overflow-hidden rounded-xl border border-violet-500/35 bg-[#080c11] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex shrink-0 flex-wrap items-start justify-between gap-3 border-b border-violet-500/25 px-4 py-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-400/85">Alignment Check</p>
            <h2 id={titleId} className="mt-0.5 text-base font-semibold text-white">
              Raport geometrie — date stand 3D
            </h2>
            <p className="mt-1 max-w-2xl text-[10px] leading-relaxed text-neutral-500">
              Fișă tehnică: Alignment Check, Body Dimensions (ampatament, ecartamente, diagonale **derivate** din acestea),
              Total Toe, Thrust Angle. Verde = în toleranță, roșu = în afara toleranței, gri = fără măsură / referință.
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <div className="rounded-lg border border-violet-500/35 bg-black/30 px-2 py-1.5">
              <p className="text-[8px] font-semibold uppercase tracking-wide text-neutral-500">Toleranțe ±</p>
              <div className="mt-1 flex flex-wrap gap-2">
                <label className="flex flex-col text-[8px] text-neutral-500">
                  Unghi (°)
                  <input
                    className="mt-0.5 w-14 rounded border border-violet-500/40 bg-black/50 px-1 py-0.5 font-mono text-[10px] text-white"
                    value={tolDeg}
                    onChange={(e) => patchStandReportTolerances({ deg: e.target.value })}
                  />
                </label>
                <label className="flex flex-col text-[8px] text-neutral-500">
                  Toe (′)
                  <input
                    className="mt-0.5 w-14 rounded border border-violet-500/40 bg-black/50 px-1 py-0.5 font-mono text-[10px] text-white"
                    value={tolMin}
                    onChange={(e) => patchStandReportTolerances({ min: e.target.value })}
                  />
                </label>
                <label className="flex flex-col text-[8px] text-neutral-500">
                  Liniar (mm)
                  <input
                    className="mt-0.5 w-14 rounded border border-violet-500/40 bg-black/50 px-1 py-0.5 font-mono text-[10px] text-white"
                    value={tolMm}
                    onChange={(e) => patchStandReportTolerances({ mm: e.target.value })}
                  />
                </label>
              </div>
            </div>
            <button
              type="button"
              className="rounded-lg border border-violet-500/40 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-neutral-300 hover:bg-violet-950/40"
              onClick={() => setOpen(false)}
            >
              Închide
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,260px)_minmax(0,1fr)_minmax(0,260px)]">
            {/* Left — Alignment Check */}
            <div className="flex flex-col gap-3 rounded-lg border border-violet-500/30 bg-[#0a0e14] p-3">
              <PanelTitle>Alignment Check</PanelTitle>

              <div className="space-y-2">
                <p className="text-[9px] font-semibold text-cyan-200/80">Front Left</p>
                <InputPair
                  label="Camber"
                  unit="°"
                  current={form.frontLeft.camberDeg}
                  target={targets.frontLeft.camberDeg}
                  onCurrent={(v) => patchStandFormCorner("frontLeft", { camberDeg: v })}
                  onTarget={(v) => patchStandTargetsCorner("frontLeft", { camberDeg: v })}
                  status={sFlC}
                  dense
                />
                <InputPair
                  label="Toe"
                  unit="′"
                  current={form.frontLeft.toeMin}
                  target={targets.frontLeft.toeMin}
                  onCurrent={(v) => patchStandFormCorner("frontLeft", { toeMin: v })}
                  onTarget={(v) => patchStandTargetsCorner("frontLeft", { toeMin: v })}
                  status={sFlT}
                  dense
                />
                <InputPair
                  label="Caster"
                  unit="°"
                  current={form.frontLeft.casterDeg}
                  target={targets.frontLeft.casterDeg}
                  onCurrent={(v) => patchStandFormCorner("frontLeft", { casterDeg: v })}
                  onTarget={(v) => patchStandTargetsCorner("frontLeft", { casterDeg: v })}
                  status={sFlS}
                  dense
                />
              </div>

              <div className="space-y-2 border-t border-violet-500/20 pt-2">
                <p className="text-[9px] font-semibold text-cyan-200/80">Front Right</p>
                <InputPair
                  label="Camber"
                  unit="°"
                  current={form.frontRight.camberDeg}
                  target={targets.frontRight.camberDeg}
                  onCurrent={(v) => patchStandFormCorner("frontRight", { camberDeg: v })}
                  onTarget={(v) => patchStandTargetsCorner("frontRight", { camberDeg: v })}
                  status={sFrC}
                  dense
                />
                <InputPair
                  label="Toe"
                  unit="′"
                  current={form.frontRight.toeMin}
                  target={targets.frontRight.toeMin}
                  onCurrent={(v) => patchStandFormCorner("frontRight", { toeMin: v })}
                  onTarget={(v) => patchStandTargetsCorner("frontRight", { toeMin: v })}
                  status={sFrT}
                  dense
                />
                <InputPair
                  label="Caster"
                  unit="°"
                  current={form.frontRight.casterDeg}
                  target={targets.frontRight.casterDeg}
                  onCurrent={(v) => patchStandFormCorner("frontRight", { casterDeg: v })}
                  onTarget={(v) => patchStandTargetsCorner("frontRight", { casterDeg: v })}
                  status={sFrS}
                  dense
                />
              </div>

              <div className="space-y-2 border-t border-violet-500/20 pt-2">
                <p className="text-[9px] font-semibold text-cyan-200/80">Rear Left</p>
                <InputPair
                  label="Camber"
                  unit="°"
                  current={form.rearLeft.camberDeg}
                  target={targets.rearLeft.camberDeg}
                  onCurrent={(v) => patchStandFormCorner("rearLeft", { camberDeg: v })}
                  onTarget={(v) => patchStandTargetsCorner("rearLeft", { camberDeg: v })}
                  status={sRlC}
                  dense
                />
                <InputPair
                  label="Toe"
                  unit="′"
                  current={form.rearLeft.toeMin}
                  target={targets.rearLeft.toeMin}
                  onCurrent={(v) => patchStandFormCorner("rearLeft", { toeMin: v })}
                  onTarget={(v) => patchStandTargetsCorner("rearLeft", { toeMin: v })}
                  status={sRlT}
                  dense
                />
              </div>

              <div className="space-y-2 border-t border-violet-500/20 pt-2">
                <p className="text-[9px] font-semibold text-cyan-200/80">Rear Right</p>
                <InputPair
                  label="Camber"
                  unit="°"
                  current={form.rearRight.camberDeg}
                  target={targets.rearRight.camberDeg}
                  onCurrent={(v) => patchStandFormCorner("rearRight", { camberDeg: v })}
                  onTarget={(v) => patchStandTargetsCorner("rearRight", { camberDeg: v })}
                  status={sRrC}
                  dense
                />
                <InputPair
                  label="Toe"
                  unit="′"
                  current={form.rearRight.toeMin}
                  target={targets.rearRight.toeMin}
                  onCurrent={(v) => patchStandFormCorner("rearRight", { toeMin: v })}
                  onTarget={(v) => patchStandTargetsCorner("rearRight", { toeMin: v })}
                  status={sRrT}
                  dense
                />
              </div>

              <div className="space-y-2 border-t border-violet-500/20 pt-2">
                <InputPair
                  label="Total Toe față"
                  unit="′"
                  current={form.totalToeFrontMin}
                  target={targets.totalToeFrontMin}
                  onCurrent={(v) => patchStandAlignmentForm({ totalToeFrontMin: v })}
                  onTarget={(v) => patchStandAlignmentTargets({ totalToeFrontMin: v })}
                  status={standMetricStatus(form.totalToeFrontMin, targets.totalToeFrontMin, tm, "min")}
                />
                <InputPair
                  label="Total Toe spate"
                  unit="′"
                  current={form.totalToeRearMin}
                  target={targets.totalToeRearMin}
                  onCurrent={(v) => patchStandAlignmentForm({ totalToeRearMin: v })}
                  onTarget={(v) => patchStandAlignmentTargets({ totalToeRearMin: v })}
                  status={standMetricStatus(form.totalToeRearMin, targets.totalToeRearMin, tm, "min")}
                />
                <InputPair
                  label="Thrust Angle"
                  unit="°"
                  current={form.thrustAngleDeg}
                  target={targets.thrustAngleDeg}
                  onCurrent={(v) => patchStandAlignmentForm({ thrustAngleDeg: v })}
                  onTarget={(v) => patchStandAlignmentTargets({ thrustAngleDeg: v })}
                  status={standMetricStatus(form.thrustAngleDeg, targets.thrustAngleDeg, td, "deg")}
                />
              </div>
            </div>

            {/* Center */}
            <div className="flex min-w-0 flex-col gap-3">
              <AlignmentDiagram
                thrustDeg={thrustDeg}
                diagLeft={dL}
                diagRight={dR}
                fl={cornerFl}
                fr={cornerFr}
                rl={cornerRl}
                rr={cornerRr}
                guideFrontY={standDiagramGuide.frontY}
                guideRearY={standDiagramGuide.rearY}
                guideSymmetryY1={standDiagramGuide.symmetryY1}
                guideSymmetryY2={standDiagramGuide.symmetryY2}
                guideThrustFrontY={standDiagramGuide.thrustFrontY}
              />
              <div className="rounded-lg border border-violet-500/30 bg-[#0a0e14] p-2.5">
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <div>
                    <p className="text-[9px] font-semibold uppercase tracking-wide text-violet-200/90">
                      Calibrare ghidaje diagramă
                    </p>
                    <p className="mt-0.5 max-w-md text-[8px] leading-relaxed text-neutral-500">
                      Ajustează poziția liniilor în spațiul SVG (0 = sus, 100 = jos). Valori tipice 10–90. Poți folosi
                      și tastatura (↑/↓ în câmp după focus).
                    </p>
                  </div>
                  <button
                    type="button"
                    className="shrink-0 rounded-md border border-violet-500/40 px-2 py-1 text-[8px] font-semibold uppercase tracking-wide text-violet-100 hover:bg-violet-950/50"
                    onClick={() => setStandDiagramGuide({ ...DEFAULT_STAND_DIAGRAM_GUIDE })}
                  >
                    Reset ghidaje
                  </button>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <label className="flex flex-col gap-0.5" htmlFor="sd-diag-y-front">
                    <span className="text-[8px] text-neutral-500">Punte față (Y)</span>
                    <input
                      id="sd-diag-y-front"
                      type="number"
                      step={0.25}
                      min={0}
                      max={100}
                      value={standDiagramGuide.frontY}
                      onChange={(e) => setStandDiagramGuide({ frontY: clampDiagramVb(Number(e.target.value)) })}
                      className="w-full rounded border border-violet-500/35 bg-black/50 px-1.5 py-1 font-mono text-[10px] text-white"
                    />
                  </label>
                  <label className="flex flex-col gap-0.5" htmlFor="sd-diag-y-rear">
                    <span className="text-[8px] text-neutral-500">Punte spate (Y)</span>
                    <input
                      id="sd-diag-y-rear"
                      type="number"
                      step={0.25}
                      min={0}
                      max={100}
                      value={standDiagramGuide.rearY}
                      onChange={(e) => setStandDiagramGuide({ rearY: clampDiagramVb(Number(e.target.value)) })}
                      className="w-full rounded border border-violet-500/35 bg-black/50 px-1.5 py-1 font-mono text-[10px] text-white"
                    />
                  </label>
                  <label className="flex flex-col gap-0.5" htmlFor="sd-diag-sym-y1">
                    <span className="text-[8px] text-neutral-500">Axă simetrie — sus (Y₁)</span>
                    <input
                      id="sd-diag-sym-y1"
                      type="number"
                      step={0.25}
                      min={0}
                      max={100}
                      value={standDiagramGuide.symmetryY1}
                      onChange={(e) => setStandDiagramGuide({ symmetryY1: clampDiagramVb(Number(e.target.value)) })}
                      className="w-full rounded border border-violet-500/35 bg-black/50 px-1.5 py-1 font-mono text-[10px] text-white"
                    />
                  </label>
                  <label className="flex flex-col gap-0.5" htmlFor="sd-diag-sym-y2">
                    <span className="text-[8px] text-neutral-500">Axă simetrie — jos (Y₂)</span>
                    <input
                      id="sd-diag-sym-y2"
                      type="number"
                      step={0.25}
                      min={0}
                      max={100}
                      value={standDiagramGuide.symmetryY2}
                      onChange={(e) => setStandDiagramGuide({ symmetryY2: clampDiagramVb(Number(e.target.value)) })}
                      className="w-full rounded border border-violet-500/35 bg-black/50 px-1.5 py-1 font-mono text-[10px] text-white"
                    />
                  </label>
                  <label className="flex flex-col gap-0.5" htmlFor="sd-diag-thrust-y">
                    <span className="text-[8px] text-neutral-500">Thrust — capăt față (Y)</span>
                    <input
                      id="sd-diag-thrust-y"
                      type="number"
                      step={0.25}
                      min={0}
                      max={100}
                      value={standDiagramGuide.thrustFrontY}
                      onChange={(e) => setStandDiagramGuide({ thrustFrontY: clampDiagramVb(Number(e.target.value)) })}
                      className="w-full rounded border border-violet-500/35 bg-black/50 px-1.5 py-1 font-mono text-[10px] text-white"
                    />
                  </label>
                </div>
              </div>
              <div className="rounded-lg border border-violet-500/30 bg-[#0a0e14] px-3 py-2 text-[9px] text-neutral-500">
                <p className="font-semibold uppercase tracking-wide text-neutral-400">Legendă</p>
                <ul className="mt-1 list-inside list-disc space-y-0.5">
                  <li>Linie gri punctată: axă longitudinală — o poți muta din „Calibrare ghidaje diagramă” (Y₁ / Y₂).</li>
                  <li>Linie galbenă: Thrust line (derivată din unghiul introdus)</li>
                  <li>Cercuri roți: stare agregată camber + toe față de țintă</li>
                  <li>
                    Diagonale: derivate din ampatament + ecartament față (model dreptunghi); culoare roșie dacă L și R
                    diferă (în practică doar la geometrie asimetrică).
                  </li>
                </ul>
              </div>
            </div>

            {/* Right — Body Dimensions Check */}
            <div className="flex flex-col gap-3 rounded-lg border border-violet-500/30 bg-[#0a0e14] p-3">
              <PanelTitle>Body Dimensions Check</PanelTitle>
              <InputPair
                label="Ampatament"
                unit="mm"
                current={form.wheelbaseMm}
                target={targets.wheelbaseMm}
                onCurrent={(v) => patchStandAlignmentForm({ wheelbaseMm: v })}
                onTarget={(v) => patchStandAlignmentTargets({ wheelbaseMm: v })}
                status={standMetricStatus(form.wheelbaseMm, targets.wheelbaseMm, tmm, "mm")}
              />
              <InputPair
                label="Ecartament față"
                unit="mm"
                current={form.trackFrontMm}
                target={targets.trackFrontMm}
                onCurrent={(v) => patchStandAlignmentForm({ trackFrontMm: v })}
                onTarget={(v) => patchStandAlignmentTargets({ trackFrontMm: v })}
                status={standMetricStatus(form.trackFrontMm, targets.trackFrontMm, tmm, "mm")}
              />
              <InputPair
                label="Ecartament spate"
                unit="mm"
                current={form.trackRearMm}
                target={targets.trackRearMm}
                onCurrent={(v) => patchStandAlignmentForm({ trackRearMm: v })}
                onTarget={(v) => patchStandAlignmentTargets({ trackRearMm: v })}
                status={standMetricStatus(form.trackRearMm, targets.trackRearMm, tmm, "mm")}
              />
              <p className="text-[8px] font-semibold uppercase tracking-wide text-neutral-500">Diagonale (derivate)</p>
              <DerivedDiagonalReadout
                label="Diagonal Left (FL → RR)"
                valueMm={bodyDiagonals?.leftMm ?? null}
                formula="√((x_RR − x_FL)² + (y_RR − y_FL)²); huburi în mm din ampatament + ecartament față (dreptunghi)."
              />
              <DerivedDiagonalReadout
                label="Diagonal Right (FR → RL)"
                valueMm={bodyDiagonals?.rightMm ?? null}
                formula="√((x_RL − x_FR)² + (y_RL − y_FR)²); aceeași bază geometrică."
              />
            </div>
          </div>

          {/* Bottom summary */}
          <div className="mt-3 overflow-x-auto rounded-lg border border-violet-500/30 bg-[#06090e]">
            <table className="w-full min-w-[640px] border-collapse text-left text-[9px]">
              <thead>
                <tr className="border-b border-violet-500/25 text-[8px] uppercase tracking-wide text-neutral-500">
                  <th className="px-2 py-2 font-medium">Parametru</th>
                  <th className="px-2 py-2 font-medium">Curent</th>
                  <th className="px-2 py-2 font-medium">Țintă</th>
                  <th className="px-2 py-2 font-medium">Delta</th>
                  <th className="px-2 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="font-mono text-[10px] text-neutral-300">
                {(
                  [
                    ["FL camber °", form.frontLeft.camberDeg, targets.frontLeft.camberDeg, "deg" as const],
                    ["FR camber °", form.frontRight.camberDeg, targets.frontRight.camberDeg, "deg" as const],
                    ["Total toe față ′", form.totalToeFrontMin, targets.totalToeFrontMin, "min" as const],
                    ["Thrust °", form.thrustAngleDeg, targets.thrustAngleDeg, "deg" as const],
                    ["Ampatament mm", form.wheelbaseMm, targets.wheelbaseMm, "mm" as const],
                    ["Ecartament față mm", form.trackFrontMm, targets.trackFrontMm, "mm" as const],
                    ["Ecartament spate mm", form.trackRearMm, targets.trackRearMm, "mm" as const],
                  ] as const
                ).map(([label, cur, tgt, kind]) => {
                  const tol = kind === "deg" ? td : kind === "min" ? tm : tmm;
                  const st = standMetricStatus(cur, tgt, tol, kind);
                  const statusLabel = st === "ok" ? "OK" : st === "bad" ? "OUT" : "—";
                  const rowCls =
                    st === "ok"
                      ? "text-emerald-200/90"
                      : st === "bad"
                        ? "text-rose-200/90"
                        : "text-neutral-500";
                  return (
                    <tr key={label} className="border-b border-violet-500/15">
                      <td className="px-2 py-1.5 text-neutral-400">{label}</td>
                      <td className="px-2 py-1.5">{cur || "—"}</td>
                      <td className="px-2 py-1.5 text-neutral-500">{tgt || "0"}</td>
                      <td className="px-2 py-1.5">{standDeltaLabel(cur, tgt)}</td>
                      <td className={`px-2 py-1.5 font-semibold ${rowCls}`}>{statusLabel}</td>
                    </tr>
                  );
                })}
                <tr className="border-b border-violet-500/15">
                  <td className="px-2 py-1.5 text-neutral-400">Diagonal L (derivat) mm</td>
                  <td className="px-2 py-1.5">{bodyDiagonals != null ? bodyDiagonals.leftMm.toFixed(1) : "—"}</td>
                  <td className="px-2 py-1.5 text-neutral-500">—</td>
                  <td className="px-2 py-1.5">—</td>
                  <td className="px-2 py-1.5 font-semibold text-neutral-500">—</td>
                </tr>
                <tr className="border-b border-violet-500/15">
                  <td className="px-2 py-1.5 text-neutral-400">Diagonal R (derivat) mm</td>
                  <td className="px-2 py-1.5">{bodyDiagonals != null ? bodyDiagonals.rightMm.toFixed(1) : "—"}</td>
                  <td className="px-2 py-1.5 text-neutral-500">—</td>
                  <td className="px-2 py-1.5">—</td>
                  <td className="px-2 py-1.5 font-semibold text-neutral-500">—</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-violet-500/25 bg-[#070a0f] px-4 py-3">
          <p className="min-w-0 flex-1 text-[9px] text-neutral-500">
            {stockSetupMode ? (
              <span className="text-emerald-200/90">Mod OEM activ în simulare.</span>
            ) : (
              <span>Poți aplica baseline-ul OEM în simulare fără a închide fereastra.</span>
            )}
          </p>
          <div className="flex flex-wrap items-end justify-end gap-2">
            <div className="max-w-[14rem] sm:max-w-none">
              <SaveSuspensionConfigurationButton compact />
            </div>
            <button
              type="button"
              className="rounded-lg border border-violet-500/40 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-neutral-300 hover:bg-violet-950/40"
              onClick={() => resetStandAlignmentReport()}
            >
              Reset câmpuri
            </button>
            <button
              type="button"
              className="rounded-lg border border-emerald-500/35 bg-emerald-500/15 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-emerald-100 hover:bg-emerald-500/25"
              onClick={() => applyOemStockBaselineSession()}
            >
              Aplică baseline OEM (simulare)
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
