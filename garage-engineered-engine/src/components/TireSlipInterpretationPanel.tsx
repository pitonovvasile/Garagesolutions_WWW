import { useId, useMemo, useState, type ReactNode } from "react";
import {
  ALIGNMENT_SLIP_GUIDANCE,
  EXAMPLE_CALLOUTS,
  HANDLING_CONCEPTS,
  type TireSlipCategoryId,
  SLIP_FUNDAMENTALS,
  TIRE_SLIP_CATEGORIES,
  TIRE_SLIP_DISCLAIMER,
} from "../data/tireSlipInterpretation";

function DetailBlock({
  title,
  children,
  defaultOpen,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details
      className="rounded-lg border border-white/10 bg-black/25 text-[10px] text-neutral-300"
      open={defaultOpen}
    >
      <summary className="cursor-pointer select-none px-2 py-1.5 font-semibold text-neutral-200 hover:bg-white/5">
        {title}
      </summary>
      <div className="border-t border-white/10 px-2 py-2 leading-relaxed">{children}</div>
    </details>
  );
}

export function TireSlipInterpretationPanel() {
  const sid = useId().replace(/:/g, "");
  const [category, setCategory] = useState<TireSlipCategoryId>("street_radial");
  const cat = useMemo(() => TIRE_SLIP_CATEGORIES.find((c) => c.id === category)!, [category]);

  return (
    <div className="border-t border-white/10 p-3 pb-6">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-400/80">
        Tire slip angle — interpretation
      </p>
      <p className="mb-2 rounded border border-amber-500/25 bg-amber-500/10 px-2 py-1.5 text-[9px] leading-snug text-amber-100/90">
        <span className="font-semibold text-amber-200/95">Not simulated.</span> Education & setup guidance
        only — no slip angle output, tire forces, Pacejka, velocity, yaw, or temperature model.
      </p>
      <p className="mb-3 text-[9px] leading-relaxed text-neutral-500">{TIRE_SLIP_DISCLAIMER}</p>

      <label className="mb-2 block text-[10px] font-medium text-neutral-400" htmlFor={`tire-slip-cat-${sid}`}>
        Tire context (interpretation)
      </label>
      <select
        id={`tire-slip-cat-${sid}`}
        className="mb-3 w-full rounded-lg border border-white/10 bg-black/40 px-2 py-2 text-xs text-white outline-none focus:border-cyan-500/40"
        value={category}
        onChange={(e) => setCategory(e.target.value as TireSlipCategoryId)}
      >
        {TIRE_SLIP_CATEGORIES.map((c) => (
          <option key={c.id} value={c.id}>
            {c.label}
          </option>
        ))}
      </select>

      <div className="mb-3 rounded-lg border border-cyan-500/25 bg-cyan-950/20 p-2">
        <p className="text-[10px] font-semibold text-cyan-100/95">{cat.label}</p>
        <p className="mt-1 text-[9px] leading-relaxed text-neutral-400">{cat.shortHint}</p>
        <p className="mt-2 text-[9px] text-neutral-500">
          <span className="font-medium text-neutral-400">vs street baseline:</span> {cat.slipToleranceVsStreet}
        </p>
        <p className="mt-1 text-[9px] text-neutral-500">
          <span className="font-medium text-neutral-400">Thermal:</span> {cat.thermalNotes}
        </p>
        <ul className="mt-2 list-inside list-disc space-y-1 text-[9px] text-neutral-400">
          {cat.typicalTradeoffs.map((t, i) => (
            <li key={i}>{t}</li>
          ))}
        </ul>
      </div>

      <div className="mb-3 space-y-1.5 rounded border border-white/10 bg-[#0d1218] p-2">
        <p className="text-[9px] font-semibold uppercase tracking-wide text-neutral-500">Example phrases</p>
        <ul className="space-y-1 text-[9px] italic leading-snug text-neutral-400">
          {EXAMPLE_CALLOUTS.map((x, i) => (
            <li key={i} className="border-l-2 border-cyan-500/35 pl-2">
              “{x}”
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-2">
        <DetailBlock title="Fundamentals" defaultOpen>
          <div className="space-y-3">
            {SLIP_FUNDAMENTALS.map((s) => (
              <div key={s.title}>
                <p className="font-medium text-neutral-300">{s.title}</p>
                <ul className="mt-1 list-inside list-disc space-y-1 text-neutral-400">
                  {s.bullets.map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </DetailBlock>

        <DetailBlock title="Handling concepts (qualitative)">
          <div className="space-y-3">
            {HANDLING_CONCEPTS.map((s) => (
              <div key={s.title}>
                <p className="font-medium text-neutral-300">{s.title}</p>
                <ul className="mt-1 list-inside list-disc space-y-1 text-neutral-400">
                  {s.bullets.map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </DetailBlock>

        <DetailBlock title="Alignment → slip angle behavior (guidance)">
          <div className="space-y-3">
            {ALIGNMENT_SLIP_GUIDANCE.map((a) => (
              <div key={a.topic}>
                <p className="font-medium text-cyan-200/85">{a.topic}</p>
                <ul className="mt-1 list-inside list-disc space-y-1 text-neutral-400">
                  {a.relationToSlip.map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </DetailBlock>
      </div>
    </div>
  );
}
