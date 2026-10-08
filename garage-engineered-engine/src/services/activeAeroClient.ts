import {
  DEFAULT_ACTIVE_AERO_COMPONENTS,
  type ActiveAeroComponent,
  type ActiveAeroMode,
  type ActiveAeroModeEffect,
} from "../lib/activeAero";
import type { AeroConfidenceLevel, AeroDataSourceType } from "../lib/aerodynamicImpact";
import { getSiteSupabaseClient } from "../lib/supabaseSiteClient";

type ActiveAeroComponentRow = {
  id: string;
  name: string;
  component_type: string;
  position: string;
  is_active_aero?: boolean | null;
  description?: string | null;
};

type ActiveAeroModeRow = {
  id: string;
  aero_component_id: string;
  name: string;
  mode_type: string;
  angle_deg?: number | string | null;
  deployment_percent?: number | string | null;
  is_default?: boolean | null;
  description?: string | null;
  sort_order?: number | string | null;
};

type ActiveAeroModeEffectRow = {
  id: string;
  aero_component_mode_id: string;
  speed_kmh?: number | string | null;
  delta_cd?: number | string | null;
  delta_front_downforce_kg?: number | string | null;
  delta_rear_downforce_kg?: number | string | null;
  confidence_level?: AeroConfidenceLevel | null;
  data_source_type?: AeroDataSourceType | null;
  calculation_method?: string | null;
  source_name?: string | null;
};

export type ActiveAeroDataResult = {
  components: ActiveAeroComponent[];
  source: "supabase" | "fallback";
  error: string | null;
};

function toNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(String(value).replace(",", ".").trim());
  return Number.isFinite(n) ? n : null;
}

function fallback(error: string | null = null): ActiveAeroDataResult {
  return {
    components: DEFAULT_ACTIVE_AERO_COMPONENTS.map((component) => ({
      ...component,
      modes: component.modes.map((mode) => ({
        ...mode,
        effects: mode.effects.map((modeEffect) => ({ ...modeEffect })),
      })),
    })),
    source: "fallback",
    error,
  };
}

function mapEffect(row: ActiveAeroModeEffectRow): ActiveAeroModeEffect {
  return {
    id: row.id,
    aeroComponentModeId: row.aero_component_mode_id,
    speedKmh: toNumber(row.speed_kmh) ?? 160,
    deltaCd: toNumber(row.delta_cd),
    deltaFrontDownforceKg: toNumber(row.delta_front_downforce_kg),
    deltaRearDownforceKg: toNumber(row.delta_rear_downforce_kg),
    confidenceLevel: row.confidence_level ?? "unknown",
    dataSourceType: row.data_source_type ?? "unknown",
    calculationMethod: row.calculation_method ?? null,
    sourceName: row.source_name ?? null,
  };
}

function modeSortValue(row: ActiveAeroModeRow): number {
  return toNumber(row.sort_order) ?? (row.is_default ? -1 : 100);
}

export async function fetchActiveAeroData(): Promise<ActiveAeroDataResult> {
  try {
    const sb = getSiteSupabaseClient();
    const { data: componentRows, error: componentError } = await sb
      .from("aero_component")
      .select("id, name, component_type, position, is_active_aero, description")
      .eq("is_active_aero", true)
      .limit(100);

    if (componentError) return fallback(componentError.message);

    const components = (componentRows ?? []) as ActiveAeroComponentRow[];
    if (!components.length) return fallback("No active aero components found");

    const componentIds = components.map((component) => component.id);
    const { data: modeRows, error: modeError } = await sb
      .from("aero_component_mode")
      .select("id, aero_component_id, name, mode_type, angle_deg, deployment_percent, is_default, description, sort_order")
      .in("aero_component_id", componentIds)
      .limit(500);

    if (modeError) return fallback(modeError.message);

    const modes = ((modeRows ?? []) as ActiveAeroModeRow[]).sort((a, b) => modeSortValue(a) - modeSortValue(b));
    if (!modes.length) return fallback("No active aero modes found");

    const modeIds = modes.map((mode) => mode.id);
    const { data: effectRows, error: effectError } = await sb
      .from("aero_component_mode_effect")
      .select(
        "id, aero_component_mode_id, speed_kmh, delta_cd, delta_front_downforce_kg, delta_rear_downforce_kg, confidence_level, data_source_type, calculation_method, source_name",
      )
      .in("aero_component_mode_id", modeIds)
      .limit(500);

    if (effectError) return fallback(effectError.message);

    const effectsByMode = new Map<string, ActiveAeroModeEffect[]>();
    for (const effectRow of (effectRows ?? []) as ActiveAeroModeEffectRow[]) {
      const mapped = mapEffect(effectRow);
      const list = effectsByMode.get(mapped.aeroComponentModeId) ?? [];
      list.push(mapped);
      effectsByMode.set(mapped.aeroComponentModeId, list);
    }

    const modesByComponent = new Map<string, ActiveAeroMode[]>();
    for (const modeRow of modes) {
      const mode: ActiveAeroMode = {
        id: modeRow.id,
        aeroComponentId: modeRow.aero_component_id,
        name: modeRow.name,
        modeType: modeRow.mode_type,
        angleDeg: toNumber(modeRow.angle_deg),
        deploymentPercent: toNumber(modeRow.deployment_percent),
        isDefault: modeRow.is_default === true,
        description: modeRow.description ?? null,
        effects: effectsByMode.get(modeRow.id) ?? [],
      };
      const list = modesByComponent.get(mode.aeroComponentId) ?? [];
      list.push(mode);
      modesByComponent.set(mode.aeroComponentId, list);
    }

    const activeComponents = components
      .map((row) => ({
        id: row.id,
        name: row.name,
        componentType: row.component_type,
        position: row.position,
        isActiveAero: row.is_active_aero === true,
        description: row.description ?? null,
        modes: modesByComponent.get(row.id) ?? [],
      }))
      .filter((component) => component.modes.length > 0);

    if (!activeComponents.length) return fallback("Active aero components have no modes");

    return {
      components: activeComponents,
      source: "supabase",
      error: null,
    };
  } catch (error) {
    return fallback(error instanceof Error ? error.message : "Active aero data unavailable");
  }
}
