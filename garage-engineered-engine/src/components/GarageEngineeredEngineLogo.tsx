/** Generic shell identity for the Garage Solutions engineering modules. */
import garageEngineeredEngineMark from "../../../assets/garage-solutions-logo.png";

type Variant = "full" | "compact" | "sidebar" | "corner";

const markGradientOverlay = {
  background:
    "linear-gradient(135deg, rgba(34,211,238,0.15) 0%, transparent 45%, rgba(129,140,248,0.12) 100%)",
} as const;

/**
 * Wordmark + mark for Garage Solutions Engineered Engine, the shared garage module shell.
 */
export function GarageEngineeredEngineLogo({ variant = "full" }: { variant?: Variant }) {
  const compact = variant === "compact";

  if (variant === "corner") {
    return (
      <div className="flex items-center gap-1.5" aria-label="Garage Solutions Engineered Engine">
        <div className="relative h-7 w-7 shrink-0 overflow-hidden rounded-md border border-cyan-500/30 bg-[#0c1219] shadow-[0_0_14px_rgba(34,211,238,0.07)] sm:h-8 sm:w-8">
          <img
            src={garageEngineeredEngineMark}
            alt=""
            className="h-full w-full object-contain p-0.5"
            draggable={false}
          />
          <div
            className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-25"
            style={markGradientOverlay}
          />
        </div>
        <div className="hidden min-w-0 leading-tight sm:block">
          <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-neutral-100">Garage</p>
          <p className="text-[8px] font-medium uppercase tracking-[0.12em] text-cyan-400/78">Engine</p>
        </div>
      </div>
    );
  }

  if (variant === "sidebar") {
    return (
      <div
        className="relative w-full overflow-hidden rounded-xl border border-cyan-500/30 bg-[#0a0e14] p-3 text-center shadow-[0_0_28px_rgba(34,211,238,0.08)]"
        aria-label="Garage Solutions Engineered Engine"
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            background:
              "linear-gradient(145deg, rgba(34,211,238,0.12) 0%, transparent 42%, rgba(129,140,248,0.1) 100%)",
          }}
        />
        <div className="relative flex min-h-[7.5rem] items-center justify-center px-1 py-2">
          <img
            src={garageEngineeredEngineMark}
            alt=""
            className="h-auto max-h-[9.25rem] w-auto max-w-[min(100%,10.5rem)] object-contain object-center"
            draggable={false}
          />
        </div>
        <div className="relative mt-2 border-t border-white/10 pt-2">
          <p className="text-[10px] font-semibold uppercase leading-snug tracking-[0.12em] text-neutral-100">
            Garage Solutions
            <br />
            <span className="text-neutral-300/95">Engineered Engine</span>
          </p>
          <p className="mt-0.5 text-[9px] font-medium uppercase tracking-[0.14em] text-cyan-400/78">
            Module Workspace
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={
        compact
          ? "flex min-w-0 shrink-0 items-center gap-2.5"
          : "flex flex-col items-center gap-3 text-center"
      }
      aria-label="Garage Solutions Engineered Engine"
    >
      <div
        className={
          compact
            ? "relative h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-cyan-500/25 bg-[#0c1219] shadow-[0_0_20px_rgba(34,211,238,0.08)]"
            : "relative h-16 w-16 overflow-hidden rounded-2xl border border-cyan-500/30 bg-[#0c1219] shadow-[0_0_28px_rgba(34,211,238,0.12)]"
        }
      >
        <img
          src={garageEngineeredEngineMark}
          alt=""
          className={
            compact ? "h-full w-full object-contain p-0.5" : "h-full w-full object-contain p-1"
          }
          draggable={false}
        />
        <div className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-25" style={markGradientOverlay} />
      </div>
      <div className={compact ? "min-w-0 text-left" : ""}>
        <p
          className={
            compact
              ? "truncate text-[10px] font-semibold uppercase leading-tight tracking-[0.14em] text-neutral-100"
              : "text-lg font-semibold uppercase tracking-[0.2em] text-neutral-50 sm:text-xl"
          }
        >
          Garage Solutions
        </p>
        <p
          className={
            compact
              ? "truncate text-[9px] font-medium uppercase tracking-[0.12em] text-cyan-500/75"
              : "text-[11px] font-medium uppercase tracking-[0.18em] text-cyan-400/80"
          }
        >
          Engineered Engine
        </p>
      </div>
    </div>
  );
}
