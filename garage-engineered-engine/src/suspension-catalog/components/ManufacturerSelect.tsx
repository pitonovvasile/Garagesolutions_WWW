export interface ManufacturerSelectProps {
  id?: string;
  label?: string;
  manufacturers: string[];
  value: string;
  onChange: (manufacturer: string) => void;
  disabled?: boolean;
}

export function ManufacturerSelect({
  id = "susp-manufacturer",
  label = "Producător",
  manufacturers,
  value,
  onChange,
  disabled,
}: ManufacturerSelectProps) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-neutral-400">{label}</span>
      <select
        id={id}
        className="oem-catalog-select rounded-lg border border-white/10 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-cyan-500/50 disabled:opacity-50"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">— Alege producătorul —</option>
        {manufacturers.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
    </label>
  );
}
