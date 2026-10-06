import {
  ANGLE_ARMS_LABELS,
  ANGLE_ARMS_OPTIONS,
  BUSHINGS_TYPE_LABELS,
  BUSHINGS_TYPE_OPTIONS,
  CHASSIS_BRACING_LABELS,
  CHASSIS_BRACING_OPTIONS,
  getSteeringRackSpec,
  STEERING_RACK_RATIO_LABELS,
  STEERING_RACK_RATIO_OPTIONS,
  STRUT_BAR_BRACING_LABELS,
  STRUT_BAR_BRACING_OPTIONS,
} from "../data/handlingSteeringFeel";
import { useState } from "react";
import {
  applyHandlingSteeringFeelToStore,
  readHandlingSteeringFeelFromCar,
  saveHandlingSteeringFeelToGarageCar,
} from "../lib/garageHandlingSteeringFeelProfile";
import { readSavedCars } from "../lib/garageStorage";
import {
  collectSavedSuspensionConfiguration,
  writeSavedSuspensionConfiguration,
} from "../lib/suspensionManualConfigPersistence";
import { useVehicleDynamicsReport } from "../hooks/useVehicleDynamicsReport";
import { useSuspensionAssistantStore } from "../store/suspensionAssistantStore";
import { useSuspensionStore } from "../store/suspensionStore";

const rowLabel = "text-[9px] text-neutral-500";
const setupSelectShell =
  "w-full rounded border border-white/10 bg-[#0b0f14] px-1.5 py-1 font-mono text-[10px] text-neutral-200 shadow-inner outline-none focus:border-cyan-500/35";

const HANDLING_FEEL_KEYS = [
  "understeerOversteer",
  "steeringResponse",
  "rotationTendency",
  "stability",
] as const;

function FeelSelectRow<T extends string>({
  label,
  value,
  options,
  labels,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly T[];
  labels: Record<T, string>;
  onChange: (v: T) => void;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,6.75rem)_1fr] items-center gap-2">
      <span className={rowLabel}>{label}</span>
      <select
        className={setupSelectShell}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
      >
        {options.map((id) => (
          <option key={id} value={id}>
            {labels[id]}
          </option>
        ))}
      </select>
    </div>
  );
}

export function HandlingSteeringFeelSection() {
  const [saveFlash, setSaveFlash] = useState<string | null>(null);
  const rubrikActive = useSuspensionAssistantStore((s) => s.handlingSteeringFeelRubrikActive);
  const setRubrikActive = useSuspensionAssistantStore((s) => s.setHandlingSteeringFeelRubrikActive);
  const setAntiRollBarRubrikActive = useSuspensionAssistantStore((s) => s.setAntiRollBarRubrikActive);
  const setCoiloverSetupRubrikActive = useSuspensionAssistantStore((s) => s.setCoiloverSetupRubrikActive);
  const garageCarIndex = useSuspensionStore((s) => s.garageCarIndex);

  const hf = useSuspensionStore((s) => s.handlingSteeringFeel);
  const setSteeringRackRatio = useSuspensionStore((s) => s.setSteeringRackRatio);
  const setSteeringRackRatioCustom = useSuspensionStore((s) => s.setSteeringRackRatioCustom);
  const setFrontStrutBarBracing = useSuspensionStore((s) => s.setFrontStrutBarBracing);
  const setRearStrutBarBracing = useSuspensionStore((s) => s.setRearStrutBarBracing);
  const setChassisBracing = useSuspensionStore((s) => s.setChassisBracing);
  const setBushingsType = useSuspensionStore((s) => s.setBushingsType);
  const setAngleArms = useSuspensionStore((s) => s.setAngleArms);

  const dynReport = useVehicleDynamicsReport();
  const engineeringDebug = useSuspensionAssistantStore((s) => s.engineeringDebugMode);
  const sa = dynReport.setupAssistant;
  const synthRows = HANDLING_FEEL_KEYS.map((key) => sa[key]);
  const rackSpec = getSteeringRackSpec(hf.steeringRackRatio);

  const populateFromGarage = () => {
    if (garageCarIndex == null) return;
    const cars = readSavedCars();
    if (garageCarIndex < 0 || garageCarIndex >= cars.length) return;
    const saved = readHandlingSteeringFeelFromCar(cars[garageCarIndex]!);
    if (saved) applyHandlingSteeringFeelToStore(saved);
  };

  const onToggleRubrik = () => {
    const next = !rubrikActive;
    setRubrikActive(next);
    if (next) {
      setAntiRollBarRubrikActive(false);
      setCoiloverSetupRubrikActive(false);
      populateFromGarage();
    }
  };

  const onSave = async () => {
    if (garageCarIndex == null) {
      setSaveFlash("Selectează mașina din garaj (sidebar stânga).");
      window.setTimeout(() => setSaveFlash(null), 4000);
      return;
    }
    const result = await saveHandlingSteeringFeelToGarageCar(garageCarIndex);
    if (result.ok) {
      writeSavedSuspensionConfiguration(collectSavedSuspensionConfiguration());
    }
    setSaveFlash(result.message);
    window.setTimeout(() => setSaveFlash(null), 4000);
  };

  return (
    <div
      id="sd-oem-handling-steering-feel"
      className={[
        "mt-3 rounded-md border p-1.5 transition",
        rubrikActive
          ? "border-cyan-500/35 bg-cyan-950/15 ring-1 ring-cyan-500/20"
          : "border-white/10 bg-black/20",
      ].join(" ")}
    >
      <div className="flex items-stretch gap-1.5">
        <button
          type="button"
          aria-pressed={rubrikActive}
          title="Activează rubricile: rack, strut bars, chassis bracing, bushings, angle arms"
          className={[
            "flex min-h-[1.85rem] flex-1 items-center justify-between gap-2 rounded-md border px-2 py-1.5 text-left transition",
            rubrikActive
              ? "border-cyan-500/45 bg-cyan-950/35 text-cyan-100 shadow-[0_0_12px_rgba(34,211,238,0.12)]"
              : "border-white/10 bg-black/30 text-neutral-400 hover:border-cyan-500/30 hover:bg-white/[0.04] hover:text-neutral-200",
          ].join(" ")}
          onClick={onToggleRubrik}
        >
          <span className="text-[9px] font-bold uppercase tracking-[0.14em]">
            Handling and steering feel
          </span>
          <span className="text-[8px] font-medium text-neutral-500" aria-hidden>
            {rubrikActive ? "▾" : "▸"}
          </span>
        </button>
        {rubrikActive ? (
          <button
            type="button"
            title={
              garageCarIndex != null
                ? "Salvează handling & steering feel în profilul mașinii din garaj"
                : "Selectează mai întâi mașina din garaj"
            }
            disabled={garageCarIndex == null}
            className={[
              "shrink-0 rounded-md border px-3 py-1.5 text-[8px] font-bold uppercase tracking-wide transition",
              garageCarIndex != null
                ? "border-emerald-500/45 bg-emerald-500/20 text-emerald-100 hover:bg-emerald-500/30"
                : "cursor-not-allowed border-white/10 bg-black/20 text-neutral-600",
            ].join(" ")}
            onClick={() => void onSave()}
          >
            Save
          </button>
        ) : null}
      </div>

      {rubrikActive && saveFlash ? (
        <p className="mt-1 text-[8px] leading-snug text-emerald-200/90">{saveFlash}</p>
      ) : null}

      {rubrikActive ? (
        <div className="mt-1.5 space-y-1.5 border-t border-white/10 pt-1.5">
          <p className="text-[8px] leading-snug text-neutral-600">
            Hardware și setări percepute — declarative, nu din simulare completă.
            {garageCarIndex != null
              ? " · date încărcate din garaj la activare dacă există salvare"
              : " · leagă mașina din garaj pentru Save"}
          </p>

          <div className="space-y-1.5">
            <div className="grid grid-cols-[minmax(0,6.75rem)_1fr] items-center gap-2">
              <span className={rowLabel}>Steering rack</span>
              <select
                className={setupSelectShell}
                value={hf.steeringRackRatio}
                onChange={(e) => setSteeringRackRatio(e.target.value as typeof hf.steeringRackRatio)}
              >
                {STEERING_RACK_RATIO_OPTIONS.map((id) => (
                  <option key={id} value={id}>
                    {STEERING_RACK_RATIO_LABELS[id]}
                  </option>
                ))}
              </select>
            </div>

            {hf.steeringRackRatio !== "custom" ? (
              <div className="rounded border border-white/10 bg-black/35 px-2 py-1.5 text-[8px] leading-snug text-neutral-400">
                <p className="font-semibold text-cyan-200/85">{rackSpec.tagLabel}</p>
                {rackSpec.codes !== "—" ? (
                  <p className="mt-0.5">
                    <span className="text-neutral-500">Cod: </span>
                    {rackSpec.codes}
                  </p>
                ) : null}
                <p className="mt-0.5">{rackSpec.application}</p>
                <div className="mt-1 grid grid-cols-3 gap-1 font-mono text-[9px] text-neutral-200">
                  <div>
                    <span className="block text-[7px] uppercase text-neutral-600">L2L</span>
                    {rackSpec.lockToLockTurns}
                  </div>
                  <div>
                    <span className="block text-[7px] uppercase text-neutral-600">Rack rate</span>
                    {rackSpec.rackRateMmPerRev}
                  </div>
                  <div>
                    <span className="block text-[7px] uppercase text-neutral-600">Cursă</span>
                    {rackSpec.totalTravelMm}
                  </div>
                </div>
                {rackSpec.notes !== "—" ? (
                  <p className="mt-1 text-neutral-500">{rackSpec.notes}</p>
                ) : null}
              </div>
            ) : null}

            {hf.steeringRackRatio === "custom" ? (
              <div className="space-y-1.5">
                <div className="grid grid-cols-[minmax(0,6.75rem)_1fr] items-center gap-2">
                  <span className={rowLabel}>Notă custom</span>
                  <input
                    type="text"
                    placeholder="Tag, cod ZF, L2L, rack rate…"
                    className={setupSelectShell}
                    value={hf.steeringRackRatioCustom ?? ""}
                    onChange={(e) => setSteeringRackRatioCustom(e.target.value.trim() || null)}
                  />
                </div>
                <p className="text-[8px] leading-snug text-neutral-600">{rackSpec.notes}</p>
              </div>
            ) : null}

            <FeelSelectRow
              label="Front strut bar"
              value={hf.frontStrutBarBracing}
              options={STRUT_BAR_BRACING_OPTIONS}
              labels={STRUT_BAR_BRACING_LABELS}
              onChange={setFrontStrutBarBracing}
            />
            <FeelSelectRow
              label="Rear strut bar"
              value={hf.rearStrutBarBracing}
              options={STRUT_BAR_BRACING_OPTIONS}
              labels={STRUT_BAR_BRACING_LABELS}
              onChange={setRearStrutBarBracing}
            />
            <FeelSelectRow
              label="Chassis bracing"
              value={hf.chassisBracing}
              options={CHASSIS_BRACING_OPTIONS}
              labels={CHASSIS_BRACING_LABELS}
              onChange={setChassisBracing}
            />
            <FeelSelectRow
              label="Bushings type"
              value={hf.bushingsType}
              options={BUSHINGS_TYPE_OPTIONS}
              labels={BUSHINGS_TYPE_LABELS}
              onChange={setBushingsType}
            />
            <FeelSelectRow
              label="Angle arms"
              value={hf.angleArms}
              options={ANGLE_ARMS_OPTIONS}
              labels={ANGLE_ARMS_LABELS}
              onChange={setAngleArms}
            />
          </div>

          <details className="rounded border border-white/10 bg-black/30">
            <summary className="cursor-pointer select-none px-2 py-1.5 text-[8px] font-semibold uppercase tracking-wide text-neutral-500 hover:text-neutral-300">
              Sinteză estimată (motor reguli)
            </summary>
            <ul className="space-y-1 border-t border-white/10 px-2 py-1.5">
              {synthRows.map((row, i) => (
                <li
                  key={HANDLING_FEEL_KEYS[i]}
                  className="text-[9px] leading-snug text-neutral-300"
                  title={engineeringDebug ? row.explanation : row.value}
                >
                  {row.value}
                </li>
              ))}
            </ul>
          </details>
        </div>
      ) : null}
    </div>
  );
}
