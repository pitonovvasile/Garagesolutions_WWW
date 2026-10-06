import type { SuspensionOptionRow } from "../types";
import { displayOptional, formatNumber, formatRateRange } from "../display";

export interface EvoRTechnicalSpecsProps {
  row: SuspensionOptionRow;
}

function Row({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="grid grid-cols-1 gap-0.5 border-b border-white/5 py-1.5 text-sm last:border-0 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <span className="text-neutral-400">{label}</span>
      <span className="text-neutral-100">{value}</span>
    </div>
  );
}

export function EvoRTechnicalSpecs({ row }: EvoRTechnicalSpecsProps) {
  const clickComp =
    formatNumber(row.compression_adjustment_clicks) != null
      ? String(formatNumber(row.compression_adjustment_clicks))
      : displayOptional(row.compression_adjustment_clicks);
  const clickReb =
    formatNumber(row.rebound_adjustment_clicks) != null
      ? String(formatNumber(row.rebound_adjustment_clicks))
      : displayOptional(row.rebound_adjustment_clicks);

  const rows: { label: string; value: string | null }[] = [
    { label: "Tip reglaj", value: displayOptional(row.adjustment_type) },
    { label: "Click-uri compresie", value: clickComp },
    { label: "Click-uri rebond", value: clickReb },
    { label: "Combinații reglaj", value: displayOptional(row.adjustment_combinations) },
    { label: "Design amortizor", value: displayOptional(row.damper_design) },
    { label: "Tip rezervor", value: displayOptional(row.reservoir_type) },
    { label: "Material construcție", value: displayOptional(row.construction_material) },
    { label: "Tip arc", value: displayOptional(row.spring_type) },
    {
      label: "Arc principal față (N/mm)",
      value: formatRateRange(
        "Față",
        row.front_main_spring_rate_n_mm_min,
        row.front_main_spring_rate_n_mm_max,
      ),
    },
    {
      label: "Arc secundar față (N/mm)",
      value: formatRateRange(
        "Față",
        row.front_tender_spring_rate_n_mm_min,
        row.front_tender_spring_rate_n_mm_max,
      ),
    },
    {
      label: "Arc principal spate (N/mm)",
      value: formatRateRange(
        "Spate",
        row.rear_main_spring_rate_n_mm_min,
        row.rear_main_spring_rate_n_mm_max,
      ),
    },
    {
      label: "Arc secundar spate (N/mm)",
      value: formatRateRange(
        "Spate",
        row.rear_tender_spring_rate_n_mm_min,
        row.rear_tender_spring_rate_n_mm_max,
      ),
    },
    { label: "Notă tehnică", value: displayOptional(row.technical_note) },
  ];

  const any = rows.some((r) => r.value);
  if (!any) return null;

  return (
    <section className="mt-3 rounded-lg border border-cyan-500/20 bg-cyan-950/20 px-3 py-2">
      <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-cyan-200/90">
        Specificații tehnice
      </h4>
      <div>{rows.map((r) => (r.value ? <Row key={r.label} label={r.label} value={r.value} /> : null))}</div>
    </section>
  );
}
