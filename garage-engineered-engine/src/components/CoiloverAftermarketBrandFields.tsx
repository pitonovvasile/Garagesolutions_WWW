import {
  COILOVER_AFTERMARKET_BRAND_CUSTOM,
  COILOVER_AFTERMARKET_BRAND_OTHER,
  COILOVER_AFTERMARKET_BRANDS,
} from "../data/coiloverSetup";
import { useSuspensionStore } from "../store/suspensionStore";

const setupSelectShell =
  "w-full rounded border border-white/10 bg-[#0b0f14] px-1.5 py-1 font-mono text-[10px] text-neutral-200 shadow-inner outline-none focus:border-cyan-500/35";

const rowLabel = "text-[9px] text-neutral-500";
const sectionTitle = "text-[9px] font-semibold uppercase tracking-[0.12em] text-neutral-400";

function AftermarketBrandSelect({
  label,
  value,
  otherValue,
  placeholder,
  onBrandChange,
  onOtherChange,
}: {
  label: string;
  value: string | null;
  otherValue: string | null;
  placeholder: string;
  onBrandChange: (brand: string | null) => void;
  onOtherChange: (name: string | null) => void;
}) {
  return (
    <>
      <div className="mt-1.5 grid grid-cols-[minmax(0,5.5rem)_1fr] items-center gap-2">
        <span className={rowLabel}>{label}</span>
        <select
          className={setupSelectShell}
          value={value ?? ""}
          onChange={(e) => onBrandChange(e.target.value || null)}
        >
          <option value="">{placeholder}</option>
          {COILOVER_AFTERMARKET_BRANDS.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
          <option value={COILOVER_AFTERMARKET_BRAND_OTHER}>{COILOVER_AFTERMARKET_BRAND_OTHER}</option>
        </select>
      </div>
      {value === COILOVER_AFTERMARKET_BRAND_OTHER ? (
        <div className="mt-1.5 grid grid-cols-[minmax(0,5.5rem)_1fr] items-center gap-2">
          <span className={rowLabel}>Alt brand</span>
          <input
            type="text"
            placeholder="Nume brand…"
            className={setupSelectShell}
            value={otherValue ?? ""}
            onChange={(e) => onOtherChange(e.target.value.trim() || null)}
          />
        </div>
      ) : null}
    </>
  );
}

export function CoiloverAftermarketBrandFields() {
  const brand = useSuspensionStore((s) => s.coiloverAftermarketBrand);
  const brandOther = useSuspensionStore((s) => s.coiloverAftermarketBrandOther);
  const springBrand = useSuspensionStore((s) => s.coiloverAftermarketSpringBrand);
  const springBrandOther = useSuspensionStore((s) => s.coiloverAftermarketSpringBrandOther);
  const damperBrand = useSuspensionStore((s) => s.coiloverAftermarketDamperBrand);
  const damperBrandOther = useSuspensionStore((s) => s.coiloverAftermarketDamperBrandOther);
  const setBrand = useSuspensionStore((s) => s.setCoiloverAftermarketBrand);
  const setBrandOther = useSuspensionStore((s) => s.setCoiloverAftermarketBrandOther);
  const setSpringBrand = useSuspensionStore((s) => s.setCoiloverAftermarketSpringBrand);
  const setSpringBrandOther = useSuspensionStore((s) => s.setCoiloverAftermarketSpringBrandOther);
  const setDamperBrand = useSuspensionStore((s) => s.setCoiloverAftermarketDamperBrand);
  const setDamperBrandOther = useSuspensionStore((s) => s.setCoiloverAftermarketDamperBrandOther);

  const isCustom = brand === COILOVER_AFTERMARKET_BRAND_CUSTOM;

  return (
    <div className="mt-2 rounded-md border border-cyan-500/25 bg-cyan-950/10 p-1.5 ring-1 ring-cyan-500/15">
      <p className={sectionTitle}>Brand coilover</p>
      <p className="mt-0.5 text-[8px] leading-snug text-neutral-600">
        Aftermarket — un singur brand pentru kit complet, Custom pentru resort și amortizor
        separate, sau Other pentru brand necunoscut.
      </p>
      <div className="mt-1.5 grid grid-cols-[minmax(0,5.5rem)_1fr] items-center gap-2">
        <span className={rowLabel}>Brand</span>
        <select
          className={setupSelectShell}
          value={brand ?? ""}
          onChange={(e) => setBrand(e.target.value || null)}
        >
          <option value="">Selectează brand…</option>
          {COILOVER_AFTERMARKET_BRANDS.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
          <option value={COILOVER_AFTERMARKET_BRAND_CUSTOM}>{COILOVER_AFTERMARKET_BRAND_CUSTOM}</option>
          <option value={COILOVER_AFTERMARKET_BRAND_OTHER}>{COILOVER_AFTERMARKET_BRAND_OTHER}</option>
        </select>
      </div>
      {brand === COILOVER_AFTERMARKET_BRAND_OTHER ? (
        <div className="mt-1.5 grid grid-cols-[minmax(0,5.5rem)_1fr] items-center gap-2">
          <span className={rowLabel}>Alt brand</span>
          <input
            type="text"
            placeholder="Nume brand…"
            className={setupSelectShell}
            value={brandOther ?? ""}
            onChange={(e) => setBrandOther(e.target.value.trim() || null)}
          />
        </div>
      ) : null}
      {isCustom ? (
        <div className="mt-2 space-y-0 border-t border-cyan-500/20 pt-2">
          <AftermarketBrandSelect
            label="Springs"
            value={springBrand}
            otherValue={springBrandOther}
            placeholder="Selectează brand resort…"
            onBrandChange={setSpringBrand}
            onOtherChange={setSpringBrandOther}
          />
          <AftermarketBrandSelect
            label="Dampers"
            value={damperBrand}
            otherValue={damperBrandOther}
            placeholder="Selectează brand amortizor…"
            onBrandChange={setDamperBrand}
            onOtherChange={setDamperBrandOther}
          />
        </div>
      ) : null}
    </div>
  );
}
