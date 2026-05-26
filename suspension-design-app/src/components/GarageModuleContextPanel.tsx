import { useMemo } from "react";
import { useGarageCars } from "../hooks/useGarageCars";
import {
  buildGarageModuleContextItems,
  garageModuleContextStatusLabel,
  type GarageModuleContextStatus,
} from "../lib/garageModuleContext";
import { useSuspensionStore } from "../store/suspensionStore";

function StatusIcon({ status }: { status: GarageModuleContextStatus }) {
  const connected = status === "connected";
  return (
    <span
      className={[
        "inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[8px] font-bold leading-none",
        connected
          ? "border-emerald-500/45 bg-emerald-500/10 text-emerald-400"
          : "border-amber-500/45 bg-amber-500/10 text-amber-400",
      ].join(" ")}
      aria-hidden
    >
      ✓
    </span>
  );
}

function StatusText({ status }: { status: GarageModuleContextStatus }) {
  const connected = status === "connected";
  return (
    <span
      className={[
        "shrink-0 text-[9px] font-semibold",
        connected ? "text-emerald-400" : "text-amber-400",
      ].join(" ")}
    >
      {garageModuleContextStatusLabel(status)}
    </span>
  );
}

/** Sidebar panel: cross-module connection status for the selected garage vehicle. */
export function GarageModuleContextPanel() {
  const garageCars = useGarageCars();
  const garageCarIndex = useSuspensionStore((s) => s.garageCarIndex);
  const linkedCar =
    garageCarIndex !== null && garageCarIndex >= 0 && garageCarIndex < garageCars.length
      ? garageCars[garageCarIndex]!
      : null;

  const items = useMemo(() => buildGarageModuleContextItems(Boolean(linkedCar)), [linkedCar]);

  return (
    <section className="flex min-w-0 shrink-0 flex-col overflow-visible rounded-md border border-white/10 bg-[#080c11]/95 shadow-inner">
      <h2 className="shrink-0 border-b border-white/[0.08] px-2 py-1.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-neutral-300">
        Module context
      </h2>
      <ul className="divide-y divide-white/[0.06]">
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-2 px-2 py-1.5">
            <StatusIcon status={item.status} />
            <span className="min-w-0 flex-1 text-[10px] font-medium text-neutral-200">{item.label}</span>
            <StatusText status={item.status} />
          </li>
        ))}
      </ul>
    </section>
  );
}
