import type { AntiRollBarMode } from "../data/antiRollBar";
import {
  ANTI_ROLL_BAR_MODE_LABELS,
  ANTI_ROLL_BAR_STIFFNESS_LABELS,
  ANTI_ROLL_BAR_STIFFNESS_OPTIONS,
  ANTI_ROLL_BAR_TUNING_BRANDS,
  antiRollBarModesForFactory,
  axleHasFactoryAntiRollBar,
} from "../data/antiRollBar";
import type { AxleStockBundle } from "../data/vehicleStockSuspension";
import { useSuspensionStore } from "../store/suspensionStore";

const setupSelectShell =
  "w-full rounded border border-white/10 bg-[#0b0f14] px-1.5 py-1 font-mono text-[10px] text-neutral-200 shadow-inner outline-none focus:border-cyan-500/35";

type Variant = "oem" | "config";

function StiffnessSelect({
  className,
  value,
  onChange,
  placeholder = "Selectează…",
}: {
  className: string;
  value: string;
  onChange: (tier: "low" | "medium" | "high" | null) => void;
  placeholder?: string;
}) {
  return (
    <select
      className={className}
      value={value}
      onChange={(e) => {
        const raw = e.target.value;
        if (raw === "low" || raw === "medium" || raw === "high") onChange(raw);
        else onChange(null);
      }}
    >
      <option value="">{placeholder}</option>
      {ANTI_ROLL_BAR_STIFFNESS_OPTIONS.map((tier) => (
        <option key={tier} value={tier}>
          {ANTI_ROLL_BAR_STIFFNESS_LABELS[tier]}
        </option>
      ))}
    </select>
  );
}

export function AntiRollBarAxleFields({
  bundle,
  end,
  variant = "config",
}: {
  bundle: AxleStockBundle;
  end: "front" | "rear";
  variant?: Variant;
}) {
  const factory = axleHasFactoryAntiRollBar(bundle);
  const modes = antiRollBarModesForFactory(factory);

  const frontMode = useSuspensionStore((s) => s.antiRollBarFrontMode);
  const rearMode = useSuspensionStore((s) => s.antiRollBarRearMode);
  const frontBrand = useSuspensionStore((s) => s.antiRollBarFrontBrand);
  const rearBrand = useSuspensionStore((s) => s.antiRollBarRearBrand);
  const frontStiffness = useSuspensionStore((s) => s.antiRollBarFrontStiffness);
  const rearStiffness = useSuspensionStore((s) => s.antiRollBarRearStiffness);
  const setFrontMode = useSuspensionStore((s) => s.setAntiRollBarFrontMode);
  const setRearMode = useSuspensionStore((s) => s.setAntiRollBarRearMode);
  const setFrontBrand = useSuspensionStore((s) => s.setAntiRollBarFrontBrand);
  const setRearBrand = useSuspensionStore((s) => s.setAntiRollBarRearBrand);
  const setFrontStiffness = useSuspensionStore((s) => s.setAntiRollBarFrontStiffness);
  const setRearStiffness = useSuspensionStore((s) => s.setAntiRollBarRearStiffness);

  const mode = end === "front" ? frontMode : rearMode;
  const brand = end === "front" ? frontBrand : rearBrand;
  const stiffness = end === "front" ? frontStiffness : rearStiffness;
  const setMode = end === "front" ? setFrontMode : setRearMode;
  const setBrand = end === "front" ? setFrontBrand : setRearBrand;
  const setStiffness = end === "front" ? setFrontStiffness : setRearStiffness;

  const rowLabel =
    variant === "oem"
      ? "text-[9px] text-neutral-500"
      : "text-[10px] text-neutral-500";
  const sectionHint =
    variant === "oem" ? "text-[8px] text-neutral-600" : "text-[11px] text-neutral-500";

  const selectClass =
    variant === "oem"
      ? setupSelectShell
      : "mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-2 py-2 font-mono text-sm text-white outline-none focus:border-cyan-500/40";

  const gridClass =
    variant === "oem"
      ? "grid grid-cols-[minmax(0,5.5rem)_1fr] items-center gap-2"
      : "space-y-2";

  const configCellClass =
    variant === "oem"
      ? "flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-1.5"
      : "mt-1 flex min-w-0 flex-col gap-1.5 sm:flex-row sm:items-center";

  return (
    <div className={variant === "config" ? "space-y-2" : undefined}>
      {variant === "config" ? (
        <p className={sectionHint}>
          {factory
            ? "Stock: rigiditate OEM în Configurație · Tuning: brand, apoi rigiditatea barei."
            : "N/A sau Tuning — la Tuning alegi brandul, apoi rigiditatea."}
        </p>
      ) : null}

      <div className={gridClass}>
        <span className={rowLabel}>De fabrică</span>
        {variant === "oem" ? (
          <div
            className={`${setupSelectShell} flex min-h-[1.75rem] cursor-default items-center justify-between`}
          >
            <span>{factory ? "Da" : "Nu"}</span>
          </div>
        ) : (
          <p className="mt-0.5 font-mono text-sm text-neutral-200">{factory ? "Da" : "Nu"}</p>
        )}
      </div>

      <div className={gridClass}>
        <span className={rowLabel}>Configurație</span>
        <div className={configCellClass}>
          <select
            className={`${selectClass} ${mode === "stock" ? "min-w-0 flex-1 sm:max-w-[48%]" : ""}`}
            value={mode}
            onChange={(e) => setMode(e.target.value as AntiRollBarMode)}
          >
            {modes.map((m) => (
              <option key={m} value={m}>
                {ANTI_ROLL_BAR_MODE_LABELS[m]}
              </option>
            ))}
          </select>
          {mode === "stock" ? (
            <StiffnessSelect
              className={`${selectClass} min-w-0 flex-1`}
              value={stiffness ?? ""}
              onChange={setStiffness}
              placeholder="Rigiditate OEM"
            />
          ) : null}
        </div>
      </div>

      {mode === "tuning" ? (
        <div className={gridClass}>
          <span className={rowLabel}>
            {variant === "oem" ? "Brand" : "Brand anti-roll bar"}
          </span>
          <select
            className={selectClass}
            value={brand ?? ""}
            onChange={(e) => setBrand(e.target.value || null)}
          >
            <option value="">Selectează brand…</option>
            {ANTI_ROLL_BAR_TUNING_BRANDS.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {mode === "tuning" && brand ? (
        <div className={gridClass}>
          <span className={rowLabel}>Stiffness</span>
          <StiffnessSelect
            className={selectClass}
            value={stiffness ?? ""}
            onChange={setStiffness}
          />
        </div>
      ) : null}

      {variant === "oem" ? (
        <p className="text-[8px] leading-snug text-neutral-600">
          {factory
            ? "Stock: Low/Medium/High în Configurație · Tuning: brand, apoi Stiffness."
            : "Tuning: brand, apoi Stiffness (Low / Medium / High)."}
        </p>
      ) : null}
    </div>
  );
}
