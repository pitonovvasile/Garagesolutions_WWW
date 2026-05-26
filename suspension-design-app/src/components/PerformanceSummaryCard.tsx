import type { ReactNode } from "react";

function SummaryRow({ label, value, compact }: { label: string; value: string; compact?: boolean }) {
  return (
    <div
      className={[
        "border-b border-white/[0.06] px-2 last:border-b-0",
        compact ? "flex flex-col gap-0.5 py-1" : "flex items-baseline justify-between gap-3 px-3 py-2",
      ].join(" ")}
    >
      <span className={compact ? "text-[8px] font-semibold uppercase tracking-wide text-neutral-500" : "shrink-0 text-[10px] font-medium text-neutral-200"}>
        {label}
      </span>
      <span
        className={[
          "font-semibold tabular-nums text-white",
          compact ? "text-[9px] leading-snug break-words" : "min-w-0 text-right text-[10px]",
        ].join(" ")}
      >
        {value}
      </span>
    </div>
  );
}

export function PerformanceSummaryCard({
  title,
  children,
  actionLabel,
  onAction,
  compact = false,
}: {
  title: string;
  children: ReactNode;
  actionLabel: string;
  onAction: () => void;
  compact?: boolean;
}) {
  return (
    <section className="flex min-w-0 shrink-0 flex-col overflow-visible rounded-md border border-white/10 bg-[#080c11]/95 shadow-inner">
      <h2
        className={[
          "shrink-0 border-b border-white/[0.08] font-semibold uppercase tracking-[0.14em] text-cyan-400/90",
          compact ? "px-2 py-1.5 text-[9px]" : "px-3 py-2 text-[10px]",
        ].join(" ")}
      >
        {title}
      </h2>
      <div className="shrink-0">{children}</div>
      <button
        type="button"
        onClick={onAction}
        className={[
          "mx-2 mb-2 mt-1 w-[calc(100%-1rem)] shrink-0 rounded-md border border-cyan-500/35 bg-cyan-500/10 font-semibold uppercase tracking-[0.12em] text-cyan-100 transition hover:bg-cyan-500/20",
          compact ? "py-1.5 text-[8px]" : "py-2 text-[9px]",
        ].join(" ")}
      >
        {actionLabel}
      </button>
    </section>
  );
}

export function PerformanceSummaryCardRows({
  rows,
  compact,
}: {
  rows: { label: string; value: string }[];
  compact?: boolean;
}) {
  return (
    <>
      {rows.map((row) => (
        <SummaryRow key={row.label} label={row.label} value={row.value} compact={compact} />
      ))}
    </>
  );
}
