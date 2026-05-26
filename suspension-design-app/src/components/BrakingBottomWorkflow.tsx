import { useState } from "react";

const footerLinkClass =
  "inline-flex items-center gap-0.5 text-[8px] font-semibold uppercase tracking-wide text-rose-400/90 transition hover:text-rose-300";

/** Footer compact pentru modul Braking — read-only implicit. */
export function BrakingBottomWorkflow() {
  const [collapsed, setCollapsed] = useState(true);

  const stats = [
    ["Front disc", "—"],
    ["Rear disc", "—"],
    ["Front caliper", "—"],
    ["Rear caliper", "—"],
    ["Fluid", "DOT 4"],
  ] as const;

  return (
    <footer className="shrink-0 border-t border-white/10 bg-[#070a10]/95">
      <div className="flex items-center justify-between gap-2 border-b border-white/[0.05] px-2 py-1">
        <p className="text-[8px] font-semibold uppercase tracking-[0.14em] text-rose-200/90">Braking setup</p>
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="inline-flex items-center gap-1 text-[8px] font-semibold uppercase tracking-wide text-neutral-500 transition hover:text-neutral-300"
          aria-expanded={!collapsed}
        >
          {collapsed ? "Expand panel" : "Collapse panel"}
          <span aria-hidden>{collapsed ? "▾" : "▴"}</span>
        </button>
      </div>

      {collapsed ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 px-2 py-1.5">
          {stats.map(([k, v]) => (
            <span key={k} className="inline-flex min-w-0 items-baseline gap-1">
              <span className="text-[7px] uppercase tracking-wide text-neutral-600">{k}</span>
              <span className="truncate text-[9px] font-medium text-rose-100/85">{v}</span>
            </span>
          ))}
          <span className={`${footerLinkClass} ml-auto cursor-default opacity-60`}>Editor coming soon</span>
        </div>
      ) : (
        <div className="max-h-[72px] overflow-y-auto px-2 py-1.5">
          <dl className="grid grid-cols-2 gap-x-3 gap-y-1 sm:grid-cols-5">
            {stats.map(([k, v]) => (
              <div key={k} className="min-w-0">
                <dt className="text-[7px] uppercase tracking-wide text-neutral-500">{k}</dt>
                <dd className="truncate text-[9px] font-medium text-rose-100/90">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-1.5 text-[8px] text-neutral-500">
            Brake baseline from garage vehicle — full editor in a future update.
          </p>
        </div>
      )}
    </footer>
  );
}
