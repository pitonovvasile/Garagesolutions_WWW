import { useEffect, useMemo, useState } from "react";
import { readSavedSetups, type SavedSuspensionSetup } from "../lib/siteCart";
import { useSuspensionAssistantStore } from "../store/suspensionAssistantStore";

function fieldDiff(a: SavedSuspensionSetup, b: SavedSuspensionSetup): string[] {
  const keys: (keyof SavedSuspensionSetup)[] = [
    "vehicleId",
    "axle",
    "goal",
    "springRateNmm",
    "springStrokeMm",
    "damperStrokeMm",
    "damperLinearDampingCoeff",
    "damperDigressive",
    "plateRangeDeg",
    "travelMm",
  ];
  const out: string[] = [];
  for (const k of keys) {
    if (a[k] !== b[k]) out.push(`${String(k)}: ${String(a[k])} vs ${String(b[k])}`);
  }
  return out;
}

export function CompareSetupsModal() {
  const open = useSuspensionAssistantStore((s) => s.compareOpen);
  const setOpen = useSuspensionAssistantStore((s) => s.setCompareOpen);
  const [list, setList] = useState<SavedSuspensionSetup[]>(() => readSavedSetups());
  const [a, setA] = useState("");
  const [b, setB] = useState("");

  useEffect(() => {
    if (!open) return;
    const on = () => setList(readSavedSetups());
    window.addEventListener("garage-setups-updated", on);
    setList(readSavedSetups());
    return () => window.removeEventListener("garage-setups-updated", on);
  }, [open]);

  const byId = useMemo(() => Object.fromEntries(list.map((s) => [s.id, s])), [list]);
  const diff = a && b && byId[a] && byId[b] ? fieldDiff(byId[a]!, byId[b]!) : [];

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="compare-setups-title"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-lg rounded-xl border border-white/15 bg-[#0b0f14] p-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="compare-setups-title" className="mb-3 text-sm font-semibold text-white">
          Compare saved setups
        </h2>
        {list.length < 2 ? (
          <p className="text-xs text-neutral-400">Save at least two setups from the bottom bar first.</p>
        ) : (
          <>
            <div className="mb-3 grid grid-cols-2 gap-2">
              <label className="text-[11px] text-neutral-500">
                Setup A
                <select
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-2 py-2 text-xs text-white"
                  value={a}
                  onChange={(e) => setA(e.target.value)}
                >
                  <option value="">—</option>
                  {list.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-[11px] text-neutral-500">
                Setup B
                <select
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-2 py-2 text-xs text-white"
                  value={b}
                  onChange={(e) => setB(e.target.value)}
                >
                  <option value="">—</option>
                  {list.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="max-h-48 overflow-y-auto rounded-lg border border-white/10 bg-black/30 p-2 text-xs text-neutral-300">
              {diff.length === 0 ? (
                <span className="text-neutral-500">Pick two different setups to see field differences.</span>
              ) : (
                <ul className="list-inside list-disc space-y-1">
                  {diff.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
        <button
          type="button"
          className="mt-4 w-full rounded-lg border border-white/10 py-2 text-xs text-neutral-300 hover:bg-white/5"
          onClick={() => setOpen(false)}
        >
          Close
        </button>
      </div>
    </div>
  );
}
