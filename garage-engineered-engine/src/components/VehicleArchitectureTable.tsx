import {
  VEHICLE_ARCHITECTURE_DRIVETRAIN_OPTIONS,
  VEHICLE_ARCHITECTURE_ENGINE_POSITION_OPTIONS,
  VEHICLE_ARCHITECTURE_LAYOUT_OPTIONS,
  type VehicleArchitectureManual,
} from "../data/vehicleArchitectureManual";
import { useSuspensionAssistantStore } from "../store/suspensionAssistantStore";
import { SIDEBAR_VEHICLE_PANEL_ZOOM } from "../lib/sidebarVehiclePanelZoom";

function pickOption(value: string, options: readonly string[]): string {
  return options.includes(value) ? value : options[0]!;
}

const selectClass =
  "w-full min-w-0 appearance-none rounded-[0.4rem] border border-white/10 bg-[#0b0f14] px-3 py-2 pr-9 text-sm text-neutral-200 shadow-inner outline-none transition focus:border-cyan-400/45 focus:ring-1 focus:ring-cyan-400/30";

const selectClassStackCompact =
  "w-full min-w-0 appearance-none rounded-md border border-white/10 bg-[#0b0f14] px-2 py-1 pr-7 text-[11px] leading-tight text-neutral-200 shadow-inner outline-none transition focus:border-cyan-400/45 focus:ring-1 focus:ring-cyan-400/30";

const inputClass =
  "w-full min-w-0 rounded-[0.4rem] border border-white/10 bg-[#0b0f14] px-3 py-2 text-sm text-neutral-200 shadow-inner outline-none transition placeholder:text-neutral-600 focus:border-cyan-400/45 focus:ring-1 focus:ring-cyan-400/30";

const inputClassStackCompact =
  "w-full min-w-0 rounded-md border border-white/10 bg-[#0b0f14] px-2 py-1 text-[11px] leading-tight text-neutral-200 shadow-inner outline-none transition placeholder:text-neutral-600 focus:border-cyan-400/45 focus:ring-1 focus:ring-cyan-400/30";

const labelClass =
  "shrink-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500 sm:w-[11.5rem] sm:pt-2 sm:text-right";

const labelClassStackCompact =
  "text-[8px] font-semibold uppercase tracking-[0.1em] text-neutral-500 leading-tight";

function SelectRow({
  id,
  label,
  value,
  options,
  onChange,
  stackVertical,
}: {
  id: string;
  label: string;
  value: string;
  options: readonly string[];
  onChange: (v: string) => void;
  stackVertical?: boolean;
}) {
  if (stackVertical) {
    return (
      <div className="flex flex-col gap-0.5">
        <label htmlFor={id} className={labelClassStackCompact}>
          {label}
        </label>
        <div className="relative min-w-0 w-full">
          <select id={id} className={selectClassStackCompact} value={value} onChange={(e) => onChange(e.target.value)}>
            {options.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
          <span
            className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[8px] text-neutral-500"
            aria-hidden
          >
            ▾
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col-reverse gap-1.5 sm:flex-row-reverse sm:items-start sm:justify-between sm:gap-4">
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <div className="relative min-w-0 flex-1">
        <select id={id} className={selectClass} value={value} onChange={(e) => onChange(e.target.value)}>
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        <span
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-neutral-500"
          aria-hidden
        >
          ▾
        </span>
      </div>
    </div>
  );
}

function TextRow({
  id,
  label,
  value,
  placeholder,
  suffix,
  onChange,
  stackVertical,
}: {
  id: string;
  label: string;
  value: string;
  placeholder?: string;
  suffix?: string;
  onChange: (v: string) => void;
  stackVertical?: boolean;
}) {
  if (stackVertical) {
    return (
      <div className="flex flex-col gap-0.5">
        <label htmlFor={id} className={labelClassStackCompact}>
          {label}
        </label>
        <div className="relative min-w-0 w-full">
          <input
            id={id}
            type="text"
            autoComplete="off"
            spellCheck={false}
            className={suffix ? `${inputClassStackCompact} pr-10` : inputClassStackCompact}
            value={value}
            placeholder={placeholder}
            onChange={(e) => onChange(e.target.value)}
          />
          {suffix ? (
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-neutral-500">
              {suffix}
            </span>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col-reverse gap-1.5 sm:flex-row-reverse sm:items-start sm:justify-between sm:gap-4">
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <div className="relative min-w-0 flex-1">
        <input
          id={id}
          type="text"
          autoComplete="off"
          spellCheck={false}
          className={suffix ? `${inputClass} pr-14` : inputClass}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
        {suffix ? (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-500">{suffix}</span>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Rubrici pentru arhitectura vehiculului — select + câmpuri text manuale; controale stânga, etichete dreapta.
 * `fullWidth`: folosit în sidebar îngust (fără max-w-xl).
 */
export function VehicleArchitectureTable({ fullWidth }: { fullWidth?: boolean }) {
  const manual = useSuspensionAssistantStore((s) => s.vehicleArchitectureManual);
  const setManual = useSuspensionAssistantStore((s) => s.setVehicleArchitectureManual);

  const patch = (p: Partial<VehicleArchitectureManual>) => setManual(p);

  const shell = fullWidth
    ? "w-full max-w-none rounded-md border border-white/[0.08] bg-[#080c14]/60 p-2 shadow-inner"
    : "max-w-xl rounded-[0.4rem] border border-white/[0.08] bg-[#080c14]/60 p-4 shadow-inner sm:p-5";

  return (
    <div className={shell}>
      {fullWidth ? (
        <div className="w-full" style={SIDEBAR_VEHICLE_PANEL_ZOOM}>
          <h2 className="mb-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
            Vehicle architecture
          </h2>
          <div className="space-y-1.5">
            <SelectRow
              id="va-layout"
              label="Layout"
              value={pickOption(manual.layout, VEHICLE_ARCHITECTURE_LAYOUT_OPTIONS)}
              options={VEHICLE_ARCHITECTURE_LAYOUT_OPTIONS}
              onChange={(layout) => patch({ layout })}
              stackVertical={fullWidth}
            />
            <SelectRow
              id="va-drivetrain"
              label="Drivetrain"
              value={pickOption(manual.drivetrain, VEHICLE_ARCHITECTURE_DRIVETRAIN_OPTIONS)}
              options={VEHICLE_ARCHITECTURE_DRIVETRAIN_OPTIONS}
              onChange={(drivetrain) => patch({ drivetrain })}
              stackVertical={fullWidth}
            />
            <SelectRow
              id="va-engine-pos"
              label="Engine position"
              value={pickOption(manual.enginePosition, VEHICLE_ARCHITECTURE_ENGINE_POSITION_OPTIONS)}
              options={VEHICLE_ARCHITECTURE_ENGINE_POSITION_OPTIONS}
              onChange={(enginePosition) => patch({ enginePosition })}
              stackVertical={fullWidth}
            />
            <TextRow
              id="va-weight"
              label="Weight distribution"
              value={manual.weightDistribution}
              placeholder="ex. 52 / 48"
              onChange={(weightDistribution) => patch({ weightDistribution })}
              stackVertical={fullWidth}
            />
            <TextRow
              id="va-cg"
              label="CG height"
              value={manual.cgHeightMm}
              placeholder="520"
              suffix="mm"
              onChange={(cgHeightMm) => patch({ cgHeightMm })}
              stackVertical={fullWidth}
            />
          </div>
          <p
            className="mt-1.5 truncate text-[8px] leading-tight text-neutral-600"
            title="Valorile sunt editabile manual; nu înlocuiesc încă modelul cinematic din simulator — le legăm în pașii următori."
          >
            Manual — nu leagă încă simulatorul cinematic.
          </p>
        </div>
      ) : (
        <>
          <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-400">
            Vehicle architecture
          </h2>
          <div className="space-y-4">
            <SelectRow
              id="va-layout"
              label="Layout"
              value={pickOption(manual.layout, VEHICLE_ARCHITECTURE_LAYOUT_OPTIONS)}
              options={VEHICLE_ARCHITECTURE_LAYOUT_OPTIONS}
              onChange={(layout) => patch({ layout })}
              stackVertical={fullWidth}
            />
            <SelectRow
              id="va-drivetrain"
              label="Drivetrain"
              value={pickOption(manual.drivetrain, VEHICLE_ARCHITECTURE_DRIVETRAIN_OPTIONS)}
              options={VEHICLE_ARCHITECTURE_DRIVETRAIN_OPTIONS}
              onChange={(drivetrain) => patch({ drivetrain })}
              stackVertical={fullWidth}
            />
            <SelectRow
              id="va-engine-pos"
              label="Engine position"
              value={pickOption(manual.enginePosition, VEHICLE_ARCHITECTURE_ENGINE_POSITION_OPTIONS)}
              options={VEHICLE_ARCHITECTURE_ENGINE_POSITION_OPTIONS}
              onChange={(enginePosition) => patch({ enginePosition })}
              stackVertical={fullWidth}
            />
            <TextRow
              id="va-weight"
              label="Weight distribution"
              value={manual.weightDistribution}
              placeholder="ex. 52 / 48"
              onChange={(weightDistribution) => patch({ weightDistribution })}
              stackVertical={fullWidth}
            />
            <TextRow
              id="va-cg"
              label="CG height"
              value={manual.cgHeightMm}
              placeholder="520"
              suffix="mm"
              onChange={(cgHeightMm) => patch({ cgHeightMm })}
              stackVertical={fullWidth}
            />
          </div>
          <p className="mt-4 text-[10px] leading-snug text-neutral-600">
            Valorile sunt editabile manual; nu înlocuiesc încă modelul cinematic din simulator — le legăm în pașii următori.
          </p>
        </>
      )}
    </div>
  );
}
