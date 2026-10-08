import type { SuspensionCompatFilters } from "../types";
import { hasText } from "../display";

export interface SuspensionFilterOptions {
  drivetrain: string[];
  fuel_type: string[];
  engine_group: string[];
  body_type: string[];
}

export interface SuspensionFiltersProps {
  options: SuspensionFilterOptions;
  value: SuspensionCompatFilters;
  onChange: (next: SuspensionCompatFilters) => void;
  disabled?: boolean;
}

function uniqSorted(values: (string | null | undefined)[]): string[] {
  const s = new Set<string>();
  for (const v of values) {
    const t = String(v ?? "").trim();
    if (hasText(t)) s.add(t);
  }
  return Array.from(s).sort((a, b) => a.localeCompare(b, "ro"));
}

export function buildCompatOptionsFromRows(
  rows: { drivetrain?: unknown; fuel_type?: unknown; engine_group?: unknown; body_type?: unknown }[],
): SuspensionFilterOptions {
  return {
    drivetrain: uniqSorted(rows.map((r) => r.drivetrain as string)),
    fuel_type: uniqSorted(rows.map((r) => r.fuel_type as string)),
    engine_group: uniqSorted(rows.map((r) => r.engine_group as string)),
    body_type: uniqSorted(rows.map((r) => r.body_type as string)),
  };
}

function Select({
  label,
  options,
  value,
  onChange,
  disabled,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  if (options.length === 0) return null;
  return (
    <label className="flex min-w-[140px] flex-1 flex-col gap-1 text-sm">
      <span className="text-neutral-400">{label}</span>
      <select
        className="rounded-lg border border-white/10 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-cyan-500/50 disabled:opacity-50"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Toate</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

export function SuspensionFilters({ options, value, onChange, disabled }: SuspensionFiltersProps) {
  const patch = (partial: Partial<SuspensionCompatFilters>) =>
    onChange({ ...value, ...partial });

  const anyOpts =
    options.drivetrain.length +
      options.fuel_type.length +
      options.engine_group.length +
      options.body_type.length >
    0;

  if (!anyOpts) return null;

  return (
    <fieldset className="mt-4 rounded-xl border border-white/10 bg-neutral-900/40 p-4">
      <legend className="px-1 text-sm font-medium text-neutral-300">Compatibilitate vehicul</legend>
      <div className="mt-2 flex flex-wrap gap-3">
        <Select
          label="Drivetrain"
          options={options.drivetrain}
          value={value.drivetrain}
          onChange={(drivetrain) => patch({ drivetrain })}
          disabled={disabled}
        />
        <Select
          label="Combustibil"
          options={options.fuel_type}
          value={value.fuel_type}
          onChange={(fuel_type) => patch({ fuel_type })}
          disabled={disabled}
        />
        <Select
          label="Grup motor"
          options={options.engine_group}
          value={value.engine_group}
          onChange={(engine_group) => patch({ engine_group })}
          disabled={disabled}
        />
        <Select
          label="Caroserie"
          options={options.body_type}
          value={value.body_type}
          onChange={(body_type) => patch({ body_type })}
          disabled={disabled}
        />
      </div>
    </fieldset>
  );
}
