import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEFAULT_ACTIVE_AERO_COMPONENTS,
  activeAeroModeToComponentEffect,
  summarizeActiveAeroModes,
} from "../src/lib/activeAero";
import { buildGenericAeroEffect, buildParametricAeroEffect } from "../src/lib/aftermarketAeroEstimation";
import { calculateAerodynamicImpact } from "../src/lib/aerodynamicImpact";
import type { AeroBodyComponentRow } from "../src/data/aeroBodyComponents";

const selectedComponents = [{ id: "front-splitter", label: "Front Splitter" }];

test("falls back to Cd * frontal area when CdA is missing", () => {
  const result = calculateAerodynamicImpact({
    baseAeroProfile: {
      drag_coefficient_cd: 0.3,
      frontal_area_m2: 2,
      confidence_level: "medium",
      data_source_type: "published_spec",
    },
    selectedComponents: [],
    componentEffects: [],
    speedKmh: 160,
  });

  assert.equal(result.baseCda, 0.6);
  assert.equal(result.finalCda, 0.6);
});

test("calculates drag force from dynamic pressure and CdA", () => {
  const result = calculateAerodynamicImpact({
    baseAeroProfile: {
      drag_coefficient_cd: 0.3,
      frontal_area_m2: 2,
      drag_area_cda_m2: 0.6,
      confidence_level: "medium",
      data_source_type: "published_spec",
    },
    selectedComponents: [],
    componentEffects: [],
    speedKmh: 160,
  });

  assert.ok(result.dragForceN != null);
  assert.ok(Math.abs(result.dragForceN - 725.9) < 0.2);
});

test("scales component downforce with speed squared", () => {
  const result = calculateAerodynamicImpact({
    baseAeroProfile: {
      drag_coefficient_cd: 0.3,
      frontal_area_m2: 2,
      confidence_level: "medium",
      data_source_type: "published_spec",
    },
    selectedComponents,
    componentEffects: [
      {
        componentPlannerId: "front-splitter",
        speed_kmh: 160,
        delta_front_downforce_kg: 12,
        confidence_level: "low",
        data_source_type: "estimated",
      },
    ],
    speedKmh: 80,
  });

  assert.equal(result.frontDownforceKg, 3);
  assert.equal(result.totalDownforceKg, 3);
  assert.equal(result.sourceSummary, "Estimated aerodynamic impact");
});

test("applies Cd and downforce component deltas", () => {
  const result = calculateAerodynamicImpact({
    baseAeroProfile: {
      drag_coefficient_cd: 0.3,
      frontal_area_m2: 2,
      confidence_level: "medium",
      data_source_type: "published_spec",
    },
    selectedComponents,
    componentEffects: [
      {
        componentPlannerId: "front-splitter",
        speed_kmh: 160,
        delta_cd: 0.01,
        delta_front_downforce_kg: 12,
        confidence_level: "low",
        data_source_type: "estimated",
      },
    ],
    speedKmh: 160,
  });

  assert.equal(result.finalCd, 0.31);
  assert.equal(result.finalCda, 0.62);
  assert.equal(result.frontDownforceKg, 12);
  assert.equal(result.dragImpactLabel, "Slightly increased");
  assert.equal(result.isEstimated, true);
});

test("applies lift coefficient deltas through final Cl", () => {
  const base = calculateAerodynamicImpact({
    baseAeroProfile: {
      drag_coefficient_cd: 0.3,
      frontal_area_m2: 2,
      lift_coefficient_cl: -0.2,
      confidence_level: "medium",
      data_source_type: "published_spec",
    },
    selectedComponents: [],
    componentEffects: [],
    speedKmh: 160,
  });
  const reduced = calculateAerodynamicImpact({
    baseAeroProfile: {
      drag_coefficient_cd: 0.3,
      frontal_area_m2: 2,
      lift_coefficient_cl: -0.2,
      confidence_level: "medium",
      data_source_type: "published_spec",
    },
    selectedComponents,
    componentEffects: [
      {
        componentPlannerId: "front-splitter",
        speed_kmh: 160,
        delta_cl: 0.1,
        confidence_level: "low",
        data_source_type: "estimated",
      },
    ],
    speedKmh: 160,
  });

  assert.equal(reduced.finalCl, -0.1);
  assert.ok(base.totalDownforceKg != null && reduced.totalDownforceKg != null);
  assert.ok(reduced.totalDownforceKg < base.totalDownforceKg);
});

test("classifies aero balance from front and rear downforce", () => {
  const neutral = calculateAerodynamicImpact({
    baseAeroProfile: {
      drag_coefficient_cd: 0.3,
      frontal_area_m2: 2,
      lift_coefficient_cl: -0.2,
      front_aero_balance_percent: 50,
      rear_aero_balance_percent: 50,
      confidence_level: "high",
      data_source_type: "wind_tunnel",
    },
    selectedComponents: [],
    componentEffects: [],
    speedKmh: 160,
  });
  assert.equal(neutral.aeroBalanceLabel, "Neutral");

  const rearBiased = calculateAerodynamicImpact({
    baseAeroProfile: {
      drag_coefficient_cd: 0.3,
      frontal_area_m2: 2,
      confidence_level: "medium",
      data_source_type: "published_spec",
    },
    selectedComponents: [
      { id: "front-splitter", label: "Front Splitter" },
      { id: "spoiler", label: "Spoiler / Wing" },
    ],
    componentEffects: [
      {
        componentPlannerId: "front-splitter",
        speed_kmh: 160,
        delta_front_downforce_kg: 10,
        confidence_level: "low",
        data_source_type: "estimated",
      },
      {
        componentPlannerId: "spoiler",
        speed_kmh: 160,
        delta_rear_downforce_kg: 40,
        confidence_level: "low",
        data_source_type: "estimated",
      },
    ],
    speedKmh: 160,
  });
  assert.equal(rearBiased.aeroBalanceLabel, "Rear biased");
});

test("keeps missing downforce unavailable instead of fabricating values", () => {
  const result = calculateAerodynamicImpact({
    baseAeroProfile: {
      drag_coefficient_cd: 0.35,
      frontal_area_m2: 1.98,
      confidence_level: "medium",
      data_source_type: "published_spec",
    },
    selectedComponents: [],
    componentEffects: [],
    speedKmh: 160,
  });

  assert.equal(result.totalDownforceKg, null);
  assert.equal(result.downforceDataAvailable, false);
  assert.equal(result.stabilityImpactLabel, "Downforce data unavailable");
});

test("generic aero template exposes a low-confidence range", () => {
  const effect = buildGenericAeroEffect({
    id: "front-splitter",
    label: "Front Splitter",
    aeroComponentType: "front_splitter",
    aeroEstimateMode: "generic",
    aeroFunctionType: "functional",
    aeroSizeClass: "medium",
    aeroUsageClass: "sport",
  } as AeroBodyComponentRow);

  assert.equal(effect.effect_model_type, "generic_template");
  assert.equal(effect.delta_front_downforce_kg_min, 6);
  assert.equal(effect.delta_front_downforce_kg_max, 15);
  assert.equal(effect.confidence_level, "low");
});

test("parametric wing estimate follows wing area and Cl range", () => {
  const effect = buildParametricAeroEffect({
    id: "spoiler",
    label: "Spoiler / Wing",
    aeroComponentType: "rear_wing",
    aeroEstimateMode: "parametric",
    aeroFunctionType: "functional",
    aeroSizeClass: "medium",
    aeroUsageClass: "sport",
    widthMm: 1400,
    chordMm: 250,
    angleDeg: 8,
    hasEndplates: false,
  } as AeroBodyComponentRow);

  assert.ok(effect);
  assert.equal(effect.effect_model_type, "parametric");
  assert.ok(Number(effect.delta_rear_downforce_kg) > 29);
  assert.ok(Number(effect.delta_rear_downforce_kg) < 37);
});

test("active rear wing DRS mode scales rear downforce with speed squared", () => {
  const component = DEFAULT_ACTIVE_AERO_COMPONENTS.find((row) => row.id === "active-rear-wing");
  assert.ok(component);
  const mode = component.modes.find((row) => row.modeType === "high_downforce");
  assert.ok(mode);

  const summary = summarizeActiveAeroModes([{ component, mode }], 200);

  assert.equal(summary.deltaCd, 0.045);
  assert.ok(summary.rearDownforceKg != null);
  assert.ok(Math.abs(summary.rearDownforceKg - 70.3) < 0.1);
});

test("active aero modes update final Cd and drag force", () => {
  const component = DEFAULT_ACTIVE_AERO_COMPONENTS.find((row) => row.id === "active-rear-wing");
  assert.ok(component);
  const mode = component.modes.find((row) => row.modeType === "low_drag");
  assert.ok(mode);
  const effect = activeAeroModeToComponentEffect({ component, mode });
  assert.ok(effect);

  const result = calculateAerodynamicImpact({
    baseAeroProfile: {
      drag_coefficient_cd: 0.3,
      frontal_area_m2: 2,
      confidence_level: "medium",
      data_source_type: "published_spec",
    },
    selectedComponents: [{ id: component.id, label: component.name }],
    componentEffects: [effect],
    speedKmh: 160,
  });

  assert.equal(result.finalCd, 0.318);
  assert.equal(result.finalCda, 0.636);
  assert.equal(result.rearDownforceKg, 18);
  assert.ok(result.dragForceKg != null && result.dragForceKg > 76);
});

test("active front lip track mode contributes front downforce", () => {
  const component = DEFAULT_ACTIVE_AERO_COMPONENTS.find((row) => row.id === "active-front-lip");
  assert.ok(component);
  const mode = component.modes.find((row) => row.modeType === "track");
  assert.ok(mode);

  const summary = summarizeActiveAeroModes([{ component, mode }], 160);

  assert.equal(summary.deltaCd, 0.015);
  assert.equal(summary.frontDownforceKg, 18);
  assert.equal(summary.rearDownforceKg, 0);
  assert.equal(summary.totalDownforceKg, 18);
});
