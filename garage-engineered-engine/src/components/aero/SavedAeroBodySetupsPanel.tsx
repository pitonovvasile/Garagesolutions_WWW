import { useCallback, useEffect, useState } from "react";
import { aeroBodyComponentCounts } from "../../data/aeroBodyComponents";
import {
  AERO_BODY_SETUPS_UPDATED_EVENT,
  kindLabel,
  readSavedAeroBodySetupsForVehicle,
  type SavedAeroBodySetup,
} from "../../lib/aeroBodySetupPersistence";
import { useAeroBodyPlannerStore } from "../../store/aeroBodyPlannerStore";
import { useSuspensionStore } from "../../store/suspensionStore";

function formatWhen(ts: number): string {
  return new Date(ts).toLocaleString("ro-RO", { dateStyle: "medium", timeStyle: "short" });
}

export function SavedAeroBodySetupsPanel() {
  const vehicleTemplateId = useSuspensionStore((s) => s.vehicleId);
  const garageCarIndex = useSuspensionStore((s) => s.garageCarIndex);
  const loadSetup = useAeroBodyPlannerStore((s) => s.loadSetup);
  const removeSavedSetup = useAeroBodyPlannerStore((s) => s.removeSavedSetup);
  const [flash, setFlash] = useState<string | null>(null);
  const [list, setList] = useState<SavedAeroBodySetup[]>(() =>
    readSavedAeroBodySetupsForVehicle(vehicleTemplateId, garageCarIndex),
  );

  const refresh = useCallback(() => {
    setList(readSavedAeroBodySetupsForVehicle(vehicleTemplateId, garageCarIndex));
  }, [vehicleTemplateId, garageCarIndex]);

  useEffect(() => {
    refresh();
    const on = () => refresh();
    window.addEventListener(AERO_BODY_SETUPS_UPDATED_EVENT, on);
    return () => window.removeEventListener(AERO_BODY_SETUPS_UPDATED_EVENT, on);
  }, [refresh]);

  const onLoad = (id: string) => {
    if (loadSetup(id)) {
      setFlash("Setup loaded into planner.");
      window.setTimeout(() => setFlash(null), 2800);
    }
  };

  const onDelete = (id: string) => {
    removeSavedSetup(id);
    refresh();
  };

  if (!list.length) {
    return (
      <div className="rounded-lg border border-white/10 bg-black/20 p-4">
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-neutral-200">Saved setups</h3>
        <p className="mt-2 text-[10px] leading-relaxed text-neutral-500">
          No saved body configurations for this vehicle yet. Use{" "}
          <span className="text-cyan-300/90">Save setup</span> on Current Body Setup, Upgrade Planner, or the footer
          Aero summary.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {flash ? <p className="text-[10px] text-emerald-300/90">{flash}</p> : null}
      <ul className="space-y-1.5">
        {list.map((row) => {
          const counts = aeroBodyComponentCounts(row.components);
          return (
            <li
              key={row.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-black/25 px-2.5 py-2"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] font-semibold text-neutral-100">{row.label}</p>
                <p className="mt-0.5 text-[9px] text-neutral-500">
                  <span className="text-cyan-300/80">{kindLabel(row.kind)}</span>
                  <span className="mx-1 text-neutral-700">·</span>
                  {formatWhen(row.updatedAt)}
                </p>
                <p className="mt-0.5 text-[9px] text-neutral-500">
                  On car {counts.installed}/{counts.total}
                  <span className="mx-1 text-neutral-700">·</span>
                  Planned {counts.planned}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  onClick={() => onLoad(row.id)}
                  className="rounded-md border border-cyan-500/35 bg-cyan-500/10 px-2 py-1 text-[8px] font-semibold uppercase tracking-wide text-cyan-100 hover:bg-cyan-500/20"
                >
                  Load
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(row.id)}
                  className="rounded-md border border-white/10 px-2 py-1 text-[8px] font-semibold uppercase tracking-wide text-neutral-400 hover:bg-white/[0.04] hover:text-red-300/90"
                >
                  Delete
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
