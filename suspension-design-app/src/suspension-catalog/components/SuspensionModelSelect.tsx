import type { SuspensionModelOption } from "../types";

export interface SuspensionModelSelectProps {
  id?: string;
  label?: string;
  models: SuspensionModelOption[];
  valueSlug: string;
  onChangeSlug: (slug: string) => void;
  disabled?: boolean;
}

export function SuspensionModelSelect({
  id = "susp-model",
  label = "Model suspensie",
  models,
  valueSlug,
  onChangeSlug,
  disabled,
}: SuspensionModelSelectProps) {
  const d = disabled || models.length === 0;
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-neutral-400">{label}</span>
      <select
        id={id}
        className="oem-catalog-select rounded-lg border border-white/10 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-cyan-500/50 disabled:opacity-50"
        value={valueSlug}
        disabled={d}
        onChange={(e) => onChangeSlug(e.target.value)}
      >
        <option value="">— Alege modelul —</option>
        {models.map((m) => (
          <option key={m.suspension_model_slug} value={m.suspension_model_slug}>
            {m.suspension_model}
          </option>
        ))}
      </select>
    </label>
  );
}
