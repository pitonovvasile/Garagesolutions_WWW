import { useEffect, useState, type ReactNode } from "react";
import type { GoalPresetBundle } from "../data/vehicleGarageProfiles";
import type { VehicleStockSuspensionDoc } from "../data/vehicleStockSuspension";
import type { VehicleAnalysis } from "../lib/vehicleKinematics";
import {
  applyAntiRollBarProfileToStore,
  readAntiRollBarProfileFromCar,
  saveAntiRollBarToGarageCar,
} from "../lib/garageAntiRollBarProfile";
import {
  applyCoiloverSetupToStore,
  readCoiloverSetupFromCar,
  saveCoiloverSetupToGarageCar,
} from "../lib/garageCoiloverSetupProfile";
import { readSavedCars } from "../lib/garageStorage";
import {
  collectSavedSuspensionConfiguration,
  writeSavedSuspensionConfiguration,
} from "../lib/suspensionManualConfigPersistence";
import {
  COILOVER_SETUP_TIER_LABELS,
  COILOVER_SETUP_TIER_OPTIONS,
  coiloverAftermarketBrandDisplay,
} from "../data/coiloverSetup";
import { CoiloverAftermarketBrandFields } from "./CoiloverAftermarketBrandFields";
import { HandlingSteeringFeelSection } from "./HandlingSteeringFeelSection";
import { useSuspensionAssistantStore } from "../store/suspensionAssistantStore";
import { useSuspensionStore } from "../store/suspensionStore";
import { AntiRollBarAxleFields } from "./AntiRollBarAxleFields";
import { MetricTraceCell } from "./MetricTraceRow";

function fmtDeg(v: number | null | undefined) {
  if (v == null || Number.isNaN(v)) return "—";
  return `${v.toFixed(2)}°`;
}

function fmtToeTotMin(m: number | null | undefined) {
  if (m == null || Number.isNaN(m)) return "—";
  const sign = m > 0 ? "+" : "";
  return `${sign}${m}′`;
}

const setupSelectShell =
  "flex min-h-[1.75rem] w-full items-center justify-between gap-1 rounded border border-white/10 bg-[#0b0f14] px-1.5 py-1 font-mono text-[10px] text-neutral-200 shadow-inner";

function SetupSelectLike({ children }: { children: ReactNode }) {
  return (
    <div className={`${setupSelectShell} cursor-default`}>
      <span className="min-w-0 truncate">{children}</span>
      <span className="shrink-0 text-[9px] text-neutral-500" aria-hidden>
        ▾
      </span>
    </div>
  );
}

function SetupMiniInput({ children }: { children: ReactNode }) {
  return (
    <div
      className={`${setupSelectShell} justify-center text-center tabular-nums`}
      style={{ cursor: "default" }}
    >
      {children}
    </div>
  );
}

function pairDegFromTypical(
  mid: number | null | undefined,
  win: readonly [number, number] | undefined,
): [string, string] {
  if (win) return [fmtDeg(win[0]), fmtDeg(win[1])];
  if (mid == null || Number.isNaN(mid)) return ["—", "—"];
  const v = fmtDeg(mid);
  return [v, v];
}

function pairToeFromTypical(
  mid: number | null | undefined,
  win: readonly [number, number] | undefined,
): [string, string] {
  if (mid == null && !win) return ["—", "—"];
  if (win) return [fmtToeTotMin(win[0]), fmtToeTotMin(win[1])];
  const v = fmtToeTotMin(mid ?? null);
  return [v, v];
}

export function OemSuspensionSetupPanel({
  doc,
  kinFront,
  kinRear,
  preset,
  axleEnd,
  engineeringDebug,
  springRateNmm,
  springStrokeMm,
  damperStrokeMm,
  damperLinearDampingCoeff,
}: {
  doc: VehicleStockSuspensionDoc;
  kinFront: VehicleAnalysis;
  kinRear: VehicleAnalysis;
  preset: GoalPresetBundle | null;
  axleEnd: "front" | "rear";
  engineeringDebug: boolean;
  springRateNmm: number;
  springStrokeMm: number;
  damperStrokeMm: number;
  damperLinearDampingCoeff: number;
}) {
  const [tab, setTab] = useState<"front" | "rear">(axleEnd);
  const [arbTab, setArbTab] = useState<"front" | "rear">(axleEnd);
  const [arbSaveFlash, setArbSaveFlash] = useState<string | null>(null);
  const [coiloverSaveFlash, setCoiloverSaveFlash] = useState<string | null>(null);
  const garageCarIndex = useSuspensionStore((s) => s.garageCarIndex);
  const coiloverRubrikActive = useSuspensionAssistantStore((s) => s.coiloverSetupRubrikActive);
  const setCoiloverSetupRubrikActive = useSuspensionAssistantStore((s) => s.setCoiloverSetupRubrikActive);
  const arbRubrikActive = useSuspensionAssistantStore((s) => s.antiRollBarRubrikActive);
  const setAntiRollBarRubrikActive = useSuspensionAssistantStore((s) => s.setAntiRollBarRubrikActive);
  const setHandlingSteeringFeelRubrikActive = useSuspensionAssistantStore(
    (s) => s.setHandlingSteeringFeelRubrikActive,
  );

  useEffect(() => {
    setTab(axleEnd);
    setArbTab(axleEnd);
  }, [axleEnd]);

  const populateAntiRollBarFromGarage = () => {
    if (garageCarIndex == null) return;
    const cars = readSavedCars();
    if (garageCarIndex < 0 || garageCarIndex >= cars.length) return;
    const saved = readAntiRollBarProfileFromCar(cars[garageCarIndex]!);
    if (saved) applyAntiRollBarProfileToStore(saved);
  };

  const populateCoiloverFromGarage = () => {
    if (garageCarIndex == null) return;
    const cars = readSavedCars();
    if (garageCarIndex < 0 || garageCarIndex >= cars.length) return;
    const saved = readCoiloverSetupFromCar(cars[garageCarIndex]!);
    if (saved) applyCoiloverSetupToStore(saved);
  };

  const onSelectCoiloverRubrik = () => {
    const next = !coiloverRubrikActive;
    setCoiloverSetupRubrikActive(next);
    if (next) {
      setAntiRollBarRubrikActive(false);
      setHandlingSteeringFeelRubrikActive(false);
      populateCoiloverFromGarage();
    }
  };

  const onSaveCoiloverSetup = async () => {
    if (garageCarIndex == null) {
      setCoiloverSaveFlash("Selectează mașina din garaj (sidebar stânga).");
      window.setTimeout(() => setCoiloverSaveFlash(null), 4000);
      return;
    }
    const result = await saveCoiloverSetupToGarageCar(garageCarIndex);
    if (result.ok) {
      writeSavedSuspensionConfiguration(collectSavedSuspensionConfiguration());
    }
    setCoiloverSaveFlash(result.message);
    window.setTimeout(() => setCoiloverSaveFlash(null), 4000);
  };

  const onSelectAntiRollBarRubrik = () => {
    const next = !arbRubrikActive;
    setAntiRollBarRubrikActive(next);
    if (next) {
      setCoiloverSetupRubrikActive(false);
      setHandlingSteeringFeelRubrikActive(false);
      populateAntiRollBarFromGarage();
    }
  };

  const onSaveAntiRollBar = async () => {
    if (garageCarIndex == null) {
      setArbSaveFlash("Selectează mașina din garaj (sidebar stânga).");
      window.setTimeout(() => setArbSaveFlash(null), 4000);
      return;
    }
    const result = await saveAntiRollBarToGarageCar(garageCarIndex);
    if (result.ok) {
      writeSavedSuspensionConfiguration(collectSavedSuspensionConfiguration());
    }
    setArbSaveFlash(result.message);
    window.setTimeout(() => setArbSaveFlash(null), 4000);
  };

  const measuredFrontCamberDeg = useSuspensionStore((s) => s.measuredFrontCamberDeg);
  const measuredRearCamberDeg = useSuspensionStore((s) => s.measuredRearCamberDeg);
  const setMeasuredFrontCamberDeg = useSuspensionStore((s) => s.setMeasuredFrontCamberDeg);
  const setMeasuredRearCamberDeg = useSuspensionStore((s) => s.setMeasuredRearCamberDeg);
  const coiloverSetupTier = useSuspensionStore((s) => s.coiloverSetupTier);
  const setCoiloverSetupTier = useSuspensionStore((s) => s.setCoiloverSetupTier);
  const coiloverAftermarketBrand = useSuspensionStore((s) => s.coiloverAftermarketBrand);
  const coiloverAftermarketBrandOther = useSuspensionStore((s) => s.coiloverAftermarketBrandOther);
  const coiloverAftermarketSpringBrand = useSuspensionStore((s) => s.coiloverAftermarketSpringBrand);
  const coiloverAftermarketSpringBrandOther = useSuspensionStore(
    (s) => s.coiloverAftermarketSpringBrandOther,
  );
  const coiloverAftermarketDamperBrand = useSuspensionStore((s) => s.coiloverAftermarketDamperBrand);
  const coiloverAftermarketDamperBrandOther = useSuspensionStore(
    (s) => s.coiloverAftermarketDamperBrandOther,
  );
  const coiloverBrandLabel = coiloverAftermarketBrandDisplay(
    coiloverAftermarketBrand,
    coiloverAftermarketBrandOther,
    coiloverAftermarketSpringBrand,
    coiloverAftermarketSpringBrandOther,
    coiloverAftermarketDamperBrand,
    coiloverAftermarketDamperBrandOther,
  );

  const end = tab;
  const arbEnd = arbTab;
  const arbBundle = arbEnd === "front" ? doc.front : doc.rear;
  const kin = end === "front" ? kinFront : kinRear;
  const measuredCamberDeg = end === "front" ? measuredFrontCamberDeg : measuredRearCamberDeg;
  const setMeasuredCamberDeg = end === "front" ? setMeasuredFrontCamberDeg : setMeasuredRearCamberDeg;

  const bundle = end === "front" ? doc.front : doc.rear;
  const typ = bundle.stockSuspension.typicalAlignment;
  const lim = bundle.adjustmentLimits;
  const tgt = end === "front" ? preset?.targetFront : preset?.targetRear;

  const [camSL, camSR] = pairDegFromTypical(typ.camberDegMid, typ.camberDegOemWindow);
  const [toeSL, toeSR] = pairToeFromTypical(typ.toeTotalMinutesMid, typ.toeTotalMinutesOemWindow);
  const [casSL, casSR] = pairDegFromTypical(typ.casterDegMid ?? null, lim.casterOemTypicalDeltaDeg);

  const camCur = measuredCamberDeg != null ? fmtDeg(measuredCamberDeg) : "—";
  const camTL = tgt?.camberDeg != null ? fmtDeg(tgt.camberDeg) : "—";
  const camTR = camTL;

  const toeCur = "—";
  const toeTL = tgt?.toeTotalMinutes != null ? fmtToeTotMin(tgt.toeTotalMinutes) : "—";
  const toeTR = toeTL;

  const casCur = "—";
  const casTL = tgt?.casterDeg != null ? fmtDeg(tgt.casterDeg) : "—";
  const casTR = casTL;

  const archLabel = bundle.stockSuspension.architecture.replace(/_/g, " ");

  const sectionTitle = "text-[9px] font-semibold uppercase tracking-[0.12em] text-neutral-400";
  const rowLabel = "text-[9px] text-neutral-500";

  return (
    <div
      id="sd-oem-coilover-setup"
      className="rounded-xl border border-white/10 bg-[#080c12] p-2.5 text-[10px] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
    >
      <div className="flex items-stretch gap-1.5 border-b border-white/10 pb-2">
        <button
          type="button"
          aria-pressed={coiloverRubrikActive}
          title="Activează rubricile coilover: tier, brand, față/spate, resort, amortizor"
          className={[
            "flex min-h-[1.85rem] min-w-0 flex-1 items-center justify-between gap-2 rounded-md border px-2 py-1.5 text-left transition",
            coiloverRubrikActive
              ? "border-cyan-500/45 bg-cyan-950/35 text-cyan-100 shadow-[0_0_12px_rgba(34,211,238,0.12)]"
              : "border-white/10 bg-black/30 text-neutral-400 hover:border-cyan-500/30 hover:bg-white/[0.04] hover:text-neutral-200",
          ].join(" ")}
          onClick={onSelectCoiloverRubrik}
        >
          <span className="min-w-0">
            <span className="block text-[9px] font-bold uppercase tracking-[0.14em]">
              Coil over setup
            </span>
            {!coiloverRubrikActive ? (
              <span className="mt-0.5 block truncate text-[8px] font-normal normal-case tracking-normal text-neutral-600">
                {COILOVER_SETUP_TIER_LABELS[coiloverSetupTier]}
                {coiloverSetupTier === "aftermarket" && coiloverBrandLabel
                  ? ` · ${coiloverBrandLabel}`
                  : ""}
              </span>
            ) : null}
          </span>
          <span className="shrink-0 text-[8px] font-medium text-neutral-500" aria-hidden>
            {coiloverRubrikActive ? "▾" : "▸"}
          </span>
        </button>
        {coiloverRubrikActive ? (
          <button
            type="button"
            title={
              garageCarIndex != null
                ? "Salvează coil over setup în profilul mașinii din garaj"
                : "Selectează mai întâi mașina din garaj"
            }
            disabled={garageCarIndex == null}
            className={[
              "shrink-0 rounded-md border px-3 py-1.5 text-[8px] font-bold uppercase tracking-wide transition",
              garageCarIndex != null
                ? "border-emerald-500/45 bg-emerald-500/20 text-emerald-100 hover:bg-emerald-500/30"
                : "cursor-not-allowed border-white/10 bg-black/20 text-neutral-600",
            ].join(" ")}
            onClick={() => void onSaveCoiloverSetup()}
          >
            Save
          </button>
        ) : null}
        <span className="shrink-0 self-start rounded border border-white/10 bg-black/30 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wide text-neutral-500">
          {archLabel}
        </span>
      </div>

      {coiloverRubrikActive && coiloverSaveFlash ? (
        <p className="mt-1 text-[8px] leading-snug text-emerald-200/90">{coiloverSaveFlash}</p>
      ) : null}

      {coiloverRubrikActive ? (
        <>
          <p className="mt-1.5 text-[8px] leading-snug text-neutral-600">
            {COILOVER_SETUP_TIER_LABELS[coiloverSetupTier]}
            {coiloverSetupTier === "aftermarket" && coiloverBrandLabel
              ? ` · ${coiloverBrandLabel}`
              : ""}{" "}
            · stock / curent / țintă — axă:{" "}
            <span className="text-cyan-200/80">{end === "front" ? "față" : "spate"}</span>
            {garageCarIndex != null
              ? " · date coilover din garaj la activare dacă există salvare"
              : " · leagă mașina din garaj pentru Save"}
          </p>

      <div
        className="mt-2 grid grid-cols-2 gap-1"
        role="group"
        aria-label="Tip setup coilover"
      >
        {COILOVER_SETUP_TIER_OPTIONS.map((tier) => (
          <button
            key={tier}
            type="button"
            aria-pressed={coiloverSetupTier === tier}
            onClick={() => setCoiloverSetupTier(tier)}
            className={[
              "rounded-md border px-2 py-1.5 text-[9px] font-semibold uppercase tracking-wide transition",
              coiloverSetupTier === tier
                ? "border-cyan-500/45 bg-cyan-950/35 text-cyan-100 shadow-[0_0_10px_rgba(34,211,238,0.1)]"
                : "border-white/10 bg-black/25 text-neutral-500 hover:border-white/20 hover:text-neutral-300",
            ].join(" ")}
          >
            {COILOVER_SETUP_TIER_LABELS[tier]}
          </button>
        ))}
      </div>

      {coiloverSetupTier === "aftermarket" ? <CoiloverAftermarketBrandFields /> : null}

      <div className="mt-2 flex rounded-md border border-white/10 bg-black/25 p-0.5">
        {(["front", "rear"] as const).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={[
              "flex-1 rounded px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide transition",
              tab === id
                ? "border border-cyan-500/45 bg-cyan-950/35 text-cyan-100 shadow-[0_0_12px_rgba(34,211,238,0.12)]"
                : "border border-transparent text-neutral-500 hover:text-neutral-300",
            ].join(" ")}
          >
            {id === "front" ? "Față" : "Spate"}
          </button>
        ))}
      </div>

      <div className="mt-3 space-y-3">
        <div>
          <p className={sectionTitle}>Springs</p>
          <div className="mt-1.5 space-y-1.5">
            <div className="grid grid-cols-[minmax(0,5.5rem)_1fr] items-center gap-2">
              <span className={rowLabel}>Spring rate</span>
              <SetupSelectLike>{springRateNmm} N/mm</SetupSelectLike>
            </div>
            <div className="grid grid-cols-[minmax(0,5.5rem)_1fr] items-center gap-2">
              <span className={rowLabel}>Stroke ref.</span>
              <SetupSelectLike>{springStrokeMm} mm</SetupSelectLike>
            </div>
            <div className="grid grid-cols-[minmax(0,5.5rem)_1fr] items-center gap-2">
              <span className={rowLabel}>Ride height</span>
              <SetupSelectLike>—</SetupSelectLike>
            </div>
          </div>
        </div>

        <div>
          <p className={sectionTitle}>Dampers</p>
          <p className="mt-1 text-[8px] text-neutral-600">
            Valori sesiune (nu click-uri reale) — axa activă în simulare:{" "}
            <span className="text-neutral-400">{axleEnd === "front" ? "față" : "spate"}</span>
          </p>
          <div className="mt-1.5 grid grid-cols-[minmax(0,4.5rem)_1fr_1fr] gap-x-1.5 gap-y-1 text-center">
            <div />
            <span className="text-[8px] font-medium uppercase text-neutral-600">Stroke</span>
            <span className="text-[8px] font-medium uppercase text-neutral-600">Coef.</span>
            <span className={`${rowLabel} text-left`}>Sesiune</span>
            <SetupMiniInput>{damperStrokeMm} mm</SetupMiniInput>
            <SetupMiniInput>{damperLinearDampingCoeff.toFixed(2)}</SetupMiniInput>
          </div>
        </div>
      </div>
        </>
      ) : null}

      <div className="mt-3 space-y-3">
        <div
          id="sd-oem-anti-roll-bar"
          className={[
            "rounded-md border p-1.5 transition",
            arbRubrikActive
              ? "border-cyan-500/35 bg-cyan-950/15 ring-1 ring-cyan-500/20"
              : "border-white/10 bg-black/20",
          ].join(" ")}
        >
          <div className="flex items-stretch gap-1.5">
            <button
              type="button"
              aria-pressed={arbRubrikActive}
              title="Selectează rubricile anti-roll bar (De fabrică, Configurație, Brand, Stiffness)"
              className={[
                "flex min-h-[1.85rem] flex-1 items-center justify-between gap-2 rounded-md border px-2 py-1.5 text-left transition",
                arbRubrikActive
                  ? "border-cyan-500/45 bg-cyan-950/35 text-cyan-100 shadow-[0_0_12px_rgba(34,211,238,0.12)]"
                  : "border-white/10 bg-black/30 text-neutral-400 hover:border-cyan-500/30 hover:bg-white/[0.04] hover:text-neutral-200",
              ].join(" ")}
              onClick={onSelectAntiRollBarRubrik}
            >
              <span className="text-[9px] font-bold uppercase tracking-[0.14em]">Anti-roll bar</span>
              <span className="text-[8px] font-medium text-neutral-500" aria-hidden>
                {arbRubrikActive ? "▾" : "▸"}
              </span>
            </button>
            {arbRubrikActive ? (
              <button
                type="button"
                title={
                  garageCarIndex != null
                    ? "Salvează anti-roll bar (față + spate) în profilul mașinii din garaj"
                    : "Selectează mai întâi mașina din garaj"
                }
                disabled={garageCarIndex == null}
                className={[
                  "shrink-0 rounded-md border px-3 py-1.5 text-[8px] font-bold uppercase tracking-wide transition",
                  garageCarIndex != null
                    ? "border-emerald-500/45 bg-emerald-500/20 text-emerald-100 hover:bg-emerald-500/30"
                    : "cursor-not-allowed border-white/10 bg-black/20 text-neutral-600",
                ].join(" ")}
                onClick={() => void onSaveAntiRollBar()}
              >
                Save
              </button>
            ) : null}
          </div>
          {arbRubrikActive && arbSaveFlash ? (
            <p className="mt-1 text-[8px] leading-snug text-emerald-200/90">{arbSaveFlash}</p>
          ) : null}
          {arbRubrikActive ? (
            <div className="mt-1.5 space-y-1.5 border-t border-white/10 pt-1.5">
              <p className="text-[8px] leading-snug text-neutral-600">
                Configurație independentă față / spate
                {garageCarIndex != null
                  ? " · date încărcate din garaj la activare dacă există salvare"
                  : " · leagă mașina din garaj pentru populare automată"}
              </p>
              <div
                className="flex rounded-md border border-white/10 bg-black/25 p-0.5"
                role="tablist"
                aria-label="Axă anti-roll bar"
              >
                {(["front", "rear"] as const).map((id) => (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={arbTab === id}
                    onClick={() => setArbTab(id)}
                    className={[
                      "flex-1 rounded px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide transition",
                      arbTab === id
                        ? "border border-cyan-500/45 bg-cyan-950/35 text-cyan-100 shadow-[0_0_12px_rgba(34,211,238,0.12)]"
                        : "border border-transparent text-neutral-500 hover:text-neutral-300",
                    ].join(" ")}
                  >
                    {id === "front" ? "Față" : "Spate"}
                  </button>
                ))}
              </div>
              <AntiRollBarAxleFields bundle={arbBundle} end={arbEnd} variant="oem" />
            </div>
          ) : null}
        </div>

        <div>
          <p className={sectionTitle}>Alignment</p>
          <div className="mt-1.5 overflow-x-auto">
            <div className="grid min-w-[17rem] grid-cols-[3.25rem_1fr_1fr_1fr_1fr_1fr] gap-x-1 gap-y-1.5">
              <div />
              <div className="col-span-2 text-center">
                <span className="text-[8px] font-semibold uppercase text-sky-200/75">Stock</span>
                <div className="mt-0.5 grid grid-cols-2 gap-x-1">
                  <span className="text-[7px] uppercase text-neutral-600">L</span>
                  <span className="text-[7px] uppercase text-neutral-600">R</span>
                </div>
              </div>
              <div className="text-center">
                <span className="text-[8px] font-semibold uppercase text-violet-200/80">Curent</span>
              </div>
              <div className="col-span-2 text-center">
                <span className="text-[8px] font-semibold uppercase text-sky-200/75">Țintă</span>
                <div className="mt-0.5 grid grid-cols-2 gap-x-1">
                  <span className="text-[7px] uppercase text-neutral-600">L</span>
                  <span className="text-[7px] uppercase text-neutral-600">R</span>
                </div>
              </div>

              <span className={`${rowLabel} pt-1`}>Camber</span>
              <div className="contents text-neutral-200">
                <div className="rounded border border-white/10 bg-black/35 p-1">
                  <MetricTraceCell value={camSL} source="declared" title="OEM interval / stânga din doc." />
                </div>
                <div className="rounded border border-white/10 bg-black/35 p-1">
                  <MetricTraceCell value={camSR} source="declared" title="OEM interval / dreapta din doc." />
                </div>
                <div className="rounded border border-white/10 bg-black/35 p-1">
                  <MetricTraceCell
                    value={camCur}
                    source={measuredCamberDeg != null ? "manual" : "placeholder"}
                    title="Camber măsurat la banc — nu din modelul 2D."
                  />
                </div>
                <div className="rounded border border-white/10 bg-black/35 p-1">
                  <MetricTraceCell value={camTL} source="declared" title="Țintă preset camber." />
                </div>
                <div className="rounded border border-white/10 bg-black/35 p-1">
                  <MetricTraceCell value={camTR} source="declared" title="Țintă preset camber." />
                </div>
              </div>

              <span className={`${rowLabel} pt-1`}>Toe</span>
              <div className="contents text-neutral-200">
                <div className="rounded border border-white/10 bg-black/35 p-1">
                  <MetricTraceCell value={toeSL} source="declared" title="OEM toe — doc." />
                </div>
                <div className="rounded border border-white/10 bg-black/35 p-1">
                  <MetricTraceCell value={toeSR} source="declared" title="OEM toe — doc." />
                </div>
                <div className="rounded border border-white/10 bg-black/35 p-1">
                  <MetricTraceCell
                    value={toeCur}
                    source="placeholder"
                    title="Toe nu e calculat din geometrie în acest build."
                  />
                </div>
                <div className="rounded border border-white/10 bg-black/35 p-1">
                  <MetricTraceCell value={toeTL} source="declared" title="Țintă preset toe." />
                </div>
                <div className="rounded border border-white/10 bg-black/35 p-1">
                  <MetricTraceCell value={toeTR} source="declared" title="Țintă preset toe." />
                </div>
              </div>

              {end === "front" ? (
                <>
                  <span className={`${rowLabel} pt-1`}>Caster</span>
                  <div className="contents text-neutral-200">
                    <div className="rounded border border-white/10 bg-black/35 p-1">
                      <MetricTraceCell value={casSL} source="declared" title="OEM caster — doc." />
                    </div>
                    <div className="rounded border border-white/10 bg-black/35 p-1">
                      <MetricTraceCell value={casSR} source="declared" title="OEM caster — doc." />
                    </div>
                    <div className="rounded border border-white/10 bg-black/35 p-1">
                      <MetricTraceCell
                        value={casCur}
                        source="placeholder"
                        title="Caster nu e calculat din geometrie în acest build."
                      />
                    </div>
                    <div className="rounded border border-white/10 bg-black/35 p-1">
                      <MetricTraceCell value={casTL} source="declared" title="Țintă preset caster." />
                    </div>
                    <div className="rounded border border-white/10 bg-black/35 p-1">
                      <MetricTraceCell value={casTR} source="declared" title="Țintă preset caster." />
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-white/10 pt-2">
        <label className="flex min-w-[7rem] flex-1 flex-col gap-0.5 text-[9px] text-neutral-500">
          <span>Camber măsurat (°)</span>
          <input
            type="number"
            step={0.01}
            placeholder="ex. −1.25"
            className="w-full rounded border border-white/10 bg-black/40 px-1.5 py-1 font-mono text-[11px] text-neutral-100 placeholder:text-neutral-600"
            value={measuredCamberDeg ?? ""}
            onChange={(e) => {
              const raw = e.target.value;
              if (raw === "" || raw === "-") setMeasuredCamberDeg(null);
              else {
                const n = Number(raw);
                if (!Number.isNaN(n)) setMeasuredCamberDeg(n);
              }
            }}
          />
        </label>
        <button
          type="button"
          onClick={() => setMeasuredCamberDeg(null)}
          className="shrink-0 rounded border border-white/10 px-2 py-1 text-[9px] font-medium text-neutral-400 hover:bg-white/5"
        >
          Șterge
        </button>
      </div>

      <HandlingSteeringFeelSection />

      {engineeringDebug ? (
        <div className="mt-2 space-y-1 rounded border border-white/10 bg-black/40 p-2 font-mono text-[8px] leading-relaxed text-neutral-500">
          <div>
            <span className="text-neutral-600">Camber curent</span> · manual când câmpul e completat · nu din
            modelul 2D.
          </div>
          <div>
            <span className="text-neutral-600">Camber model 2D (sesiune)</span> · {kin.camberDeg.toFixed(2)}° ·
            derived · vezi Kinematics.
          </div>
          <div>
            <span className="text-neutral-600">Stock / țintă</span> · declared · vehicleStockSuspension + preset.
          </div>
        </div>
      ) : null}
      <p className="mt-2 text-[9px] leading-snug text-neutral-500">{bundle.stockSuspension.oemDesignIntent}</p>
    </div>
  );
}
