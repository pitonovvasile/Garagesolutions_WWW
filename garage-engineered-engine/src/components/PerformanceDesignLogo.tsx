import performanceMark from "../../../assets/garage-performance-icon.png";

type Variant = "full" | "compact" | "corner";

const markGradientOverlay = {
  background:
    "linear-gradient(135deg, rgba(245,158,11,0.18) 0%, transparent 45%, rgba(234,88,12,0.14) 100%)",
} as const;

export function PerformanceDesignLogo({ variant = "full" }: { variant?: Variant }) {
  const compact = variant === "compact";

  if (variant === "corner") {
    return (
      <div className="flex items-center gap-1.5" aria-label="Dinamics & Performance">
        <div className="relative h-7 w-7 shrink-0 overflow-hidden rounded-md border border-amber-500/30 bg-[#0c1219] shadow-[0_0_14px_rgba(245,158,11,0.08)] sm:h-8 sm:w-8">
          <img
            src={performanceMark}
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
          <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-neutral-100">Dinamics</p>
          <p className="text-[8px] font-medium uppercase tracking-[0.12em] text-amber-400/80">&amp; Performance</p>
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
      aria-label="Dinamics & Performance"
    >
      <div
        className={
          compact
            ? "relative h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-amber-500/25 bg-[#0c1219] shadow-[0_0_20px_rgba(245,158,11,0.08)]"
            : "relative h-16 w-16 overflow-hidden rounded-2xl border border-amber-500/30 bg-[#0c1219] shadow-[0_0_28px_rgba(245,158,11,0.12)]"
        }
      >
        <img
          src={performanceMark}
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
          Dinamics &amp; Performance
        </p>
        <p
          className={
            compact
              ? "truncate text-[9px] font-medium uppercase tracking-[0.12em] text-amber-500/75"
              : "text-[11px] font-medium uppercase tracking-[0.18em] text-amber-400/80"
          }
        >
          Garage Solutions
        </p>
      </div>
    </div>
  );
}
