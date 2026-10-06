import { useEffect, useId, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import drsRearWingCar from "../../../../assets/active-aero/bmw-e46-red-m-performance-drs.png";
import type { AeroBodyComponentRow } from "../../data/aeroBodyComponents";
import { useActiveAeroData } from "../../hooks/useActiveAeroData";
import { useVehicleAerodynamicData } from "../../hooks/useVehicleAerodynamicData";
import {
  activeAeroModeToComponentEffect,
  getActiveAeroModeEffect,
  modePurpose,
  modeStabilityImpact,
  scaleActiveAeroForce,
  summarizeActiveAeroModes,
  type ActiveAeroComponent,
  type ActiveAeroMode,
  type SelectedActiveAeroMode,
} from "../../lib/activeAero";
import { calculateAerodynamicImpact } from "../../lib/aerodynamicImpact";
import type { SavedGarageCar } from "../../lib/garageStorage";

const EMPTY_COMPONENTS: AeroBodyComponentRow[] = [];
const BASE_CD_FALLBACK = 0.3;
const BASE_FRONT_DOWNFORCE_KG = 0;
const BASE_REAR_DOWNFORCE_KG = 18;
const BASE_DRAG_FORCE_N = 160;
const BASE_FRONT_LIFT_KG_AT_160 = 42;
const SPEED_GAIN_LOW_DRAG_PERCENT = 6.3;
const TOP_SPEED_DRS_OFF_KMH = 252;

type AeroPreset = "street" | "sport" | "track" | "low-drag";
type Tone = "red" | "green" | "blue" | "neutral" | "yellow";
type FlowTone = "red" | "green" | "blue" | "cyan" | "violet" | "amber";
type FlowStyle = CSSProperties & Record<`--${string}`, string | number>;

const speedInputClass =
  "w-20 rounded-md border border-white/10 bg-[#080b10] px-2 py-1 text-right text-[10px] tabular-nums text-neutral-200 outline-none focus:border-cyan-400/45";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function fmt(value: number | null, digits: number, suffix = ""): string {
  if (value == null || !Number.isFinite(value)) return "Not available";
  return `${value.toFixed(digits)}${suffix}`;
}

function fmtCompact(value: number | null, suffix = ""): string {
  if (value == null || !Number.isFinite(value)) return "Not available";
  return `${value % 1 === 0 ? value.toFixed(0) : value.toFixed(1)}${suffix}`;
}

function fmtSigned(value: number | null, digits: number, suffix = ""): string {
  if (value == null || !Number.isFinite(value)) return "Not available";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(digits)}${suffix}`;
}

function fmtSignedCompact(value: number | null, suffix = ""): string {
  if (value == null || !Number.isFinite(value)) return "Not available";
  const sign = value > 0 ? "+" : "";
  const text = value % 1 === 0 ? value.toFixed(0) : value.toFixed(1);
  return `${sign}${text}${suffix}`;
}

function defaultMode(component: ActiveAeroComponent | null | undefined): ActiveAeroMode | null {
  return component?.modes.find((mode) => mode.isDefault) ?? component?.modes[0] ?? null;
}

function modeByType(component: ActiveAeroComponent | null, modeType: string): ActiveAeroMode | null {
  return component?.modes.find((mode) => mode.modeType === modeType) ?? null;
}

function shortModeLabel(mode: ActiveAeroMode): string {
  return mode.name
    .replace("High Downforce / ", "")
    .replace(" / Low Drag", "")
    .replace("DRS / ", "DRS ");
}

function isDrsLowDragMode(mode: ActiveAeroMode | null | undefined): boolean {
  return mode?.modeType === "low_drag" || mode?.modeType === "drs_on";
}

function preferredModeForPreset(component: ActiveAeroComponent, preset: AeroPreset): ActiveAeroMode | null {
  const rearWing = component.componentType === "rear_wing";
  const frontLip = component.componentType === "front_lip" || component.componentType === "front_splitter";
  const preferences =
    preset === "low-drag"
      ? rearWing
        ? ["low_drag", "drs_on", "balanced"]
        : ["retracted", "street"]
      : preset === "track"
        ? rearWing
          ? ["high_downforce", "track", "balanced"]
          : ["track", "sport"]
        : preset === "sport"
          ? rearWing
            ? ["balanced", "high_downforce"]
            : ["sport", "street"]
          : rearWing
            ? ["balanced", "low_drag", "high_downforce"]
            : frontLip
              ? ["street", "retracted"]
              : ["street", "balanced"];

  return (
    preferences
      .map((modeType) => component.modes.find((mode) => mode.modeType === modeType))
      .find((mode): mode is ActiveAeroMode => Boolean(mode)) ??
    defaultMode(component)
  );
}

function modeValueAtSpeed(mode: ActiveAeroMode | null, speedKmh: number) {
  const effect = mode ? getActiveAeroModeEffect(mode) : null;
  const front = scaleActiveAeroForce(effect?.deltaFrontDownforceKg ?? null, speedKmh, effect?.speedKmh ?? 160);
  const rear = scaleActiveAeroForce(effect?.deltaRearDownforceKg ?? null, speedKmh, effect?.speedKmh ?? 160);
  return {
    effect,
    frontDownforceKg: front,
    rearDownforceKg: rear,
    totalDownforceKg: front != null || rear != null ? (front ?? 0) + (rear ?? 0) : null,
    deltaCd: effect?.deltaCd ?? null,
  };
}

function frontBalanceFrom(frontKg: number | null, rearKg: number | null): number | null {
  const front = frontKg ?? 0;
  const rear = rearKg ?? 0;
  const total = front + rear;
  if (total <= 0) return null;
  return (front / total) * 100;
}

function frontLiftReductionPercent(frontDownforceKg: number | null, speedKmh: number): number {
  if (!Number.isFinite(speedKmh) || speedKmh <= 0) return 0;
  const baselineFrontLiftKg = BASE_FRONT_LIFT_KG_AT_160 * (speedKmh / 160) ** 2;
  if (baselineFrontLiftKg <= 0) return 0;
  return clamp(((frontDownforceKg ?? 0) / baselineFrontLiftKg) * 100, 0, 70);
}

function balanceLabel(frontPercent: number | null): string {
  if (frontPercent == null) return "Not available";
  const rear = 100 - frontPercent;
  return `${frontPercent.toFixed(0)} / ${rear.toFixed(0)} %`;
}

function toneClass(tone: Tone): string {
  switch (tone) {
    case "red":
      return "text-red-400";
    case "green":
      return "text-green-400";
    case "blue":
      return "text-blue-400";
    case "yellow":
      return "text-yellow-400";
    default:
      return "text-neutral-200";
  }
}

function flowColor(tone: FlowTone): string {
  switch (tone) {
    case "red":
      return "#ef4444";
    case "green":
      return "#52c65a";
    case "cyan":
      return "#22d3ee";
    case "violet":
      return "#a78bfa";
    case "amber":
      return "#f59e0b";
    default:
      return "#2f81ff";
  }
}

function Panel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-md border border-white/10 bg-[#090c10]/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] ${className}`}>
      {children}
    </div>
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-2 border-b border-white/[0.07] px-4 py-3">
      <h3 className="text-[13px] font-bold uppercase tracking-wide text-neutral-200">{title}</h3>
      <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-white/20 text-[10px] font-bold text-neutral-500">
        i
      </span>
    </div>
  );
}

function ImpactRow({
  label,
  offValue,
  onValue,
  offTone = "red",
  onTone = "green",
}: {
  label: string;
  offValue: string;
  onValue: string;
  offTone?: Tone;
  onTone?: Tone;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_82px_82px] items-center gap-2 py-1.5 text-[10px]">
      <span className="truncate font-medium text-neutral-400">{label}</span>
      <span className={`text-right font-bold tabular-nums ${toneClass(offTone)}`}>{offValue}</span>
      <span className={`text-right font-bold tabular-nums ${toneClass(onTone)}`}>{onValue}</span>
    </div>
  );
}

function SingleImpactRow({
  label,
  value,
  tone = "blue",
}: {
  label: string;
  value: string;
  tone?: Tone;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_110px] items-center gap-2 py-2 text-[10px]">
      <span className="truncate font-medium text-neutral-400">{label}</span>
      <span className={`text-right font-bold tabular-nums ${toneClass(tone)}`}>{value}</span>
    </div>
  );
}

function DrsToggle({
  isOn,
  onChange,
}: {
  isOn: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="rounded-full border border-white/10 bg-black/35 p-0.5">
      <div className="grid w-full grid-cols-2 overflow-hidden rounded-full text-[10px] font-bold uppercase">
        <button
          type="button"
          onClick={() => onChange(false)}
          className={`h-8 transition ${!isOn ? "bg-[#15191f] text-white" : "text-neutral-500 hover:text-neutral-300"}`}
        >
          OFF
        </button>
        <button
          type="button"
          onClick={() => onChange(true)}
          className={`h-8 transition ${isOn ? "bg-green-500 text-white shadow-[0_0_18px_rgba(34,197,94,0.35)]" : "text-neutral-500 hover:text-neutral-300"}`}
        >
          ON
        </button>
      </div>
    </div>
  );
}

function ModeButton({
  label,
  active,
  tone,
  onClick,
}: {
  label: string;
  active: boolean;
  tone: "blue" | "red" | "green";
  onClick: () => void;
}) {
  const activeClass =
    tone === "blue"
      ? "border-blue-400/50 bg-blue-500/35 text-blue-100 shadow-[0_0_18px_rgba(59,130,246,0.25)]"
      : tone === "red"
        ? "border-red-400/50 bg-red-500/25 text-red-100"
        : "border-green-400/50 bg-green-500/25 text-green-100";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-8 rounded-md border px-3 text-[10px] font-bold uppercase tracking-wide transition ${
        active ? activeClass : "border-white/10 bg-white/[0.04] text-neutral-500 hover:text-neutral-300"
      }`}
    >
      {label}
    </button>
  );
}

function FrontLipPressureField({
  deploymentPercent,
  liftReductionPercent,
}: {
  deploymentPercent: number;
  liftReductionPercent: number;
}) {
  const deploymentRatio = clamp(deploymentPercent / 100, 0, 1);
  const densityRatio = clamp(liftReductionPercent / 45, 0, 1);
  const color = flowColor("blue");
  const particleCount = Math.round(8 + deploymentRatio * 10);
  const paths = [
    "M356 94 C332 96 315 101 298 108 C275 119 247 123 216 118",
    "M356 102 C330 105 310 111 290 119 C266 129 238 130 204 123",
    "M352 110 C326 114 303 120 278 128 C252 135 223 134 194 126",
    "M340 118 C314 124 286 128 254 128 C230 128 210 126 192 121",
  ];

  return (
    <div
      className="active-aero-front-lip-field"
      style={
        {
          "--front-lip-field-color": color,
          "--front-lip-field-opacity": 0.34 + deploymentRatio * 0.3,
          "--front-lip-field-scale": 0.9 + deploymentRatio * 0.2,
          "--underbody-density-length": `${28 + densityRatio * 52}%`,
          "--underbody-density-opacity": 0.16 + densityRatio * 0.52,
          "--underbody-density-core": `${0.35 + densityRatio * 0.65}`,
        } as FlowStyle
      }
      aria-hidden="true"
    >
      <svg viewBox="0 0 360 150" preserveAspectRatio="none" className="active-aero-front-lip-field__curves">
        <defs>
          <filter id="front-lip-field-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.35" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {paths.map((path, index) => (
          <path
            key={path}
            d={path}
            className="active-aero-front-lip-field__curve"
            fill="none"
            stroke={color}
            strokeWidth={index === 1 ? 1.2 : 0.85}
            opacity={0.34 + deploymentRatio * 0.28 - index * 0.04}
            filter="url(#front-lip-field-glow)"
            style={{ "--front-lip-field-delay": `${index * -0.2}s` } as FlowStyle}
          />
        ))}
      </svg>
      {Array.from({ length: particleCount }).map((_, index) => (
        <span
          key={`front-lip-particle-${index}`}
          className="active-aero-front-lip-field__particle"
          style={
            {
              "--front-lip-particle-top": `${57 + (index % 6) * 2.7}%`,
              "--front-lip-particle-delay": `${index * -0.08}s`,
              "--front-lip-particle-duration": `${1.35 + (index % 6) * 0.1}s`,
              "--front-lip-particle-drop": `${-1 - deploymentRatio * (index % 4)}px`,
            } as FlowStyle
          }
        />
      ))}
      <div className="active-aero-underbody-density">
        <span className="active-aero-underbody-density__sheet" />
        <span className="active-aero-underbody-density__core" />
        <span className="active-aero-underbody-density__line active-aero-underbody-density__line--upper" />
        <span className="active-aero-underbody-density__line active-aero-underbody-density__line--middle" />
        <span className="active-aero-underbody-density__line active-aero-underbody-density__line--lower" />
      </div>
      <span className="active-aero-front-lip-field__pressure" />
      <span className="active-aero-front-lip-field__split" />
    </div>
  );
}

function CarSilhouette({
  wingMode,
  tone,
  crop,
  frontLipAngle = 0,
  frontLipDeployment = 0,
  frontLiftReduction = 0,
}: {
  wingMode?: "closed" | "open";
  tone: "red" | "green" | "blue";
  crop: "rear" | "front";
  frontLipAngle?: number;
  frontLipDeployment?: number;
  frontLiftReduction?: number;
}) {
  const rearCrop = crop === "rear";
  const frontLipRatio = clamp(frontLipDeployment / 100, 0, 1);
  const frontLipStyle = {
    "--front-lip-angle": `${-2 - clamp(frontLipAngle, 0, 15) * 0.9}deg`,
    "--front-lip-drop": `${frontLipRatio * 16}px`,
    "--front-lip-length": `${70 + frontLipRatio * 30}%`,
    "--front-lip-opacity": 0.72 + frontLipRatio * 0.23,
  } as FlowStyle;
  const liftReductionValue = Math.round(clamp(frontLiftReduction, 0, 70));

  return (
    <div className={`active-aero-visual active-aero-visual--${rearCrop ? "rear" : "front"}`}>
      {!rearCrop ? <FrontLipPressureField deploymentPercent={frontLipDeployment} liftReductionPercent={frontLiftReduction} /> : null}
      {rearCrop ? (
        <div className="active-aero-asphalt" aria-hidden="true">
          <span className="active-aero-asphalt__surface" />
          <span className="active-aero-asphalt__aggregate" />
          <span className="active-aero-asphalt__contact active-aero-asphalt__contact--rear" />
          <span className="active-aero-asphalt__contact active-aero-asphalt__contact--front" />
          <span className="active-aero-asphalt__edge" />
        </div>
      ) : null}
      <div
        className={`active-aero-car-anchor active-aero-car-anchor--${rearCrop ? "rear" : "front"}`}
      >
        <img
          src={drsRearWingCar}
          alt=""
          className={`h-auto w-full object-contain drop-shadow-[0_18px_28px_rgba(0,0,0,0.9)] ${
            rearCrop ? "contrast-110 saturate-110" : "contrast-110 saturate-110"
          }`}
        />
        {rearCrop && wingMode ? (
          <div className={`active-aero-drs-flap active-aero-drs-flap--${wingMode}`} aria-hidden="true">
            <span className="active-aero-drs-flap__hinge" />
            <span className="active-aero-drs-flap__blade" />
          </div>
        ) : null}
        {rearCrop ? (
          <div
            className={`active-aero-rear-downforce active-aero-rear-downforce--${tone} active-aero-rear-downforce--${
              wingMode === "open" ? "open" : "closed"
            }`}
            aria-hidden="true"
          >
            <span className="active-aero-rear-downforce__shaft" />
            <span className="active-aero-rear-downforce__arrow" />
            <span className="active-aero-rear-downforce__label">Downforce</span>
          </div>
        ) : null}
        {!rearCrop ? (
          <div className="active-aero-front-lip" style={frontLipStyle} aria-hidden="true">
            <span className="active-aero-front-lip__actuator" />
            <span className="active-aero-front-lip__hinge" />
            <span className="active-aero-front-lip__blade" />
            <span className="active-aero-front-lip__glow" />
          </div>
        ) : null}
      </div>
      {!rearCrop ? (
        <div className="active-aero-front-splitter-trace" aria-hidden="true">
          <span className="active-aero-front-splitter-trace__line active-aero-front-splitter-trace__line--top" />
          <span className="active-aero-front-splitter-trace__line active-aero-front-splitter-trace__line--middle" />
          <span className="active-aero-front-splitter-trace__line active-aero-front-splitter-trace__line--lower" />
        </div>
      ) : null}
      {!rearCrop ? (
        <div className="active-aero-front-downforce-vector" aria-hidden="true">
          <span className="active-aero-front-downforce-vector__shaft" />
          <span className="active-aero-front-downforce-vector__arrow" />
          <span className="active-aero-front-downforce-vector__label">Downforce</span>
        </div>
      ) : null}
      {!rearCrop ? (
        <div className="active-aero-front-lift-meter">
          <span className="active-aero-front-lift-meter__label">Front lift reduction</span>
          <span className="active-aero-front-lift-meter__value">{liftReductionValue}%</span>
          <span className="active-aero-front-lift-meter__rail">
            <span className="active-aero-front-lift-meter__fill" style={{ width: `${liftReductionValue}%` }} />
          </span>
        </div>
      ) : null}
      <div className={`absolute inset-x-8 bottom-0 h-12 bg-gradient-to-t ${tone === "red" ? "from-red-500/10" : tone === "green" ? "from-green-500/10" : "from-blue-500/10"} to-transparent`} />
    </div>
  );
}

function DrsActiveVisual({
  activeMode,
  isOn,
  speedKmh,
  rearDownforceKg,
  dragForceN,
  deltaCd,
}: {
  activeMode: ActiveAeroMode | null;
  isOn: boolean;
  speedKmh: number;
  rearDownforceKg: number | null;
  dragForceN: number | null;
  deltaCd: number | null;
}) {
  const tone: "red" | "green" = isOn ? "green" : "red";

  return (
    <div className="active-aero-drs-visual">
      <CarSilhouette wingMode={isOn ? "open" : "closed"} tone={tone} crop="rear" />
      <div className="active-aero-drs-legend">
        <p className={`text-[10px] font-bold uppercase tracking-wide ${toneClass(tone)}`}>
          {isOn ? "DRS ON" : "DRS OFF"}
        </p>
        <p className="text-[8px] font-bold uppercase tracking-wide text-neutral-500">{isOn ? "Low drag" : "High downforce"}</p>
      </div>
      <div className="active-aero-drs-forces">
        <p className="text-[9px] font-bold uppercase tracking-wide text-neutral-500">Rear axle forces</p>
        <div className="mt-3 space-y-2 text-[10px]">
          <div className="flex items-center justify-between gap-3">
            <span className="text-neutral-500">Mode</span>
            <span className={`text-right font-bold uppercase ${toneClass(tone)}`}>{activeMode ? shortModeLabel(activeMode) : "Not available"}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-neutral-500">Speed</span>
            <span className="font-bold tabular-nums text-neutral-200">{fmtCompact(speedKmh, " km/h")}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-neutral-500">Rear downforce</span>
            <span className={`font-bold tabular-nums ${toneClass(tone)}`}>{fmtSignedCompact(rearDownforceKg, " kg")}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-neutral-500">Drag force</span>
            <span className={`font-bold tabular-nums ${toneClass(tone)}`}>{fmtCompact(dragForceN, " N")}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-neutral-500">Cd delta</span>
            <span className={`font-bold tabular-nums ${toneClass(tone)}`}>{fmtSigned(deltaCd, 3)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function FrontLipVisual({
  activeMode,
  liftReductionPercent,
}: {
  activeMode: ActiveAeroMode | null;
  liftReductionPercent: number;
}) {
  const angle = activeMode?.angleDeg ?? 0;
  const deployment = activeMode?.deploymentPercent ?? 0;

  return (
    <div className="grid min-h-[300px] grid-cols-[minmax(0,1fr)_170px]">
      <div className="relative border-r border-white/[0.06]">
        <CarSilhouette
          tone="blue"
          crop="front"
          frontLipAngle={angle}
          frontLipDeployment={deployment}
          frontLiftReduction={liftReductionPercent}
        />
      </div>
      <div className="flex flex-col gap-5 px-4 py-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-neutral-400">Adjustable angle</p>
          <p className="mt-2 text-center text-xl font-bold tabular-nums text-blue-300">{fmtCompact(angle, "°")}</p>
          <RangeRail value={angle} max={15} marks={[0, 5, 8, 12, 15]} suffix="°" />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-neutral-400">Deployment</p>
          <p className="mt-2 text-center text-xl font-bold tabular-nums text-blue-300">{fmtCompact(deployment, "%")}</p>
          <RangeRail value={deployment} max={100} marks={[0, 50, 70, 100]} suffix="%" />
        </div>
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wide text-neutral-400">Auto rules (optional)</p>
          {[
            ["Deploy above", "60", "km/h"],
            ["Retract below", "30", "km/h"],
            ["Retract while braking", "", ""],
          ].map(([label, value, unit], index) => (
            <label key={label} className="flex items-center gap-2 text-[10px] font-medium text-neutral-400">
              <input type="checkbox" checked={index > 0} readOnly className="h-4 w-4 rounded border-white/20 bg-blue-500/40 accent-blue-500" />
              <span className="min-w-0 flex-1">{label}</span>
              {value ? <span className="rounded border border-white/10 bg-black/25 px-2 py-1 tabular-nums text-neutral-200">{value}</span> : null}
              {unit ? <span>{unit}</span> : null}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

function RangeRail({
  value,
  max,
  marks,
  suffix,
}: {
  value: number;
  max: number;
  marks: number[];
  suffix: string;
}) {
  const percent = clamp((value / max) * 100, 0, 100);
  return (
    <div className="mt-3">
      <div className="relative h-7">
        <div className="absolute left-0 right-0 top-3 h-0.5 bg-neutral-700" />
        <div className="absolute left-0 top-3 h-0.5 bg-blue-500" style={{ width: `${percent}%` }} />
        {marks.map((mark) => (
          <div key={mark} className="absolute top-[9px] h-2 w-2 -translate-x-1/2 rounded-full bg-neutral-500" style={{ left: `${(mark / max) * 100}%` }}>
            <span className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] font-bold tabular-nums text-neutral-500">
              {mark}
              {suffix}
            </span>
          </div>
        ))}
        <div className="absolute top-[5px] h-4 w-4 -translate-x-1/2 rounded-full bg-blue-500 shadow-[0_0_16px_rgba(59,130,246,0.55)]" style={{ left: `${percent}%` }} />
      </div>
    </div>
  );
}

function SummaryTile({
  title,
  value,
  detail,
  tone = "blue",
}: {
  title: string;
  value: string;
  detail: string;
  tone?: Tone;
}) {
  return (
    <div className="min-w-0 border-r border-white/[0.08] px-4 py-3 last:border-r-0">
      <p className="text-[9px] font-bold uppercase tracking-wide text-neutral-500">{title}</p>
      <p className={`mt-1 truncate text-lg font-bold tabular-nums ${toneClass(tone)}`}>{value}</p>
      <p className="mt-1 text-[10px] leading-snug text-neutral-500">{detail}</p>
    </div>
  );
}

export function ActiveAeroImpactCard({ car }: { car: SavedGarageCar | null }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const activeAeroBodyId = useId();
  const [speedKmh, setSpeedKmh] = useState(160);
  const [selectedModeByComponentId, setSelectedModeByComponentId] = useState<Record<string, string>>({});
  const activeAeroData = useActiveAeroData();
  const baseAero = useVehicleAerodynamicData({ car, components: EMPTY_COMPONENTS, speedKmh });

  useEffect(() => {
    setSelectedModeByComponentId((previous) => {
      const next: Record<string, string> = {};
      let changed = Object.keys(previous).length !== activeAeroData.components.length;
      for (const component of activeAeroData.components) {
        const previousModeId = previous[component.id];
        const stillValid = component.modes.some((mode) => mode.id === previousModeId);
        const nextModeId = stillValid ? previousModeId : defaultMode(component)?.id;
        if (nextModeId) next[component.id] = nextModeId;
        if (nextModeId !== previousModeId) changed = true;
      }
      return changed ? next : previous;
    });
  }, [activeAeroData.components]);

  const selectedModes = useMemo(
    () =>
      activeAeroData.components
        .map((component) => {
          const selectedModeId = selectedModeByComponentId[component.id];
          const mode = component.modes.find((candidate) => candidate.id === selectedModeId) ?? defaultMode(component);
          return mode ? { component, mode } : null;
        })
        .filter((selection): selection is SelectedActiveAeroMode => Boolean(selection)),
    [activeAeroData.components, selectedModeByComponentId],
  );

  const rearComponent = activeAeroData.components.find((component) => component.componentType === "rear_wing") ?? null;
  const frontComponent =
    activeAeroData.components.find((component) => component.componentType === "front_lip" || component.componentType === "front_splitter") ??
    null;
  const rearSelection = selectedModes.find((selected) => selected.component.id === rearComponent?.id) ?? null;
  const frontSelection = selectedModes.find((selected) => selected.component.id === frontComponent?.id) ?? null;
  const rearOffMode = modeByType(rearComponent, "high_downforce") ?? defaultMode(rearComponent);
  const rearOnMode = modeByType(rearComponent, "low_drag") ?? rearComponent?.modes.find((mode) => mode.modeType === "drs_on") ?? null;
  const rearActiveMode = rearSelection?.mode ?? rearOffMode ?? rearOnMode ?? null;
  const rearDrsOn = isDrsLowDragMode(rearActiveMode);

  const componentEffects = useMemo(
    () =>
      selectedModes
        .map((selection) => activeAeroModeToComponentEffect(selection))
        .filter((effect): effect is NonNullable<typeof effect> => Boolean(effect)),
    [selectedModes],
  );

  const impact = useMemo(
    () =>
      calculateAerodynamicImpact({
        baseAeroProfile: baseAero.data.baseAeroProfile,
        selectedComponents: selectedModes.map((selection) => ({ id: selection.component.id, label: selection.component.name })),
        componentEffects,
        speedKmh,
      }),
    [baseAero.data.baseAeroProfile, componentEffects, selectedModes, speedKmh],
  );

  const summary = useMemo(() => summarizeActiveAeroModes(selectedModes, speedKmh), [selectedModes, speedKmh]);
  const off = modeValueAtSpeed(rearOffMode, speedKmh);
  const on = modeValueAtSpeed(rearOnMode, speedKmh);
  const rearActive = modeValueAtSpeed(rearActiveMode, speedKmh);
  const lip = modeValueAtSpeed(frontSelection?.mode ?? null, speedKmh);
  const lipLiftReductionPercent = frontLiftReductionPercent(lip.frontDownforceKg, speedKmh);
  const offFrontTotal = (off.frontDownforceKg ?? 0) + (lip.frontDownforceKg ?? 0);
  const onFrontTotal = (on.frontDownforceKg ?? 0) + (lip.frontDownforceKg ?? 0);
  const offRearTotal = off.rearDownforceKg ?? 0;
  const onRearTotal = on.rearDownforceKg ?? 0;
  const offTotal = offFrontTotal + offRearTotal;
  const onTotal = onFrontTotal + onRearTotal;
  const offCd = off.deltaCd ?? null;
  const onCd = on.deltaCd ?? null;
  const baseCd = impact.baseCd ?? BASE_CD_FALLBACK;
  const finalCd = impact.finalCd ?? (baseCd + (summary.deltaCd ?? 0));
  const estimatedDragN =
    impact.dragForceN ??
    (BASE_DRAG_FORCE_N * ((baseCd + (summary.deltaCd ?? 0)) / BASE_CD_FALLBACK) * (speedKmh / 160) ** 2);
  const rearActiveDragN =
    rearActive.deltaCd == null ? null : BASE_DRAG_FORCE_N * ((baseCd + rearActive.deltaCd) / BASE_CD_FALLBACK) * (speedKmh / 160) ** 2;
  const frontPercent = frontBalanceFrom(summary.frontDownforceKg, summary.rearDownforceKg);
  const stability =
    frontSelection?.mode.modeType === "track"
      ? "Good for Track"
      : rearSelection?.mode.modeType === "low_drag"
        ? "Reduced"
        : "High";
  const sourceDetail =
    activeAeroData.source === "supabase" ? "Supabase aero_component_mode" : "Local fallback active aero modes";
  const topSpeedOn = TOP_SPEED_DRS_OFF_KMH * (1 + SPEED_GAIN_LOW_DRAG_PERCENT / 100);
  const frontStabilityComponent = frontComponent ?? rearComponent;
  const frontStabilityMode = frontSelection?.mode ?? rearSelection?.mode ?? rearOffMode ?? rearOnMode;
  const frontStabilityValue =
    frontStabilityComponent && frontStabilityMode ? modeStabilityImpact(frontStabilityComponent, frontStabilityMode) : "Not available";
  const summaryPurpose = rearSelection?.mode ?? rearOffMode ?? rearOnMode;

  const setRearDrs = (isOn: boolean) => {
    const mode = isOn ? rearOnMode : rearOffMode;
    if (rearComponent && mode) {
      setSelectedModeByComponentId((previous) => ({ ...previous, [rearComponent.id]: mode.id }));
    }
  };

  const setMode = (component: ActiveAeroComponent | null, modeId: string) => {
    if (!component) return;
    setSelectedModeByComponentId((previous) => ({ ...previous, [component.id]: modeId }));
  };

  const applyPreset = (preset: AeroPreset) => {
    setSelectedModeByComponentId((previous) => {
      const next = { ...previous };
      for (const component of activeAeroData.components) {
        const mode = preferredModeForPreset(component, preset);
        if (mode) next[component.id] = mode.id;
      }
      return next;
    });
  };

  return (
    <section className="rounded-lg border border-white/10 bg-[#06080c] p-3 text-neutral-200">
      <div className={["flex flex-wrap items-end justify-between gap-3", isExpanded ? "mb-3" : ""].join(" ")}>
        <div>
          <div className="flex items-center gap-2">
            <h2>
              <button
                type="button"
                className="group inline-flex items-center gap-2 rounded-md border border-transparent px-0.5 py-0.5 text-left text-xl font-bold uppercase tracking-wide text-neutral-200 transition hover:text-cyan-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400/70"
                aria-expanded={isExpanded}
                aria-controls={activeAeroBodyId}
                onClick={() => setIsExpanded((value) => !value)}
              >
                <span>Active Aero System</span>
                <span
                  aria-hidden
                  className={[
                    "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border border-white/10 text-[10px] text-cyan-200/80 transition group-hover:border-cyan-400/40 group-hover:text-cyan-100",
                    isExpanded ? "" : "-rotate-90",
                  ].join(" ")}
                >
                  ▾
                </span>
              </button>
            </h2>
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/20 text-[11px] font-bold text-neutral-500">
              i
            </span>
          </div>
          <p className="mt-1 text-[11px] text-neutral-500">{sourceDetail}</p>
        </div>
        {isExpanded ? (
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap items-center gap-1">
              <span className="mr-1 text-[9px] font-bold uppercase tracking-wide text-neutral-500">Preset</span>
              {[
                ["street", "Street"],
                ["sport", "Sport"],
                ["track", "Track"],
                ["low-drag", "Low Drag"],
              ].map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => applyPreset(id as AeroPreset)}
                  className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-[9px] font-bold uppercase text-neutral-400 transition hover:border-cyan-400/40 hover:text-cyan-100"
                >
                  {label}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wide text-neutral-500">
              Speed
              <input
                type="number"
                min={0}
                max={400}
                step={5}
                value={speedKmh}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  setSpeedKmh(Number.isFinite(next) ? Math.max(0, Math.min(400, next)) : 160);
                }}
                className={speedInputClass}
                aria-label="Active aero calculation speed"
              />
              <span className="text-neutral-600">km/h</span>
            </label>
          </div>
        ) : null}
      </div>

      {isExpanded ? (
        <div id={activeAeroBodyId}>
          <div className="pb-1">
            <div className="grid gap-3">
              <div className="grid gap-3">
            <Panel className="overflow-hidden">
              <SectionTitle title="Rear Wing - DRS System" />
              <div className="active-aero-rear-wing-layout">
                <aside className="active-aero-drs-controls border-r border-white/[0.08] px-4 py-4">
                  <p className="text-[10px] font-bold uppercase text-neutral-400">DRS mode</p>
                  <div className="mt-3">
                    <DrsToggle isOn={rearDrsOn} onChange={setRearDrs} />
	                  </div>
	                  <div className="mt-7 space-y-4">
	                    <div>
	                      <p className={`text-[10px] font-bold uppercase ${toneClass(rearDrsOn ? "green" : "red")}`}>
	                        Mode: {rearDrsOn ? "Low Drag" : "High Downforce"}
	                      </p>
	                    </div>
	                    <div>
	                      <p className="text-[10px] font-medium text-neutral-400">Wing Angle</p>
	                      <p className={`mt-1 text-2xl font-bold tabular-nums ${toneClass(rearDrsOn ? "green" : "red")}`}>{fmtCompact(rearActiveMode?.angleDeg ?? null, "°")}</p>
	                    </div>
	                    <div>
	                      <p className="text-[10px] font-medium text-neutral-400">Deployment</p>
	                      <p className={`mt-1 text-2xl font-bold tabular-nums ${toneClass(rearDrsOn ? "green" : "red")}`}>{fmtCompact(rearActiveMode?.deploymentPercent ?? null, "%")}</p>
	                    </div>
	                  </div>
	                </aside>
	                <DrsActiveVisual
	                  activeMode={rearActiveMode}
	                  isOn={rearDrsOn}
	                  speedKmh={speedKmh}
	                  rearDownforceKg={rearActive.rearDownforceKg}
	                  dragForceN={rearActiveDragN}
	                  deltaCd={rearActive.deltaCd}
	                />
	              </div>
	            </Panel>

            <Panel className="overflow-hidden">
              <SectionTitle title={`Aero Impact @ ${speedKmh} km/h`} />
              <div className="px-4 py-3">
                <div className="grid grid-cols-[minmax(0,1fr)_82px_82px] gap-2 border-b border-white/[0.08] pb-2 text-right text-[10px] font-bold uppercase">
                  <span />
                  <span className="text-red-400">DRS OFF</span>
                  <span className="text-green-400">DRS ON</span>
                </div>
                <ImpactRow label="Rear Downforce" offValue={fmtSignedCompact(offRearTotal, " kg")} onValue={fmtSignedCompact(onRearTotal, " kg")} />
                <ImpactRow label="Front Downforce" offValue={fmtSignedCompact(offFrontTotal, " kg")} onValue={fmtSignedCompact(onFrontTotal, " kg")} />
                <ImpactRow label="Total Downforce" offValue={fmtSignedCompact(offTotal, " kg")} onValue={fmtSignedCompact(onTotal, " kg")} />
                <ImpactRow label="Drag Coefficient (Cd)" offValue={fmtSigned(offCd, 3)} onValue={fmtSigned(onCd, 3)} />
                <ImpactRow
                  label="Drag Force"
                  offValue={fmtCompact(BASE_DRAG_FORCE_N * ((baseCd + (offCd ?? 0)) / BASE_CD_FALLBACK) * (speedKmh / 160) ** 2, " N")}
                  onValue={fmtCompact(BASE_DRAG_FORCE_N * ((baseCd + (onCd ?? 0)) / BASE_CD_FALLBACK) * (speedKmh / 160) ** 2, " N")}
                />
                <ImpactRow
                  label="Aero Balance (F/R)"
                  offValue={balanceLabel(frontBalanceFrom(offFrontTotal, offRearTotal))}
                  onValue={balanceLabel(frontBalanceFrom(onFrontTotal, onRearTotal))}
                />
                <ImpactRow label="Straight-line Speed" offValue="Normal" onValue={`+${SPEED_GAIN_LOW_DRAG_PERCENT.toFixed(1)}%`} />
                <ImpactRow label="Stability" offValue="High" onValue="Reduced" offTone="yellow" onTone="yellow" />
                <ImpactRow label="Use Case" offValue="Corners" onValue="Straights" />
                <div className="mt-3 border-t border-white/[0.08] pt-3">
                  <SingleImpactRow label="Confidence" value="Medium-Low" tone="yellow" />
                </div>
              </div>
            </Panel>
          </div>

          <div className="grid gap-3">
            <Panel className="overflow-hidden">
              <SectionTitle title="Front Lip - Active System" />
              <div className="grid grid-cols-[150px_minmax(0,1fr)]">
                <aside className="border-r border-white/[0.08] px-4 py-4">
                  <p className="text-[10px] font-bold uppercase text-neutral-400">Active mode</p>
                  <div className="mt-3 grid gap-2">
                    {frontComponent?.modes.map((mode) => (
                      <ModeButton
                        key={mode.id}
                        label={shortModeLabel(mode)}
                        active={frontSelection?.mode.id === mode.id}
                        tone="blue"
                        onClick={() => setMode(frontComponent, mode.id)}
                      />
                    ))}
                  </div>
                  <div className="mt-5 space-y-3">
                    <p className="text-[10px] font-bold uppercase text-blue-400">Mode: {frontSelection ? shortModeLabel(frontSelection.mode) : "Not available"}</p>
                    <div>
                      <p className="text-[10px] font-medium text-neutral-400">Angle of Attack</p>
                      <p className="mt-1 text-xl font-bold tabular-nums text-blue-400">{fmtCompact(frontSelection?.mode.angleDeg ?? null, "°")}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium text-neutral-400">Deployment</p>
                      <p className="mt-1 text-xl font-bold tabular-nums text-blue-400">{fmtCompact(frontSelection?.mode.deploymentPercent ?? null, "%")}</p>
                    </div>
                  </div>
                </aside>
                <FrontLipVisual
                  activeMode={frontSelection?.mode ?? null}
                  liftReductionPercent={lipLiftReductionPercent}
                />
              </div>
            </Panel>

            <Panel className="overflow-hidden">
              <SectionTitle title={`Aero Impact @ ${speedKmh} km/h`} />
              <div className="px-4 py-5">
                <SingleImpactRow label="Front Downforce" value={fmtSignedCompact(lip.frontDownforceKg, " kg")} />
                <SingleImpactRow label="Drag Coefficient (Cd)" value={fmtSigned(lip.deltaCd, 3)} />
                <SingleImpactRow
                  label="Drag Force"
                  value={fmtSignedCompact(BASE_DRAG_FORCE_N * ((lip.deltaCd ?? 0) / BASE_CD_FALLBACK) * (speedKmh / 160) ** 2, " N")}
                />
                <SingleImpactRow label="Aero Balance (F/R)" value={balanceLabel(frontPercent)} />
                <SingleImpactRow label="Stability" value={frontStabilityValue} />
                <div className="mt-5 border-t border-white/[0.08] pt-3">
                  <SingleImpactRow label="Confidence" value="Low" tone="yellow" />
                </div>
              </div>
            </Panel>
          </div>

          <div className="grid gap-3">
            <Panel className="overflow-hidden">
              <div className="flex items-center gap-2 border-b border-white/[0.07] px-4 py-3">
                <h3 className="text-[12px] font-bold uppercase tracking-wide text-neutral-300">
                  Total Aerodynamic Summary @ {speedKmh} km/h
                </h3>
                <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-white/20 text-[10px] font-bold text-neutral-500">
                  i
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2">
                <SummaryTile title="Drag Coefficient (Cd)" value={fmt(finalCd, 3)} detail={`Baseline: ${BASE_CD_FALLBACK.toFixed(3)}`} />
                <SummaryTile title="Drag Force" value={fmtCompact(estimatedDragN, " N")} detail={`Baseline: ${BASE_DRAG_FORCE_N} N`} />
                <SummaryTile
                  title="Total Downforce"
                  value={fmtCompact(summary.totalDownforceKg ?? BASE_FRONT_DOWNFORCE_KG + BASE_REAR_DOWNFORCE_KG, " kg")}
                  detail={`Baseline: ${BASE_FRONT_DOWNFORCE_KG + BASE_REAR_DOWNFORCE_KG} kg`}
                />
                <SummaryTile title="Aero Balance" value={balanceLabel(frontPercent)} detail="Front / Rear" />
                <SummaryTile title="Stability Impact" value={stability} detail={summaryPurpose ? modePurpose(summaryPurpose) : "Not available"} tone={stability === "Reduced" ? "yellow" : "blue"} />
              </div>
            </Panel>

            <Panel className="overflow-hidden">
              <SectionTitle title="Speed Simulation (est.)" />
              <div className="px-4 py-5">
                <SingleImpactRow label="Top Speed (DRS OFF)" value={fmtCompact(TOP_SPEED_DRS_OFF_KMH, " km/h")} tone="red" />
                <SingleImpactRow label="Top Speed (DRS ON)" value={fmtCompact(topSpeedOn, " km/h")} tone="green" />
                <p className="mt-3 text-right text-sm font-bold text-green-400">+{SPEED_GAIN_LOW_DRAG_PERCENT.toFixed(1)}%</p>
              </div>
            </Panel>
          </div>
        </div>
      </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[10px] text-neutral-500">
            <p>
              Air Density: 1.225 kg/m3 <span className="mx-2 text-neutral-700">|</span> Reference Speed: 160 km/h
              <span className="mx-2 text-neutral-700">|</span> All downforce values are estimates
            </p>
            <p className="flex items-center gap-4">
              <span className="inline-flex items-center gap-2"><span className="h-0.5 w-6 bg-red-500" /> High Downforce Mode</span>
              <span className="inline-flex items-center gap-2"><span className="h-0.5 w-6 bg-green-500" /> Low Drag Mode</span>
            </p>
          </div>
        </div>
      ) : null}
    </section>
  );
}
