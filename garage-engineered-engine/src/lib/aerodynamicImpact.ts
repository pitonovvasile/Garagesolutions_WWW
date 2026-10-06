const GRAVITY_MS2 = 9.81;
const DEFAULT_EFFECT_REFERENCE_SPEED_KMH = 160;

export type AeroDataSourceType =
  | "official"
  | "published_spec"
  | "calculated"
  | "estimated"
  | "cfd"
  | "wind_tunnel"
  | "user_measured"
  | "unknown"
  | string;

export type AeroConfidenceLevel = "low" | "medium" | "high" | "unknown" | string;

export type BaseAeroProfile = {
  drag_coefficient_cd?: number | string | null;
  frontal_area_m2?: number | string | null;
  drag_area_cda_m2?: number | string | null;
  lift_coefficient_cl?: number | string | null;
  front_lift_coefficient?: number | string | null;
  rear_lift_coefficient?: number | string | null;
  front_aero_balance_percent?: number | string | null;
  rear_aero_balance_percent?: number | string | null;
  reference_speed_kmh?: number | string | null;
  is_estimated?: boolean | null;
  confidence_level?: AeroConfidenceLevel | null;
  data_source_type?: AeroDataSourceType | null;
  calculation_method?: string | null;
};

export type SelectedAeroComponent = {
  id: string;
  label?: string;
};

export type AeroComponentEffect = {
  aero_component_id?: string | null;
  componentPlannerId?: string | null;
  componentLabel?: string | null;
  speed_kmh?: number | string | null;
  delta_cd?: number | string | null;
  delta_cd_min?: number | string | null;
  delta_cd_max?: number | string | null;
  delta_cda_m2?: number | string | null;
  delta_cda_m2_min?: number | string | null;
  delta_cda_m2_max?: number | string | null;
  delta_cl?: number | string | null;
  delta_front_downforce_kg?: number | string | null;
  delta_front_downforce_kg_min?: number | string | null;
  delta_front_downforce_kg_max?: number | string | null;
  delta_rear_downforce_kg?: number | string | null;
  delta_rear_downforce_kg_min?: number | string | null;
  delta_rear_downforce_kg_max?: number | string | null;
  delta_total_downforce_kg?: number | string | null;
  delta_total_downforce_kg_min?: number | string | null;
  delta_total_downforce_kg_max?: number | string | null;
  delta_drag_kg?: number | string | null;
  delta_drag_percent?: number | string | null;
  delta_drag_percent_min?: number | string | null;
  delta_drag_percent_max?: number | string | null;
  effect_model_type?: "known_product" | "generic_template" | "parametric" | "validated" | string | null;
  data_source_type?: AeroDataSourceType | null;
  confidence_level?: AeroConfidenceLevel | null;
  calculation_method?: string | null;
  source_name?: string | null;
  notes?: string | null;
  is_estimated?: boolean | null;
};

export type AeroMetricRange = {
  min: number;
  max: number;
};

export type AerodynamicImpactResult = {
  baseCd: number | null;
  finalCd: number | null;
  baseCl: number | null;
  finalCl: number | null;
  frontalAreaM2: number | null;
  baseCda: number | null;
  finalCda: number | null;
  dragForceN: number | null;
  dragForceKg: number | null;
  frontDownforceKg: number | null;
  rearDownforceKg: number | null;
  totalDownforceKg: number | null;
  frontDownforceRangeKg: AeroMetricRange | null;
  rearDownforceRangeKg: AeroMetricRange | null;
  totalDownforceRangeKg: AeroMetricRange | null;
  finalCdRange: AeroMetricRange | null;
  frontAeroBalancePercent: number | null;
  rearAeroBalancePercent: number | null;
  aeroBalanceLabel: string;
  dragImpactLabel: string;
  stabilityImpactLabel: string;
  confidenceLevel: AeroConfidenceLevel;
  isEstimated: boolean;
  sourceSummary: string;
  calculationMethod: string | null;
  deltaCdaPercent: number | null;
  downforceDataAvailable: boolean;
  appliedComponentCount: number;
};

export type CalculateAerodynamicImpactInput = {
  baseAeroProfile: BaseAeroProfile | null;
  selectedComponents: SelectedAeroComponent[];
  componentEffects: AeroComponentEffect[];
  speedKmh: number;
  airDensity?: number;
};

function toNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(String(value).replace(",", ".").trim());
  return Number.isFinite(n) ? n : null;
}

function round(value: number | null, digits = 2): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  const m = 10 ** digits;
  return Math.round(value * m) / m;
}

function roundRange(range: AeroMetricRange | null, digits = 2): AeroMetricRange | null {
  if (!range) return null;
  const min = round(range.min, digits);
  const max = round(range.max, digits);
  if (min == null || max == null) return null;
  return { min, max };
}

function midpoint(min: number | null, max: number | null): number | null {
  if (min != null && max != null) return (min + max) / 2;
  return min ?? max;
}

function normalizedRange(
  minValue: unknown,
  maxValue: unknown,
  exactValue: number | null,
): AeroMetricRange | null {
  const min = toNumber(minValue);
  const max = toNumber(maxValue);
  if (min == null && max == null) {
    return exactValue == null ? null : { min: exactValue, max: exactValue };
  }
  const fallback = exactValue ?? midpoint(min, max) ?? 0;
  return {
    min: Math.min(min ?? fallback, max ?? fallback),
    max: Math.max(min ?? fallback, max ?? fallback),
  };
}

function classifyAeroBalance(frontPercent: number | null): string {
  if (frontPercent == null) return "Not available";
  if (frontPercent < 40) return "Rear biased";
  if (frontPercent <= 47) return "Slightly rear";
  if (frontPercent <= 53) return "Neutral";
  if (frontPercent <= 60) return "Slightly front";
  return "Front biased";
}

function classifyDragImpact(deltaPercent: number | null): string {
  if (deltaPercent == null) return "Not available";
  if (deltaPercent <= -3) return "Reduced";
  if (deltaPercent <= 3) return "Neutral";
  if (deltaPercent <= 8) return "Slightly increased";
  return "Increased";
}

function classifyStability(
  totalDownforceKg: number | null,
  aeroBalanceLabel: string,
): string {
  if (totalDownforceKg == null) return "Downforce data unavailable";
  if (Math.abs(totalDownforceKg) < 1) return "Minimal";
  if (aeroBalanceLabel === "Rear biased" || aeroBalanceLabel === "Slightly rear") {
    return "Rear stability emphasis";
  }
  if (aeroBalanceLabel === "Front biased" || aeroBalanceLabel === "Slightly front") {
    return "Front stability emphasis";
  }
  return "Balanced stability";
}

function confidenceRank(level: AeroConfidenceLevel | null | undefined): number {
  switch (String(level ?? "unknown").toLowerCase()) {
    case "high":
      return 3;
    case "medium":
      return 2;
    case "low":
      return 1;
    default:
      return 0;
  }
}

function confidenceFromRank(rank: number): AeroConfidenceLevel {
  if (rank >= 3) return "high";
  if (rank === 2) return "medium";
  if (rank === 1) return "low";
  return "unknown";
}

function effectIsEstimated(effect: AeroComponentEffect): boolean {
  const sourceType = String(effect.data_source_type ?? "").toLowerCase();
  return effect.is_estimated === true || sourceType === "estimated" || confidenceRank(effect.confidence_level) <= 1;
}

function effectSourceLabel(effect: AeroComponentEffect): string | null {
  switch (String(effect.effect_model_type ?? "").toLowerCase()) {
    case "known_product":
      return "Known aftermarket estimate";
    case "generic_template":
      return "Generic low-confidence estimate";
    case "parametric":
      return "User dimensions estimate";
    case "validated":
      return "Validated aftermarket data";
    default:
      return null;
  }
}

function hasEffectDownforce(effect: AeroComponentEffect): boolean {
  return (
    toNumber(effect.delta_front_downforce_kg) != null ||
    toNumber(effect.delta_rear_downforce_kg) != null ||
    toNumber(effect.delta_total_downforce_kg) != null ||
    toNumber(effect.delta_cl) != null
  );
}

function downforceKgFromCoefficient(
  coefficient: number,
  dynamicPressure: number,
  frontalAreaM2: number,
): number {
  return (dynamicPressure * frontalAreaM2 * Math.abs(coefficient)) / GRAVITY_MS2;
}

function scaleAtSpeed(value: number, selectedSpeedKmh: number, referenceSpeedKmh: number): number {
  return value * (selectedSpeedKmh / referenceSpeedKmh) ** 2;
}

export function calculateAerodynamicImpact({
  baseAeroProfile,
  selectedComponents,
  componentEffects,
  speedKmh,
  airDensity = 1.225,
}: CalculateAerodynamicImpactInput): AerodynamicImpactResult {
  const speedMs = Math.max(0, speedKmh) / 3.6;
  const dynamicPressure = 0.5 * airDensity * speedMs ** 2;
  const selectedComponentIds = new Set(selectedComponents.map((component) => component.id));
  const appliedEffects = componentEffects.filter((effect) => {
    const plannerId = effect.componentPlannerId ?? "";
    return !plannerId || selectedComponentIds.has(plannerId);
  });

  if (!baseAeroProfile) {
    const hasComponentDownforce = appliedEffects.some(hasEffectDownforce);
    return {
      baseCd: null,
      finalCd: null,
      baseCl: null,
      finalCl: null,
      frontalAreaM2: null,
      baseCda: null,
      finalCda: null,
      dragForceN: null,
      dragForceKg: null,
      frontDownforceKg: null,
      rearDownforceKg: null,
      totalDownforceKg: null,
      frontDownforceRangeKg: null,
      rearDownforceRangeKg: null,
      totalDownforceRangeKg: null,
      finalCdRange: null,
      frontAeroBalancePercent: null,
      rearAeroBalancePercent: null,
      aeroBalanceLabel: "Not available",
      dragImpactLabel: "Not available",
      stabilityImpactLabel: hasComponentDownforce ? "Estimated aerodynamic impact" : "Downforce data unavailable",
      confidenceLevel: appliedEffects.length ? "low" : "unknown",
      isEstimated: appliedEffects.length > 0,
      sourceSummary: appliedEffects.length ? "Estimated aerodynamic impact" : "No aero profile",
      calculationMethod: null,
      deltaCdaPercent: null,
      downforceDataAvailable: hasComponentDownforce,
      appliedComponentCount: appliedEffects.length,
    };
  }

  const baseCd = toNumber(baseAeroProfile.drag_coefficient_cd);
  const frontalAreaM2 = toNumber(baseAeroProfile.frontal_area_m2);
  const profileCda = toNumber(baseAeroProfile.drag_area_cda_m2);
  const baseCda =
    profileCda ?? (baseCd != null && frontalAreaM2 != null ? baseCd * frontalAreaM2 : null);
  const baseCl = toNumber(baseAeroProfile.lift_coefficient_cl);
  const baseFrontCl = toNumber(baseAeroProfile.front_lift_coefficient);
  const baseRearCl = toNumber(baseAeroProfile.rear_lift_coefficient);
  const baseFrontBalance = toNumber(baseAeroProfile.front_aero_balance_percent);
  const baseRearBalance = toNumber(baseAeroProfile.rear_aero_balance_percent);

  let deltaCd = 0;
  let hasDeltaCd = false;
  let deltaCdMin = 0;
  let deltaCdMax = 0;
  let hasDeltaCdRange = false;
  let deltaCl = 0;
  let hasDeltaCl = false;
  let frontDeltaKg = 0;
  let rearDeltaKg = 0;
  let unallocatedTotalDeltaKg = 0;
  let dragDeltaKg = 0;
  let frontDeltaKgMin = 0;
  let frontDeltaKgMax = 0;
  let rearDeltaKgMin = 0;
  let rearDeltaKgMax = 0;
  let unallocatedTotalDeltaKgMin = 0;
  let unallocatedTotalDeltaKgMax = 0;
  let dragDeltaPercent = 0;
  let dragDeltaPercentMin = 0;
  let dragDeltaPercentMax = 0;
  let hasFrontDelta = false;
  let hasRearDelta = false;
  let hasUnallocatedTotalDelta = false;
  let hasDragDelta = false;
  let hasFrontDeltaRange = false;
  let hasRearDeltaRange = false;
  let hasUnallocatedTotalDeltaRange = false;
  let hasDragPercentDelta = false;

  for (const effect of appliedEffects) {
    const referenceSpeedKmh =
      toNumber(effect.speed_kmh) ??
      toNumber(baseAeroProfile.reference_speed_kmh) ??
      DEFAULT_EFFECT_REFERENCE_SPEED_KMH;
    const speedScale = referenceSpeedKmh > 0 ? (Math.max(0, speedKmh) / referenceSpeedKmh) ** 2 : 1;

    const dCdRange = normalizedRange(effect.delta_cd_min, effect.delta_cd_max, toNumber(effect.delta_cd));
    const dCd = toNumber(effect.delta_cd) ?? midpoint(dCdRange?.min ?? null, dCdRange?.max ?? null);
    if (dCd != null) {
      deltaCd += dCd;
      hasDeltaCd = true;
    }
    if (dCdRange) {
      deltaCdMin += dCdRange.min;
      deltaCdMax += dCdRange.max;
      hasDeltaCdRange = true;
    }

    const dCl = toNumber(effect.delta_cl);
    if (dCl != null) {
      deltaCl += dCl;
      hasDeltaCl = true;
    }

    const frontRange = normalizedRange(
      effect.delta_front_downforce_kg_min,
      effect.delta_front_downforce_kg_max,
      toNumber(effect.delta_front_downforce_kg),
    );
    const frontKg = toNumber(effect.delta_front_downforce_kg) ?? midpoint(frontRange?.min ?? null, frontRange?.max ?? null);
    if (frontKg != null) {
      frontDeltaKg += frontKg * speedScale;
      hasFrontDelta = true;
    }
    if (frontRange) {
      frontDeltaKgMin += frontRange.min * speedScale;
      frontDeltaKgMax += frontRange.max * speedScale;
      hasFrontDeltaRange = true;
    }

    const rearRange = normalizedRange(
      effect.delta_rear_downforce_kg_min,
      effect.delta_rear_downforce_kg_max,
      toNumber(effect.delta_rear_downforce_kg),
    );
    const rearKg = toNumber(effect.delta_rear_downforce_kg) ?? midpoint(rearRange?.min ?? null, rearRange?.max ?? null);
    if (rearKg != null) {
      rearDeltaKg += rearKg * speedScale;
      hasRearDelta = true;
    }
    if (rearRange) {
      rearDeltaKgMin += rearRange.min * speedScale;
      rearDeltaKgMax += rearRange.max * speedScale;
      hasRearDeltaRange = true;
    }

    if (frontKg == null && rearKg == null) {
      const totalRange = normalizedRange(
        effect.delta_total_downforce_kg_min,
        effect.delta_total_downforce_kg_max,
        toNumber(effect.delta_total_downforce_kg),
      );
      const totalKg = toNumber(effect.delta_total_downforce_kg) ?? midpoint(totalRange?.min ?? null, totalRange?.max ?? null);
      if (totalKg != null) {
        unallocatedTotalDeltaKg += totalKg * speedScale;
        hasUnallocatedTotalDelta = true;
      }
      if (totalRange) {
        unallocatedTotalDeltaKgMin += totalRange.min * speedScale;
        unallocatedTotalDeltaKgMax += totalRange.max * speedScale;
        hasUnallocatedTotalDeltaRange = true;
      }
    }

    const dragKg = toNumber(effect.delta_drag_kg);
    if (dragKg != null) {
      dragDeltaKg += scaleAtSpeed(dragKg, Math.max(0, speedKmh), referenceSpeedKmh);
      hasDragDelta = true;
    }

    const dragPercentRange = normalizedRange(
      effect.delta_drag_percent_min,
      effect.delta_drag_percent_max,
      toNumber(effect.delta_drag_percent),
    );
    const dragPercent =
      toNumber(effect.delta_drag_percent) ?? midpoint(dragPercentRange?.min ?? null, dragPercentRange?.max ?? null);
    if (dragPercent != null) {
      dragDeltaPercent += dragPercent;
      hasDragPercentDelta = true;
    }
    if (dragPercentRange) {
      dragDeltaPercentMin += dragPercentRange.min;
      dragDeltaPercentMax += dragPercentRange.max;
    }
  }

  const percentCdDelta =
    hasDragPercentDelta && baseCd != null && !hasDeltaCd ? baseCd * (dragDeltaPercent / 100) : 0;
  const finalCd = baseCd != null ? baseCd + deltaCd + percentCdDelta : null;
  const finalCl = baseCl != null || hasDeltaCl ? (baseCl ?? 0) + deltaCl : null;
  const finalCda =
    finalCd != null && frontalAreaM2 != null
      ? finalCd * frontalAreaM2
      : baseCda != null && frontalAreaM2 != null && (hasDeltaCd || hasDragPercentDelta)
        ? baseCda + deltaCd * frontalAreaM2 + (hasDragPercentDelta && !hasDeltaCd ? baseCda * (dragDeltaPercent / 100) : 0)
        : baseCda;
  const finalCdRange =
    baseCd != null && hasDeltaCdRange
      ? { min: baseCd + deltaCdMin, max: baseCd + deltaCdMax }
      : baseCd != null && hasDragPercentDelta && !hasDeltaCd
        ? {
            min: baseCd + baseCd * (dragDeltaPercentMin / 100),
            max: baseCd + baseCd * (dragDeltaPercentMax / 100),
          }
        : null;

  let dragForceN = finalCda != null ? dynamicPressure * finalCda : null;
  let dragForceKg = dragForceN != null ? dragForceN / GRAVITY_MS2 : null;
  if (hasDragDelta && dragForceKg != null) {
    dragForceKg += dragDeltaKg;
    dragForceN = dragForceKg * GRAVITY_MS2;
  }

  let frontDownforceKg: number | null = null;
  let rearDownforceKg: number | null = null;
  let totalDownforceKg: number | null = null;
  let hasUnallocatedBaseDownforce = false;

  const finalClUsedForTotal = frontalAreaM2 != null && baseFrontCl == null && baseRearCl == null && finalCl != null;

  if (frontalAreaM2 != null && baseFrontCl != null && baseRearCl != null) {
    frontDownforceKg = downforceKgFromCoefficient(baseFrontCl, dynamicPressure, frontalAreaM2);
    rearDownforceKg = downforceKgFromCoefficient(baseRearCl, dynamicPressure, frontalAreaM2);
    totalDownforceKg = frontDownforceKg + rearDownforceKg;
  } else if (finalClUsedForTotal && finalCl != null && frontalAreaM2 != null) {
    totalDownforceKg = downforceKgFromCoefficient(finalCl, dynamicPressure, frontalAreaM2);
    if (baseFrontBalance != null && baseRearBalance != null) {
      frontDownforceKg = totalDownforceKg * (baseFrontBalance / 100);
      rearDownforceKg = totalDownforceKg * (baseRearBalance / 100);
    } else {
      hasUnallocatedBaseDownforce = true;
    }
  }

  if (hasDeltaCl && !finalClUsedForTotal && frontalAreaM2 != null) {
    const deltaClDownforceKg = downforceKgFromCoefficient(deltaCl, dynamicPressure, frontalAreaM2);
    if (frontDownforceKg != null && rearDownforceKg != null) {
      const total = frontDownforceKg + rearDownforceKg;
      const frontShare = total > 0 ? frontDownforceKg / total : 0.5;
      frontDownforceKg += deltaClDownforceKg * frontShare;
      rearDownforceKg += deltaClDownforceKg * (1 - frontShare);
    } else {
      totalDownforceKg = (totalDownforceKg ?? 0) + deltaClDownforceKg;
      hasUnallocatedBaseDownforce = true;
    }
  }

  if (
    (hasFrontDelta || hasRearDelta) &&
    totalDownforceKg == null &&
    frontDownforceKg == null &&
    rearDownforceKg == null
  ) {
    frontDownforceKg = 0;
    rearDownforceKg = 0;
  }

  if (hasFrontDelta) frontDownforceKg = (frontDownforceKg ?? 0) + frontDeltaKg;
  if (hasRearDelta) rearDownforceKg = (rearDownforceKg ?? 0) + rearDeltaKg;

  if (frontDownforceKg != null && rearDownforceKg != null && !hasUnallocatedBaseDownforce && !hasUnallocatedTotalDelta) {
    totalDownforceKg = frontDownforceKg + rearDownforceKg;
  } else if (totalDownforceKg != null || hasUnallocatedTotalDelta || hasFrontDelta || hasRearDelta) {
    totalDownforceKg =
      (totalDownforceKg ?? 0) +
      (frontDownforceKg != null && rearDownforceKg != null && hasUnallocatedBaseDownforce
        ? frontDeltaKg + rearDeltaKg
        : frontDownforceKg == null || rearDownforceKg == null
          ? frontDeltaKg + rearDeltaKg
          : 0) +
      unallocatedTotalDeltaKg;
  }

  const frontDownforceRangeKg =
    frontDownforceKg != null && hasFrontDeltaRange
      ? {
          min: frontDownforceKg - frontDeltaKg + frontDeltaKgMin,
          max: frontDownforceKg - frontDeltaKg + frontDeltaKgMax,
        }
      : null;
  const rearDownforceRangeKg =
    rearDownforceKg != null && hasRearDeltaRange
      ? {
          min: rearDownforceKg - rearDeltaKg + rearDeltaKgMin,
          max: rearDownforceKg - rearDeltaKg + rearDeltaKgMax,
        }
      : null;
  const hasAnyDownforceRange = hasFrontDeltaRange || hasRearDeltaRange || hasUnallocatedTotalDeltaRange;
  const totalDownforceRangeKg =
    totalDownforceKg != null && hasAnyDownforceRange
      ? {
          min:
            totalDownforceKg -
            frontDeltaKg -
            rearDeltaKg -
            unallocatedTotalDeltaKg +
            (hasFrontDeltaRange ? frontDeltaKgMin : frontDeltaKg) +
            (hasRearDeltaRange ? rearDeltaKgMin : rearDeltaKg) +
            (hasUnallocatedTotalDeltaRange ? unallocatedTotalDeltaKgMin : unallocatedTotalDeltaKg),
          max:
            totalDownforceKg -
            frontDeltaKg -
            rearDeltaKg -
            unallocatedTotalDeltaKg +
            (hasFrontDeltaRange ? frontDeltaKgMax : frontDeltaKg) +
            (hasRearDeltaRange ? rearDeltaKgMax : rearDeltaKg) +
            (hasUnallocatedTotalDeltaRange ? unallocatedTotalDeltaKgMax : unallocatedTotalDeltaKg),
        }
      : null;

  const canCalculateBalance =
    frontDownforceKg != null &&
    rearDownforceKg != null &&
    totalDownforceKg != null &&
    totalDownforceKg > 0 &&
    !hasUnallocatedBaseDownforce &&
    !hasUnallocatedTotalDelta;
  let frontAeroBalancePercent: number | null = null;
  let rearAeroBalancePercent: number | null = null;
  if (canCalculateBalance && frontDownforceKg != null && rearDownforceKg != null && totalDownforceKg != null) {
    frontAeroBalancePercent = (frontDownforceKg / totalDownforceKg) * 100;
    rearAeroBalancePercent = (rearDownforceKg / totalDownforceKg) * 100;
  }
  const aeroBalanceLabel = classifyAeroBalance(frontAeroBalancePercent);
  const deltaCdaPercent =
    baseCda != null && baseCda > 0 && finalCda != null ? ((finalCda - baseCda) / baseCda) * 100 : null;
  const dragImpactLabel = classifyDragImpact(deltaCdaPercent);
  const downforceDataAvailable = totalDownforceKg != null || hasFrontDelta || hasRearDelta || hasUnallocatedTotalDelta || finalCl != null;
  const stabilityImpactLabel = classifyStability(totalDownforceKg, aeroBalanceLabel);

  const baseEstimated =
    baseAeroProfile.is_estimated === true ||
    String(baseAeroProfile.data_source_type ?? "").toLowerCase() === "estimated";
  const effectsEstimated = appliedEffects.some(effectIsEstimated);
  const minConfidenceRank = Math.min(
    confidenceRank(baseAeroProfile.confidence_level),
    ...appliedEffects.map((effect) => confidenceRank(effect.confidence_level)),
  );
  const confidenceLevel = confidenceFromRank(Number.isFinite(minConfidenceRank) ? minConfidenceRank : 0);
  const allDownforceFromEstimatedComponents =
    baseCl == null &&
    baseFrontCl == null &&
    baseRearCl == null &&
    appliedEffects.some(hasEffectDownforce) &&
    appliedEffects.filter(hasEffectDownforce).every(effectIsEstimated);

  const sourceType = String(baseAeroProfile.data_source_type ?? "unknown");
  const effectLabels = [
    ...new Set(appliedEffects.map(effectSourceLabel).filter((label): label is string => Boolean(label))),
  ];
  const componentSourceSummary = effectLabels.length
    ? effectLabels.join(" + ")
    : appliedEffects.some(effectIsEstimated)
      ? "Estimated aerodynamic impact"
      : "component effects";
  const sourceSummary = allDownforceFromEstimatedComponents
    ? "Estimated aerodynamic impact"
    : appliedEffects.length
      ? `${sourceType} + ${componentSourceSummary}`
      : sourceType;

  return {
    baseCd: round(baseCd, 4),
    finalCd: round(finalCd, 4),
    baseCl: round(baseCl, 4),
    finalCl: round(finalCl, 4),
    frontalAreaM2: round(frontalAreaM2, 3),
    baseCda: round(baseCda, 3),
    finalCda: round(finalCda, 3),
    dragForceN: round(dragForceN, 1),
    dragForceKg: round(dragForceKg, 1),
    frontDownforceKg: round(frontDownforceKg, 1),
    rearDownforceKg: round(rearDownforceKg, 1),
    totalDownforceKg: round(totalDownforceKg, 1),
    frontDownforceRangeKg: roundRange(frontDownforceRangeKg, 1),
    rearDownforceRangeKg: roundRange(rearDownforceRangeKg, 1),
    totalDownforceRangeKg: roundRange(totalDownforceRangeKg, 1),
    finalCdRange: roundRange(finalCdRange, 4),
    frontAeroBalancePercent: round(frontAeroBalancePercent, 1),
    rearAeroBalancePercent: round(rearAeroBalancePercent, 1),
    aeroBalanceLabel,
    dragImpactLabel,
    stabilityImpactLabel,
    confidenceLevel,
    isEstimated: baseEstimated || effectsEstimated,
    sourceSummary,
    calculationMethod: [
      baseAeroProfile.calculation_method?.trim() || null,
      appliedEffects.length ? "Component effects scaled by speed squared" : null,
      ...[
        ...new Set(
          appliedEffects
            .map((effect) => effect.calculation_method?.trim() || null)
            .filter((part): part is string => Boolean(part)),
        ),
      ],
    ]
      .filter((part): part is string => Boolean(part))
      .join("; ") || null,
    deltaCdaPercent: round(deltaCdaPercent, 1),
    downforceDataAvailable,
    appliedComponentCount: appliedEffects.length,
  };
}
