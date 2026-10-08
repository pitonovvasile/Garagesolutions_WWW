import { useEffect } from "react";
import { getVehicle } from "../data/vehicles";
import { useGarageCars } from "../hooks/useGarageCars";
import { formatSavedCarLabel, guessVehicleTemplateId, type SavedGarageCar } from "../lib/garageStorage";
import { garageOemSuspensionFromCar } from "../lib/garageResolvedSuspension";
import { useSuspensionAssistantStore } from "../store/suspensionAssistantStore";
import { useSuspensionStore } from "../store/suspensionStore";
import { SaveSuspensionConfigurationButton } from "./SaveSuspensionConfigurationButton";
import { VehicleArchitectureTable } from "./VehicleArchitectureTable";
import { VehicleDimensionsMassTables } from "./VehicleDimensionsMassTables";

function formatPrimitive(v: unknown): string {
  if (v == null) return "—";
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return String(v);
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

function GarageCarFieldTable({ car }: { car: SavedGarageCar }) {
  const rows = Object.entries(car).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="overflow-x-auto rounded-lg border border-white/10">
      <table className="w-full border-collapse text-left text-[11px]">
        <thead>
          <tr className="border-b border-white/10 bg-black/40 text-[9px] uppercase tracking-wide text-neutral-500">
            <th className="px-2 py-1.5 font-medium">Câmp</th>
            <th className="px-2 py-1.5 font-medium">Valoare (garaj)</th>
          </tr>
        </thead>
        <tbody className="text-neutral-200">
          {rows.map(([key, val]) => (
            <tr key={key} className="border-b border-white/[0.06] last:border-0">
              <td className="px-2 py-1 font-mono text-[10px] text-cyan-200/85">{key}</td>
              <td className="max-w-[min(52vw,28rem)] px-2 py-1 break-words font-mono text-[10px] text-neutral-300">
                {formatPrimitive(val)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Fereastră la butonul „Vehicul”: aceleași tabele ca în sidebar (arhitectură, dimensiuni, masă) +
 * detalii rând garaj când există legătură.
 */
export function VehicleGarageDataModal() {
  const open = useSuspensionAssistantStore((s) => s.vehicleSubpageOpen);
  const setOpen = useSuspensionAssistantStore((s) => s.setVehicleSubpageOpen);

  const garageCars = useGarageCars();
  const garageCarIndex = useSuspensionStore((s) => s.garageCarIndex);
  const vehicleId = useSuspensionStore((s) => s.vehicleId);
  const axle = useSuspensionStore((s) => s.axle);

  const vehicle = getVehicle(vehicleId);
  const linked =
    garageCarIndex !== null && garageCarIndex >= 0 && garageCarIndex < garageCars.length
      ? garageCars[garageCarIndex]!
      : null;

  const oem = linked ? garageOemSuspensionFromCar(linked) : { front: "", rear: "" };
  const templateGuess = linked ? guessVehicleTemplateId(linked) : vehicleId;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  if (!open) return null;

  const titleId = "sd-vehicle-garage-modal-title";

  return (
    <div
      className="fixed inset-0 z-[85] flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={() => setOpen(false)}
    >
      <div
        className="flex max-h-[min(92dvh,900px)] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-white/15 bg-[#0b0f14] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-white/10 px-4 py-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-400/85">Vehicul</p>
            <h2 id={titleId} className="mt-0.5 text-base font-semibold text-white">
              Date mașină &amp; sesiune
            </h2>
            <p className="mt-1 text-[11px] leading-snug text-neutral-400">
              <span className="font-mono text-cyan-200/90">{vehicle.label}</span>
              <span className="text-neutral-600"> · </span>
              <span className="text-neutral-500">axă {axle}</span>
              <span className="text-neutral-600"> · </span>
              <span className="text-neutral-500">preset geometrie</span>{" "}
              <span className="font-mono text-neutral-300">{vehicleId}</span>
              {linked ? (
                <>
                  <span className="text-neutral-600"> · </span>
                  <span className="text-neutral-400">
                    Garaj: {formatSavedCarLabel(linked, garageCarIndex ?? 0)}
                  </span>
                </>
              ) : null}
            </p>
          </div>
        <div className="flex shrink-0 flex-wrap items-start justify-end gap-2">
          <div className="max-w-[14rem] sm:max-w-none">
            <SaveSuspensionConfigurationButton compact />
          </div>
          <button
            type="button"
            className="shrink-0 rounded-lg border border-white/15 bg-black/40 px-3 py-1.5 text-[11px] font-medium text-neutral-200 transition hover:border-cyan-500/40 hover:bg-white/[0.06]"
            onClick={() => setOpen(false)}
          >
            Închide
          </button>
        </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-3">
          <section className="mb-5 space-y-2">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-cyan-400/90">
              Date vehicul (manual)
            </h3>
            <p className="text-[10px] leading-relaxed text-neutral-500">
              Aceleași rubrici ca în panoul din stânga — aceeași sursă de date; orice modificare se reflectă imediat
              în sesiune.
            </p>
            <div className="flex flex-col gap-3">
              <VehicleArchitectureTable fullWidth />
              <VehicleDimensionsMassTables fullWidth section="dimensions" />
              <VehicleDimensionsMassTables fullWidth section="mass" />
            </div>
          </section>

          <section className="space-y-2 border-t border-white/10 pt-4">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-cyan-400/90">
              Mașina din garaj (salvare)
            </h3>
            {linked ? (
              <>
                <p className="text-[10px] leading-relaxed text-neutral-500">
                  Câmpuri din salvarea contului / garaj (aceeași sursă ca dropdown-ul „Garaj” din sidebar).
                </p>
                <GarageCarFieldTable car={linked} />
                <div className="grid gap-2 rounded-lg border border-white/10 bg-black/25 p-2 text-[10px] text-neutral-400 sm:grid-cols-2">
                  <p>
                    <span className="font-semibold text-neutral-300">OEM față (rezolvat):</span>{" "}
                    <span className="text-neutral-200">{oem.front || "—"}</span>
                  </p>
                  <p>
                    <span className="font-semibold text-neutral-300">OEM spate (rezolvat):</span>{" "}
                    <span className="text-neutral-200">{oem.rear || "—"}</span>
                  </p>
                  <p className="sm:col-span-2">
                    <span className="font-semibold text-neutral-300">Șablon geometrie ghicit:</span>{" "}
                    <span className="font-mono text-cyan-100/90">{templateGuess}</span>
                  </p>
                </div>
              </>
            ) : (
              <div className="rounded-lg border border-amber-500/25 bg-amber-500/10 p-3 text-[11px] leading-relaxed text-amber-50/95">
                <p className="font-medium text-amber-100/95">Nicio mașină din garaj selectată</p>
                <p className="mt-1 text-neutral-400">
                  Alege o intrare din dropdown-ul „Garaj” din sidebar sau salvează o mașină din magazin pe același
                  origin pentru a vedea aici rândul complet salvat.
                </p>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
