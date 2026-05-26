import type { ReactNode } from "react";
import type { SuspensionOptionRow } from "../types";
import {
  displayOptional,
  displayText,
  formatBooleanRo,
  formatEur,
  formatKgRange,
  formatLoweringRange,
} from "../display";
import { hasEvoRTechnicalData, isEvoRProduct } from "../evor";
import { EvoRTechnicalSpecs } from "./EvoRTechnicalSpecs";
import { HomologationWarning } from "./HomologationWarning";

export interface SuspensionProductCardProps {
  row: SuspensionOptionRow;
}

function Line({ label, children }: { label: string; children: ReactNode }) {
  return (
    <p className="text-sm leading-relaxed text-neutral-300">
      <span className="text-neutral-500">{label}: </span>
      {children}
    </p>
  );
}

export function SuspensionProductCard({ row }: SuspensionProductCardProps) {
  const title = displayOptional(row.frontend_label) ?? displayOptional(row.product_name) ?? "Produs";
  const evo = isEvoRProduct(row);
  /** EVO R: afișăm mereu avertismentul de omologare (mesaj din `homologation_warning` sau text implicit). */
  const showHomo = Boolean(row.show_homologation_warning) || evo;
  const evoSpecs = evo && hasEvoRTechnicalData(row);

  const priceStr = formatEur(row.price_eur_incl_vat);
  const axle = formatKgRange(row.front_axle_load_kg, row.rear_axle_load_kg);
  const frontLower = formatLoweringRange(row.front_lowering_mm_min, row.front_lowering_mm_max, "Față");
  const rearLower = formatLoweringRange(row.rear_lowering_mm_min, row.rear_lowering_mm_max, "Spate");

  const heightAdj = formatBooleanRo(row.is_height_adjustable);
  const dampAdj = formatBooleanRo(row.is_damping_adjustable);
  const threaded = formatBooleanRo(row.is_threaded_suspension);

  return (
    <article className="flex flex-col rounded-xl border border-white/10 bg-neutral-900/55 p-4 shadow-lg backdrop-blur-sm">
      {showHomo ? (
        <div className="mb-3">
          <HomologationWarning message={row.homologation_warning} />
        </div>
      ) : null}

      <header className="border-b border-white/5 pb-3">
        <h3 className="text-lg font-semibold text-neutral-50">{title}</h3>
        {displayOptional(row.product_name) && displayOptional(row.frontend_label) ? (
          <p className="mt-0.5 text-sm text-neutral-400">{displayOptional(row.product_name)}</p>
        ) : null}
        {displayOptional(row.bilstein_code) ? (
          <p className="mt-1 font-mono text-xs text-cyan-300/90">Cod: {row.bilstein_code}</p>
        ) : null}
      </header>

      <div className="mt-3 space-y-1.5">
        {displayOptional(row.frontend_description) ? (
          <p className="text-sm text-neutral-300">{row.frontend_description}</p>
        ) : null}

        {displayOptional(row.vehicle_group) ? <Line label="Grup vehicul">{row.vehicle_group}</Line> : null}
        {displayOptional(row.body_type) ? <Line label="Caroserie">{row.body_type}</Line> : null}
        {displayOptional(row.engine_group) ? <Line label="Grup motor">{row.engine_group}</Line> : null}
        {displayOptional(row.fuel_type) ? <Line label="Combustibil">{row.fuel_type}</Line> : null}
        {displayOptional(row.drivetrain) ? <Line label="Drivetrain">{row.drivetrain}</Line> : null}

        <Line label="Preț">{priceStr ?? "Nespecificat"}</Line>
        {axle ? <Line label="Sarcină axă">{axle}</Line> : null}
        {frontLower ? (
          <p className="text-sm leading-relaxed text-neutral-300">
            <span className="text-neutral-500">Coborâre față: </span>
            {frontLower.replace(/^Față:\s*/, "")}
          </p>
        ) : null}
        {rearLower ? (
          <p className="text-sm leading-relaxed text-neutral-300">
            <span className="text-neutral-500">Coborâre spate: </span>
            {rearLower.replace(/^Spate:\s*/, "")}
          </p>
        ) : null}

        {heightAdj ? <Line label="Reglaj înălțime">{heightAdj}</Line> : null}
        {dampAdj ? <Line label="Reglaj duritate (amortizare)">{dampAdj}</Line> : null}
        {threaded ? <Line label="Suspensie filetată (coilover)">{threaded}</Line> : null}

        <Line label="TÜV">{displayText(row.tuv_status)}</Line>
        <Line label="Omologare rutieră">{displayText(row.road_legal_status)}</Line>

        {displayOptional(row.recommendation_note) ? (
          <p className="mt-2 rounded-md border border-white/5 bg-neutral-950/50 p-2 text-sm text-neutral-300">
            <span className="font-medium text-neutral-400">Recomandare: </span>
            {row.recommendation_note}
          </p>
        ) : null}
      </div>

      {evoSpecs ? <EvoRTechnicalSpecs row={row} /> : null}
    </article>
  );
}
