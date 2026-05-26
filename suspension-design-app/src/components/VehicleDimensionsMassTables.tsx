import type { VehicleDimensionsManual, VehicleMassManual } from "../data/vehicleDimensionsMassManual";
import { SIDEBAR_VEHICLE_PANEL_ZOOM } from "../lib/sidebarVehiclePanelZoom";
import { useSuspensionAssistantStore } from "../store/suspensionAssistantStore";

const panelClassWide =
  "w-full max-w-none rounded-md border border-white/[0.08] bg-[#080c14]/60 p-2 shadow-inner";

const panelClass =
  "max-w-xl rounded-[0.4rem] border border-white/[0.08] bg-[#080c14]/60 p-4 shadow-inner sm:p-5";

const titleClass = "mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-200";

const titleClassWide = "mb-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-neutral-200";

const rowClass =
  "flex flex-row-reverse min-h-[2.25rem] items-baseline justify-between gap-3 border-b border-white/[0.06] py-2 last:border-b-0";

const rowClassStackCompact =
  "flex flex-col gap-0.5 border-b border-white/[0.06] py-1 last:border-b-0";

const labelClass = "shrink-0 text-[11px] font-medium uppercase tracking-wide text-neutral-500 sm:text-right";

const labelClassStackCompact =
  "text-[8px] font-semibold uppercase tracking-[0.1em] text-neutral-500 leading-tight";

const valueInputClass =
  "min-w-[3rem] max-w-[7rem] rounded-[0.35rem] border border-white/10 bg-[#0b0f14] px-2 py-1 text-left text-sm font-semibold text-white shadow-inner outline-none transition focus:border-cyan-400/45 focus:ring-1 focus:ring-cyan-400/25";

const valueInputClassStackCompact =
  "w-full min-w-0 max-w-full rounded-md border border-white/10 bg-[#0b0f14] px-1.5 py-1 text-left text-xs font-semibold tabular-nums text-white shadow-inner outline-none transition focus:border-cyan-400/45 focus:ring-1 focus:ring-cyan-400/25";

const unitClass = "shrink-0 text-xs font-medium text-neutral-400";

const unitClassCompact = "shrink-0 text-[10px] font-medium text-neutral-400";

function MetricRow({
  id,
  label,
  value,
  unit,
  onChange,
  stackVertical,
}: {
  id: string;
  label: string;
  value: string;
  unit: string;
  onChange: (v: string) => void;
  stackVertical?: boolean;
}) {
  if (stackVertical) {
    return (
      <div className={rowClassStackCompact}>
        <label htmlFor={id} className={labelClassStackCompact}>
          {label}
        </label>
        <div className="flex min-w-0 w-full items-baseline gap-1.5">
          <input
            id={id}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            spellCheck={false}
            className={`${valueInputClassStackCompact} flex-1`}
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
          <span className={unitClassCompact}>{unit}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={rowClass}>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <div className="flex min-w-0 max-w-[55%] items-baseline justify-start gap-1.5 sm:max-w-[50%]">
        <input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          spellCheck={false}
          className={valueInputClass}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <span className={unitClass}>{unit}</span>
      </div>
    </div>
  );
}

/**
 * Rubrici manuale: dimensiuni (mm) și mase (kg / L); controale stânga, etichete dreapta.
 * `fullWidth`: layout în sidebar îngust.
 * `section`: afișează doar dimensiuni sau doar masă (stack vertical în sidebar).
 */
export function VehicleDimensionsMassTables({
  fullWidth,
  section = "both",
}: {
  fullWidth?: boolean;
  section?: "both" | "dimensions" | "mass";
}) {
  const dimensions = useSuspensionAssistantStore((s) => s.vehicleDimensionsManual);
  const setDimensions = useSuspensionAssistantStore((s) => s.setVehicleDimensionsManual);
  const mass = useSuspensionAssistantStore((s) => s.vehicleMassManual);
  const setMass = useSuspensionAssistantStore((s) => s.setVehicleMassManual);

  const patchD = (p: Partial<VehicleDimensionsManual>) => setDimensions(p);
  const patchM = (p: Partial<VehicleMassManual>) => setMass(p);

  const shell = fullWidth ? panelClassWide : panelClass;

  return (
    <>
      {section === "mass" ? null : (
      <div className={shell}>
        <div
          className="w-full"
          style={fullWidth ? SIDEBAR_VEHICLE_PANEL_ZOOM : undefined}
        >
        <h2 className={fullWidth ? titleClassWide : titleClass}>
          Dimensions
        </h2>
        <div>
          <MetricRow
            id="vd-wheelbase"
            label="Wheelbase"
            value={dimensions.wheelbaseMm}
            unit="mm"
            onChange={(wheelbaseMm) => patchD({ wheelbaseMm })}
            stackVertical={fullWidth}
          />
          <MetricRow
            id="vd-front-track"
            label="Front track"
            value={dimensions.frontTrackMm}
            unit="mm"
            onChange={(frontTrackMm) => patchD({ frontTrackMm })}
            stackVertical={fullWidth}
          />
          <MetricRow
            id="vd-rear-track"
            label="Rear track"
            value={dimensions.rearTrackMm}
            unit="mm"
            onChange={(rearTrackMm) => patchD({ rearTrackMm })}
            stackVertical={fullWidth}
          />
          <MetricRow
            id="vd-width"
            label="Vehicle width"
            value={dimensions.vehicleWidthMm}
            unit="mm"
            onChange={(vehicleWidthMm) => patchD({ vehicleWidthMm })}
            stackVertical={fullWidth}
          />
          <MetricRow
            id="vd-length"
            label="Vehicle length"
            value={dimensions.vehicleLengthMm}
            unit="mm"
            onChange={(vehicleLengthMm) => patchD({ vehicleLengthMm })}
            stackVertical={fullWidth}
          />
        </div>
        </div>
      </div>
      )}

      {section === "dimensions" ? null : (
      <div className={shell}>
        <div
          className="w-full"
          style={fullWidth ? SIDEBAR_VEHICLE_PANEL_ZOOM : undefined}
        >
        <h2 className={fullWidth ? titleClassWide : titleClass}>
          Mass
        </h2>
        <div>
          <MetricRow
            id="vm-curb"
            label="Curb weight"
            value={mass.curbWeightKg}
            unit="kg"
            onChange={(curbWeightKg) => patchM({ curbWeightKg })}
            stackVertical={fullWidth}
          />
          {fullWidth ? (
            <div className={rowClassStackCompact}>
              <span className={labelClassStackCompact}>Fuel</span>
              <div className="flex min-w-0 w-full flex-wrap items-center gap-x-1 gap-y-0.5">
                <input
                  id="vm-fuel-l"
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  spellCheck={false}
                  aria-label="Fuel volume (liters)"
                  className={`${valueInputClassStackCompact} w-[3.25rem] shrink-0`}
                  value={mass.fuelLiters}
                  onChange={(e) => patchM({ fuelLiters: e.target.value })}
                />
                <span className={unitClassCompact}>L</span>
                <span className="text-[9px] text-neutral-600">(</span>
                <input
                  id="vm-fuel-kg"
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  spellCheck={false}
                  aria-label="Fuel mass (kg)"
                  className={`${valueInputClassStackCompact} w-[3.25rem] shrink-0`}
                  value={mass.fuelMassKg}
                  onChange={(e) => patchM({ fuelMassKg: e.target.value })}
                />
                <span className={unitClassCompact}>kg</span>
                <span className="text-[9px] text-neutral-600">)</span>
              </div>
            </div>
          ) : (
            <div className={rowClass}>
              <span className={labelClass}>Fuel</span>
              <div className="flex min-w-0 max-w-[65%] flex-wrap items-baseline justify-start gap-x-1 gap-y-0.5 sm:max-w-[58%]">
                <input
                  id="vm-fuel-l"
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  spellCheck={false}
                  aria-label="Fuel volume (liters)"
                  className={`${valueInputClass} max-w-[4rem]`}
                  value={mass.fuelLiters}
                  onChange={(e) => patchM({ fuelLiters: e.target.value })}
                />
                <span className={unitClass}>L</span>
                <span className="text-[11px] text-neutral-600">(</span>
                <input
                  id="vm-fuel-kg"
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  spellCheck={false}
                  aria-label="Fuel mass (kg)"
                  className={`${valueInputClass} max-w-[4rem]`}
                  value={mass.fuelMassKg}
                  onChange={(e) => patchM({ fuelMassKg: e.target.value })}
                />
                <span className={unitClass}>kg</span>
                <span className="text-[11px] text-neutral-600">)</span>
              </div>
            </div>
          )}
          <MetricRow
            id="vm-total"
            label="Total weight"
            value={mass.totalWeightKg}
            unit="kg"
            onChange={(totalWeightKg) => patchM({ totalWeightKg })}
            stackVertical={fullWidth}
          />
          <MetricRow
            id="vm-unsprung"
            label="Unsprung mass (F/R)"
            value={mass.unsprungMassFrKg}
            unit="kg"
            onChange={(unsprungMassFrKg) => patchM({ unsprungMassFrKg })}
            stackVertical={fullWidth}
          />
        </div>
        <button
          type="button"
          className={
            fullWidth
              ? "mt-1.5 w-full py-0.5 text-left text-[9px] font-semibold uppercase tracking-[0.1em] text-cyan-400/90 transition hover:text-cyan-300"
              : "mt-3 w-full text-right text-[11px] font-semibold uppercase tracking-[0.12em] text-cyan-400/90 transition hover:text-cyan-300"
          }
          onClick={() => {
            /* Corner weight UI — legare viitoare (balans cântar). */
          }}
        >
          Corner weight setup →
        </button>
        {fullWidth ? (
          <p
            className="mt-1 truncate text-[8px] leading-tight text-neutral-600"
            title="Dimensiuni și mase sunt manuale; nu alimentează încă simulatorul cinematic."
          >
            Manuale — nu alimentează încă simulatorul.
          </p>
        ) : (
          <p className="mt-3 text-[10px] leading-snug text-neutral-600">
            Dimensiuni și mase sunt manuale; nu alimentează încă simulatorul cinematic.
          </p>
        )}
        </div>
      </div>
      )}
    </>
  );
}
