/**
 * Saved body aero setups (components + upgrade plan) per vehicle template + garage slot.
 */

import type { AeroBodyComponentRow } from "../data/aeroBodyComponents";

export const AERO_BODY_SAVED_SETUPS_KEY = "garageSolutionsAeroBodySetupsV1";
export const AERO_BODY_SETUPS_UPDATED_EVENT = "garage-aero-body-setups-updated";

export type AeroBodySetupKind = "current" | "upgrade" | "full";

export interface SavedAeroBodySetup {
  id: string;
  label: string;
  createdAt: number;
  updatedAt: number;
  vehicleTemplateId: string;
  garageCarIndex: number | null;
  kind: AeroBodySetupKind;
  components: AeroBodyComponentRow[];
}

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function readAll(): SavedAeroBodySetup[] {
  if (typeof window === "undefined") return [];
  const raw = safeParse<SavedAeroBodySetup[]>(localStorage.getItem(AERO_BODY_SAVED_SETUPS_KEY), []);
  return Array.isArray(raw) ? raw.filter((r) => r && typeof r.id === "string" && Array.isArray(r.components)) : [];
}

function writeAll(list: SavedAeroBodySetup[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(AERO_BODY_SAVED_SETUPS_KEY, JSON.stringify(list));
  } catch {
    /* quota */
  }
  window.dispatchEvent(new CustomEvent(AERO_BODY_SETUPS_UPDATED_EVENT));
}

export function readSavedAeroBodySetups(): SavedAeroBodySetup[] {
  return readAll().sort((a, b) => b.updatedAt - a.updatedAt);
}

export function readSavedAeroBodySetupsForVehicle(
  vehicleTemplateId: string,
  garageCarIndex: number | null,
): SavedAeroBodySetup[] {
  return readSavedAeroBodySetups().filter(
    (r) => r.vehicleTemplateId === vehicleTemplateId && r.garageCarIndex === garageCarIndex,
  );
}

export function readSavedAeroBodySetupById(id: string): SavedAeroBodySetup | null {
  return readAll().find((r) => r.id === id) ?? null;
}

export function appendSavedAeroBodySetup(setup: SavedAeroBodySetup): void {
  const list = readAll();
  list.push(setup);
  writeAll(list);
}

export function updateSavedAeroBodySetup(id: string, patch: Partial<Pick<SavedAeroBodySetup, "label">>): void {
  const list = readAll();
  const i = list.findIndex((r) => r.id === id);
  if (i < 0) return;
  list[i] = { ...list[i]!, ...patch, updatedAt: Date.now() };
  writeAll(list);
}

export function deleteSavedAeroBodySetup(id: string): void {
  writeAll(readAll().filter((r) => r.id !== id));
}

export function buildDefaultAeroSetupLabel(kind: AeroBodySetupKind): string {
  const ts = new Date().toLocaleString("ro-RO", { dateStyle: "short", timeStyle: "short" });
  switch (kind) {
    case "current":
      return `Current body — ${ts}`;
    case "upgrade":
      return `Upgrade plan — ${ts}`;
    default:
      return `Body aero — ${ts}`;
  }
}

export function newSavedAeroBodySetupId(): string {
  return `aero-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function kindLabel(kind: AeroBodySetupKind): string {
  switch (kind) {
    case "current":
      return "Current body";
    case "upgrade":
      return "Upgrade plan";
    default:
      return "Full setup";
  }
}
