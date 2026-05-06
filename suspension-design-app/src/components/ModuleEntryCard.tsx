import { useId } from "react";
import { DEFAULT_VEHICLE_ID } from "../data/vehicles";
import { useSuspensionStore } from "../store/suspensionStore";

/** Icon-only engineered launcher: grid + laser + double wishbone strokes. */
export function ModuleEntryCard({ compact }: { compact?: boolean }) {
  const setOpen = useSuspensionStore((s) => s.setModuleOpen);
  const reset = useSuspensionStore((s) => s.resetSessionToVehicle);
  const rid = useId().replace(/:/g, "");
  const gid = `sd-grad-${rid}`;

  const svg = (
    <svg
      viewBox="0 0 120 100"
      className={compact ? "h-12 w-full" : "h-28 w-full"}
      fill="none"
      aria-hidden
    >
      <path
        d="M20 78 L48 32 L86 32 L98 78"
        stroke={`url(#${gid})`}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M20 78 L98 78" stroke="rgba(148,163,184,0.35)" strokeWidth="1.2" />
      <path d="M48 32 L62 70" stroke="#60a5fa" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M86 32 L62 70" stroke="#4ade80" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="62" cy="70" r="5" fill="#a78bfa" opacity="0.95" />
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#22d3ee" stopOpacity="0.9" />
          <stop offset="1" stopColor="#818cf8" stopOpacity="0.9" />
        </linearGradient>
      </defs>
    </svg>
  );

  return (
    <button
      type="button"
      onClick={() => {
        if (compact) {
          reset(undefined);
        } else {
          reset(DEFAULT_VEHICLE_ID);
          setOpen(true);
          try {
            window.location.hash = "work";
          } catch {
            /* ignore */
          }
        }
      }}
      className={`group relative overflow-hidden text-left transition ${
        compact
          ? "w-full rounded-xl border border-cyan-500/25 bg-transparent p-2 hover:border-cyan-400/45"
          : "w-full max-w-sm rounded-2xl border border-cyan-500/30 bg-transparent p-6 shadow-glow hover:border-cyan-400/55"
      }`}
      aria-label={
        compact ? "Reset geometry (current vehicle)" : "Open workspace — BMW E46 baseline"
      }
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(34,211,238,0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(34,211,238,0.1) 1px, transparent 1px)",
          backgroundSize: "14px 14px",
        }}
      />
      <div className="pointer-events-none absolute -left-1/2 top-6 h-px w-[200%] rotate-[-8deg] bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent opacity-60 blur-[0.5px]" />
      <div className="pointer-events-none absolute left-8 top-1/2 h-px w-32 bg-gradient-to-r from-fuchsia-500/40 to-transparent opacity-70" />

      <div className="relative flex items-center justify-center py-2">{svg}</div>
    </button>
  );
}
