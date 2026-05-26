import {
  FOOTER_DIFFERENTIAL_OPTIONS,
  FOOTER_FINAL_DRIVE_OPTIONS,
  FOOTER_LOCK_PCT_OPTIONS,
  FOOTER_PRELOAD_OPTIONS,
  FOOTER_TRANSMISSION_TYPES,
  type VehicleFooterDrivetrainManual,
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

const styles: Record<Variant, { select: string; input: string; grid: string; gearLabel: string }> = {
  footer: {
    select:
      "w-full min-w-0 appearance-none rounded border border-white/10 bg-[#0b0f14] px-1.5 py-0.5 pr-6 text-[10px] text-neutral-200 shadow-inner outline-none transition focus:border-cyan-400/45 focus:ring-1 focus:ring-cyan-400/25",
    input:
      "w-full min-w-0 rounded border border-white/10 bg-[#0b0f14] px-1.5 py-0.5 text-[10px] text-neutral-200 shadow-inner outline-none transition focus:border-cyan-400/45 focus:ring-1 focus:ring-cyan-400/25",
    grid: "grid grid-cols-1 gap-2 sm:grid-cols-2",
    gearLabel: "text-[7px] font-mono leading-none text-neutral-600",
  },
  modal: {
    select:
      "w-full min-w-0 appearance-none rounded-lg border border-white/10 bg-[#0b0f14] px-2 py-2 pr-8 text-xs text-neutral-200 shadow-inner outline-none transition focus:border-cyan-400/45 focus:ring-1 focus:ring-cyan-400/25",
    input:
      "w-full min-w-0 rounded-lg border border-white/10 bg-[#0b0f14] px-2 py-2 text-xs text-neutral-200 shadow-inner outline-none transition focus:border-cyan-400/45 focus:ring-1 focus:ring-cyan-400/25",
    grid: "grid grid-cols-1 gap-4 sm:grid-cols-2",
    gearLabel: "text-[9px] font-mono leading-none text-neutral-500",
  },
};

/**
 * Drivetrain & transmission — aceleași câmpuri ca în footer; `fieldIdSuffix` evită id duplicate când modal + footer sunt în DOM.
 */
export function VehicleDrivetrainFields({
  variant = "footer",
  fieldIdSuffix = "",
}: {
  variant?: Variant;
  fieldIdSuffix?: string;
}) {
  const d = useSuspensionAssistantStore((s) => s.vehicleFooterDrivetrainManual);
  const patchD = useSuspensionAssistantStore((s) => s.setVehicleFooterDrivetrainManual);
  const st = styles[variant];

  const fid = (base: string) => `${base}${fieldIdSuffix}`;

  return (
    <div className={st.grid}>
      <div className="space-y-1.5">
        <div>
          <label htmlFor={fid("ft-trans")} className={labelClass}>
            Transmission type
          </label>
          <div className="relative mt-0.5">
            <select
              id={fid("ft-trans")}
              className={st.select}
              value={pick(d.transmissionType, FOOTER_TRANSMISSION_TYPES)}
              onChange={(e) => patchD({ transmissionType: e.target.value })}
            >
              {FOOTER_TRANSMISSION_TYPES.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
            <SelectChevron />
          </div>
        </div>
        <div>
          <p className={labelClass}>Gear ratios</p>
          <div className="mt-0.5 grid grid-cols-3 gap-1">
            {(
              [
                ["1", "gearRatio1"],
                ["2", "gearRatio2"],
                ["3", "gearRatio3"],
                ["4", "gearRatio4"],
                ["5", "gearRatio5"],
                ["6", "gearRatio6"],
              ] as const
            ).map(([num, key]) => (
              <label key={key} htmlFor={fid(`ft-gr-${key}`)} className="flex flex-col gap-0">
                <span className={st.gearLabel}>{num}</span>
                <input
                  id={fid(`ft-gr-${key}`)}
                  className={`${st.input} font-mono text-[9px] leading-tight sm:text-[10px]`}
                  value={d[key]}
                  onChange={(e) => patchD({ [key]: e.target.value } as Partial<VehicleFooterDrivetrainManual>)}
                  inputMode="decimal"
                  autoComplete="off"
                  spellCheck={false}
                />
              </label>
            ))}
          </div>
        </div>
      </div>
      <div className="space-y-1.5">
        {(
          [
            ["Final drive", "finalDrive", FOOTER_FINAL_DRIVE_OPTIONS] as const,
            ["Differential", "differential", FOOTER_DIFFERENTIAL_OPTIONS] as const,
            ["Lock percentage", "lockPercentage", FOOTER_LOCK_PCT_OPTIONS] as const,
            ["Preload", "preloadNm", FOOTER_PRELOAD_OPTIONS] as const,
          ] as const
        ).map(([lab, key, opts]) => (
          <div key={key}>
            <label htmlFor={fid(`ft-${key}`)} className={labelClass}>
              {lab}
            </label>
            <div className="relative mt-0.5">
              <select
                id={fid(`ft-${key}`)}
                className={st.select}
                value={pick(d[key], opts)}
                onChange={(e) => patchD({ [key]: e.target.value } as Partial<VehicleFooterDrivetrainManual>)}
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
    </div>
  );
}
