import { useEffect } from "react";
import { useGarageCars } from "../hooks/useGarageCars";
import { usePerformanceOeBaseline } from "../hooks/usePerformanceOeBaseline";
import { usePerformanceStore } from "../store/performanceStore";
import { useSuspensionStore } from "../store/suspensionStore";
import { PerformanceSummaryCardRows } from "./PerformanceSummaryCard";

export function PerformanceOeSpecsModal() {
  const open = usePerformanceStore((s) => s.oeSpecsModalOpen);
  const setOpen = usePerformanceStore((s) => s.setOeSpecsModalOpen);

  const garageCars = useGarageCars();
  const garageCarIndex = useSuspensionStore((s) => s.garageCarIndex);
  const linkedCar =
    garageCarIndex !== null && garageCarIndex >= 0 && garageCarIndex < garageCars.length
      ? garageCars[garageCarIndex]!
      : null;

  const { baseline, loading } = usePerformanceOeBaseline(linkedCar);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  if (!open) return null;

  const rows = [
    { label: "Power", value: loading ? "…" : baseline.power },
    { label: "Torque", value: loading ? "…" : baseline.torque },
    { label: "0-100 km/h", value: loading ? "…" : baseline.zeroTo100 },
    { label: "Drivetrain Loss", value: loading ? "…" : baseline.drivetrainLoss },
    { label: "Fuel", value: loading ? "…" : baseline.fuel },
    { label: "Compression Ratio", value: loading ? "…" : baseline.compressionRatio },
    { label: "Max RPM", value: loading ? "…" : baseline.redline },
  ];

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="perf-oe-specs-title"
      onClick={() => setOpen(false)}
    >
      <div
        className="max-h-[min(88vh,640px)] w-full max-w-md overflow-hidden rounded-xl border border-white/10 bg-[#0b0f14] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <h2 id="perf-oe-specs-title" className="text-sm font-semibold uppercase tracking-[0.12em] text-cyan-300">
            OE specifications
          </h2>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-md border border-white/10 px-2 py-1 text-xs text-neutral-400 hover:bg-white/5 hover:text-white"
          >
            Închide
          </button>
        </div>
        <div className="overflow-y-auto p-1">
          <PerformanceSummaryCardRows rows={rows} />
        </div>
      </div>
    </div>
  );
}
