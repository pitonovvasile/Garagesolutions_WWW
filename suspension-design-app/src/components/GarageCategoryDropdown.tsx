import { useEffect, useId, useRef, useState } from "react";
import {
  ACCENT_BG,
  ACCENT_RING,
  ACCENT_TEXT,
  buildGarageCategoryUrl,
  buildGarageHubUrl,
  GARAGE_CATEGORIES,
  getGarageCategoryById,
  type GarageCategoryId,
} from "../lib/garageCategoryNav";
import { parseGarageCarQueryParam } from "../lib/garageStorage";
import { useSuspensionStore } from "../store/suspensionStore";

const ACCENT_CHEVRON: Record<(typeof GARAGE_CATEGORIES)[number]["accent"], string> = {
  cyan: "text-cyan-400/90",
  amber: "text-amber-400/90",
  rose: "text-rose-400/90",
  violet: "text-violet-400/90",
  orange: "text-orange-400/90",
};

export function GarageCategoryDropdown({ activeId }: { activeId: GarageCategoryId }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const garageCarIndex = useSuspensionStore((s) => s.garageCarIndex);
  const carIndex = garageCarIndex ?? parseGarageCarQueryParam();

  const active = getGarageCategoryById(activeId);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function navigate(href: string) {
    setOpen(false);
    window.location.assign(href);
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={`Schimbă categoria din garaj — ${active.label}`}
        title="Schimbă categoria din garaj"
        onClick={() => setOpen((v) => !v)}
        className={[
          "flex cursor-pointer items-center gap-1.5 rounded-[14px] border border-dashed bg-[#0c1219] px-1.5 py-1 shadow-[0_0_14px_rgba(245,158,11,0.06)] transition",
          "hover:bg-[#101820] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-amber-400/50",
          open ? "ring-1 ring-white/15" : "",
          ACCENT_RING[active.accent],
        ].join(" ")}
      >
        <div className="relative h-7 w-7 shrink-0 overflow-hidden rounded-md border border-white/10 bg-[#080c11] sm:h-8 sm:w-8">
          <img src={active.icon} alt="" className="h-full w-full object-contain p-0.5" draggable={false} />
        </div>
        <div className="hidden min-w-0 text-left leading-tight sm:block">
          <p className="text-[8px] font-medium uppercase tracking-[0.14em] text-neutral-500">Modul garaj</p>
          <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-neutral-100">{active.shortLabel}</p>
          {active.subLabel ? (
            <p className={`text-[8px] font-medium uppercase tracking-[0.12em] ${ACCENT_TEXT[active.accent]}`}>
              {active.subLabel}
            </p>
          ) : (
            <p className={`text-[8px] font-medium uppercase tracking-[0.12em] ${ACCENT_TEXT[active.accent]}`}>
              {active.label}
            </p>
          )}
        </div>
        <svg
          className={[
            "h-3.5 w-3.5 shrink-0 transition",
            ACCENT_CHEVRON[active.accent],
            open ? "rotate-180" : "",
          ].join(" ")}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.25a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {open ? (
        <div
          id={menuId}
          role="listbox"
          aria-label="Categorii garaj"
          className="absolute right-0 top-[calc(100%+6px)] z-[200] w-[min(18rem,calc(100vw-1rem))] overflow-hidden rounded-lg border border-white/10 bg-[#0b0f14] py-1 shadow-2xl shadow-black/50"
        >
          <a
            href={buildGarageHubUrl(carIndex)}
            className="block border-b border-white/[0.06] px-3 py-2 text-[10px] font-medium uppercase tracking-[0.12em] text-neutral-400 transition hover:bg-white/[0.04] hover:text-neutral-200"
            onClick={() => setOpen(false)}
          >
            ← Garaj principal
          </a>
          {GARAGE_CATEGORIES.map((cat) => {
            const isActive = cat.id === activeId;
            return (
              <button
                key={cat.id}
                type="button"
                role="option"
                aria-selected={isActive}
                disabled={isActive}
                onClick={() => navigate(buildGarageCategoryUrl(cat, carIndex))}
                className={[
                  "flex w-full items-center gap-2.5 px-2.5 py-2 text-left transition",
                  isActive ? `${ACCENT_BG[cat.accent]} cursor-default` : "cursor-pointer hover:bg-white/[0.04]",
                ].join(" ")}
              >
                <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-md border border-white/10 bg-[#080c11]">
                  <img src={cat.icon} alt="" className="h-full w-full object-contain p-0.5" draggable={false} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-semibold text-neutral-100">{cat.label}</p>
                  {isActive ? (
                    <p className={`text-[9px] font-medium uppercase tracking-wide ${ACCENT_TEXT[cat.accent]}`}>
                      Categoria curentă
                    </p>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
