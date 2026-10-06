import brakingIcon from "../../../assets/garage-braking-system-icon.png";
import { useGarageCars } from "../hooks/useGarageCars";
import { formatSavedCarLabel } from "../lib/garageStorage";
import { useSuspensionStore } from "../store/suspensionStore";
import type { ReactNode } from "react";

const CATALOG_GROUPS = [
  {
    id: "discs",
    title: "Discuri de frână",
    items: ["OEM replacement discs", "Slotted / drilled discs", "Big brake kits", "Two-piece discs"],
    badge: "High relevance",
  },
  {
    id: "calipers",
    title: "Etriere & adaptoare",
    items: ["OEM calipers", "Upgraded calipers", "Caliper rebuild kits", "Bracket adapters"],
    badge: "Fitment",
  },
  {
    id: "fluid",
    title: "Lichid & service",
    items: ["DOT 4 / DOT 5.1 fluid", "Brake bleed kits", "Reservoir caps", "Service kits"],
    badge: "Service",
  },
  {
    id: "lines",
    title: "Linii & accesorii",
    items: ["Braided brake lines", "Hard lines", "Pads & wear sensors", "Handbrake cables"],
    badge: "Reliability",
  },
] as const;

function Section({
  id,
  title,
  subtitle,
  children,
}: {
  id: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-3 rounded-lg border border-white/10 bg-[#080c11]/60 p-3 sm:p-4"
      aria-labelledby={`${id}-title`}
    >
      <h2 id={`${id}-title`} className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-100">
        {title}
      </h2>
      {subtitle ? <p className="mt-1 text-[10px] leading-relaxed text-neutral-500">{subtitle}</p> : null}
      <div className="mt-3">{children}</div>
    </section>
  );
}

export function BrakingCenterViewport() {
  const garageCars = useGarageCars();
  const garageCarIndex = useSuspensionStore((s) => s.garageCarIndex);
  const linkedCar =
    garageCarIndex !== null && garageCarIndex >= 0 && garageCarIndex < garageCars.length
      ? garageCars[garageCarIndex]!
      : null;
  const vehicleLabel = linkedCar
    ? formatSavedCarLabel(linkedCar, garageCarIndex ?? 0)
    : "No vehicle selected";

  return (
    <main className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[#06080c]">
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-2 sm:p-3">
        <div className="mx-auto flex max-w-6xl flex-col gap-2.5">
          <Section id="br-center-overview" title="Sistemul de frânare">
            <div className="grid gap-3 lg:grid-cols-[1fr_5.5rem] lg:items-start">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-rose-400/90">
                  Braking system assistant
                </p>
                <h1 className="mt-1 text-lg font-semibold uppercase tracking-wide text-white sm:text-xl">
                  Sistemul de frânare
                </h1>
                <p className="mt-1 max-w-xl text-[10px] leading-relaxed text-neutral-400">
                  Modul garaj pentru configurarea sistemului de frânare (discuri, etriere, lichid, linii). Mașina
                  selectată din garaj este legată aici — același layout ca Garage Solutions Engineered Engine.
                </p>
                <p className="mt-2 inline-flex rounded-md border border-rose-500/20 bg-rose-500/[0.06] px-2 py-1 text-[9px] text-rose-100/90">
                  Vehicle: {vehicleLabel}
                </p>
              </div>
              <img
                src={brakingIcon}
                alt=""
                className="mx-auto h-[5.5rem] w-[5.5rem] rounded-lg border border-rose-500/30 bg-[#0c1219] object-contain p-1 shadow-[0_0_20px_rgba(244,63,94,0.12)] lg:mx-0"
              />
            </div>
          </Section>

          <Section
            id="br-center-catalog"
            title="Parts catalog"
            subtitle="Categorii principale — catalog complet în curs de dezvoltare."
          >
            <div className="grid gap-2.5 md:grid-cols-2">
              {CATALOG_GROUPS.map((group) => (
                <article
                  key={group.id}
                  className="rounded-lg border border-rose-500/20 bg-gradient-to-b from-[#1a1218]/90 to-[#0f172a]/95 p-3 transition hover:border-rose-400/40"
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <h3 className="text-[11px] font-semibold uppercase tracking-wide text-neutral-100">
                      {group.title}
                    </h3>
                    <span className="rounded border border-rose-500/25 bg-rose-500/10 px-1.5 py-0.5 text-[7px] font-semibold uppercase tracking-wide text-rose-200/90">
                      {group.badge}
                    </span>
                  </div>
                  <ul className="space-y-0.5">
                    {group.items.map((item) => (
                      <li key={item} className="text-[10px] text-neutral-400">
                        · {item}
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </Section>

          <Section id="br-center-fitment" title="Fitment">
            <p className="text-[10px] leading-relaxed text-neutral-400">
              Fitment checks for discs, calipers and brake lines will compare the selected garage vehicle against
              catalog compatibility — coming soon.
            </p>
          </Section>

          <Section id="br-center-saved" title="Saved setup">
            <p className="text-[10px] leading-relaxed text-neutral-400">
              Saved braking configurations will appear here after the Save / Buy workflow step.
            </p>
            <button
              type="button"
              disabled
              className="mt-2 cursor-not-allowed rounded-full border border-white/10 px-2.5 py-1 text-[8px] font-semibold uppercase tracking-[0.12em] text-neutral-500"
            >
              Save braking setup (coming soon)
            </button>
          </Section>
        </div>
      </div>
    </main>
  );
}
