import {
  FOOTER_OFFSET_OPTIONS,
  FOOTER_STAGGER_OPTIONS,
  FOOTER_TIRE_SIZE_OPTIONS,
  FOOTER_TIRE_TYPE_OPTIONS,
  FOOTER_WHEEL_WIDTH_OPTIONS,
  type VehicleFooterTiresManual,
} from "../data/vehicleFooterTechnicalManual";
import { useSuspensionAssistantStore } from "../store/suspensionAssistantStore";

const labelClass = "text-[8px] font-semibold uppercase tracking-[0.1em] text-neutral-500";

function SelectChevron() {
  return (
    <span
      className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-[8px] text-neutral-500"
      aria-hidden
    >
      ▾
    </span>
  );
}

function pick<T extends string>(value: string, options: readonly T[]): string {
  return (options as readonly string[]).includes(value) ? value : options[0]!;
}

type Variant = "footer" | "modal";

const styles: Record<
  Variant,
  { select: string; input: string; grid: string; tireDataBox: string; iconCol: string }
> = {
  footer: {
    select:
      "w-full min-w-0 appearance-none rounded border border-white/10 bg-[#0b0f14] px-1.5 py-0.5 pr-6 text-[10px] text-neutral-200 shadow-inner outline-none transition focus:border-cyan-400/45 focus:ring-1 focus:ring-cyan-400/25",
    input:
      "w-full min-w-0 rounded border border-white/10 bg-[#0b0f14] px-1.5 py-0.5 text-[10px] text-neutral-200 shadow-inner outline-none transition focus:border-cyan-400/45 focus:ring-1 focus:ring-cyan-400/25",
    grid: "grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,3rem)_1fr_minmax(0,7.5rem)] sm:items-start",
    tireDataBox: "space-y-0.5 rounded border border-white/[0.06] bg-black/20 p-1.5 text-[8px] leading-tight",
    iconCol: "mx-auto flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/10 bg-gradient-to-br from-neutral-800 to-black shadow-inner sm:mx-0",
  },
  modal: {
    select:
      "w-full min-w-0 appearance-none rounded-lg border border-white/10 bg-[#0b0f14] px-2 py-2 pr-8 text-xs text-neutral-200 shadow-inner outline-none transition focus:border-cyan-400/45 focus:ring-1 focus:ring-cyan-400/25",
    input:
      "w-full min-w-0 rounded-lg border border-white/10 bg-[#0b0f14] px-2 py-2 text-xs text-neutral-200 shadow-inner outline-none transition focus:border-cyan-400/45 focus:ring-1 focus:ring-cyan-400/25",
    grid: "grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,3.5rem)_1fr_minmax(0,11rem)] sm:items-start",
    tireDataBox: "space-y-2 rounded-lg border border-white/[0.08] bg-black/25 p-3 text-[10px] leading-snug",
    iconCol:
      "mx-auto flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-white/10 bg-gradient-to-br from-neutral-800 to-black shadow-inner sm:mx-0",
  },
};

/**
 * Anvelope & jante — aceleași câmpuri ca în footer; `fieldIdSuffix` evită duplicate id când modal + footer sunt în DOM.
 */
export function VehicleTiresWheelsFields({
  variant = "footer",
  fieldIdSuffix = "",
}: {
  variant?: Variant;
  fieldIdSuffix?: string;
}) {
  const t = useSuspensionAssistantStore((s) => s.vehicleFooterTiresManual);
  const patchT = useSuspensionAssistantStore((s) => s.setVehicleFooterTiresManual);
  const st = styles[variant];

  const fid = (base: string) => `${base}${fieldIdSuffix}`;

  return (
    <div className={st.grid}>
      <div className={st.iconCol} aria-hidden>
        <div className="h-8 w-8 rounded-full border-[3px] border-neutral-600 bg-neutral-900 shadow-[inset_0_0_6px_rgba(0,0,0,0.8)] sm:h-9 sm:w-9" />
      </div>
      <div className="min-w-0 space-y-1 sm:space-y-1.5">
        {(
          [
            ["Tire type", "tireType", FOOTER_TIRE_TYPE_OPTIONS] as const,
            ["Front size", "frontSize", FOOTER_TIRE_SIZE_OPTIONS] as const,
            ["Rear size", "rearSize", FOOTER_TIRE_SIZE_OPTIONS] as const,
            ["Wheel width (F/R)", "wheelWidthFr", FOOTER_WHEEL_WIDTH_OPTIONS] as const,
            ["Offset (F/R)", "offsetFr", FOOTER_OFFSET_OPTIONS] as const,
            ["Setup", "setup", FOOTER_STAGGER_OPTIONS] as const,
          ] as const
        ).map(([lab, key, opts]) => (
          <div key={key}>
            <label htmlFor={fid(`fti-${key}`)} className={labelClass}>
              {lab}
            </label>
            <div className="relative mt-0.5">
              <select
                id={fid(`fti-${key}`)}
                className={st.select}
                value={pick(t[key], opts)}
                onChange={(e) => patchT({ [key]: e.target.value } as Partial<VehicleFooterTiresManual>)}
              >
                {opts.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
              <SelectChevron />
            </div>
          </div>
        ))}
      </div>
      <div className={st.tireDataBox}>
        <p className={`${labelClass} mb-0.5`}>Tire data</p>
        {(
          [
            ["Vertical stiffness", "verticalStiffnessKnm", "kN/m"],
            ["Lateral stiffness", "lateralStiffnessKndeg", "kN/°"],
            ["Camber stiffness", "camberStiffnessKndeg", "kN/°"],
            ["Optimal slip angle", "optimalSlipAngleDeg", "°"],
          ] as const
        ).map(([lab, key, unit]) => (
          <label key={key} htmlFor={fid(`fti-num-${key}`)} className="flex flex-col gap-0.5 border-b border-white/[0.05] py-1 last:border-0">
            <span className="text-neutral-400">{lab}</span>
            <div className="flex items-baseline gap-1">
              <input
                id={fid(`fti-num-${key}`)}
                className={`${st.input} font-mono`}
                value={t[key]}
                onChange={(e) => patchT({ [key]: e.target.value } as Partial<VehicleFooterTiresManual>)}
                inputMode="decimal"
                autoComplete="off"
                spellCheck={false}
              />
              <span className="shrink-0 text-[8px] text-neutral-500">{unit}</span>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}
