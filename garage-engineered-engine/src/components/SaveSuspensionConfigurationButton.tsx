import { useEffect, useState } from "react";
import {
  collectSavedSuspensionConfiguration,
  readSavedSuspensionConfiguration,
  SUSPENSION_CONFIG_SAVED_EVENT,
  writeSavedSuspensionConfiguration,
} from "../lib/suspensionManualConfigPersistence";
import { useSuspensionStore } from "../store/suspensionStore";

type Props = {
  /** Stil mai mic pentru sidebar / spații înguste. */
  compact?: boolean;
};

/**
 * Salvează rubricile manuale + resort/amortizor din sesiune în localStorage, per vehicul + index garaj,
 * pentru hidratare ulterioară și pentru motorul de calcule (același Zustand).
 */
export function SaveSuspensionConfigurationButton({ compact }: Props) {
  const vehicleId = useSuspensionStore((s) => s.vehicleId);
  const garageCarIndex = useSuspensionStore((s) => s.garageCarIndex);
  const [flash, setFlash] = useState<string | null>(null);
  const [, bump] = useState(0);

  useEffect(() => {
    const on = () => bump((x) => x + 1);
    window.addEventListener(SUSPENSION_CONFIG_SAVED_EVENT, on);
    return () => window.removeEventListener(SUSPENSION_CONFIG_SAVED_EVENT, on);
  }, []);

  const hasSaved =
    typeof window !== "undefined" &&
    readSavedSuspensionConfiguration(vehicleId, garageCarIndex) != null;

  const onSave = () => {
    const payload = collectSavedSuspensionConfiguration();
    writeSavedSuspensionConfiguration(payload);
    setFlash("Salvat local — se reaplică automat la aceeași mașină / șablon.");
    window.setTimeout(() => setFlash(null), 3200);
  };

  return (
    <div className={compact ? "flex flex-col gap-1" : "flex flex-col gap-1.5"}>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onSave}
          className={[
            "rounded-lg border border-cyan-500/40 bg-cyan-500/15 font-semibold uppercase tracking-wide text-cyan-100 transition hover:bg-cyan-500/25",
            compact ? "px-2 py-1.5 text-[9px]" : "px-3 py-2 text-[10px]",
          ].join(" ")}
          title="Save configuration — stores vehicle rubrics, footer drivetrain/tires/aero, and spring/damper session values in this browser (localStorage)."
        >
          Salvează configurația
        </button>
        {hasSaved ? (
          <span className="text-[9px] text-neutral-500">
            Există salvare pentru acest șablon{garageCarIndex != null ? " + garaj" : ""}.
          </span>
        ) : (
          <span className="text-[9px] text-neutral-500">Nicio salvare încă pentru această combinație.</span>
        )}
      </div>
      {flash ? <p className="text-[10px] leading-snug text-emerald-200/90">{flash}</p> : null}
    </div>
  );
}
