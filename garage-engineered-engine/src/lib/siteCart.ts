/**
 * Shared cart / owned inventory / saved setups for Garage ↔ Suspension module.
 * Keys mirror static site conventions so a future shop bundle can reuse them.
 */
export const CART_STORAGE_KEY = "garageSolutionsCartV1";
export const OWNED_PARTS_STORAGE_KEY = "garageSolutionsOwnedPartsV1";
export const SAVED_SUSPENSION_SETUPS_KEY = "garageSolutionsSuspensionSetupsV1";

export interface CartLine {
  productId: string;
  qty: number;
  addedAt: number;
}

export interface SavedSuspensionSetup {
  id: string;
  label: string;
  createdAt: number;
  vehicleId: string;
  axle: "front" | "rear";
  goal: string | null;
  pathMode?: "preset" | "custom";
  presetId?: string | null;
  springRateNmm: number;
  springStrokeMm: number;
  damperStrokeMm: number;
  damperLinearDampingCoeff: number;
  damperDigressive: boolean;
  plateRangeDeg: number | null;
  travelMm: number;
}

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function readCartLines(): CartLine[] {
  if (typeof window === "undefined") return [];
  const lines = safeParse<CartLine[]>(localStorage.getItem(CART_STORAGE_KEY), []);
  return Array.isArray(lines) ? lines.filter((l) => l && typeof l.productId === "string") : [];
}

export function writeCartLines(lines: CartLine[]): void {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(lines));
  } catch {
    /* quota */
  }
  window.dispatchEvent(new CustomEvent("garage-cart-updated"));
}

export function addProductToCart(productId: string, qty = 1): void {
  const lines = readCartLines();
  const i = lines.findIndex((l) => l.productId === productId);
  if (i >= 0) lines[i] = { ...lines[i]!, qty: Math.max(1, lines[i]!.qty + qty), addedAt: Date.now() };
  else lines.push({ productId, qty: Math.max(1, qty), addedAt: Date.now() });
  writeCartLines(lines);
}

export function readOwnedProductIds(): string[] {
  if (typeof window === "undefined") return [];
  const raw = safeParse<string[]>(localStorage.getItem(OWNED_PARTS_STORAGE_KEY), []);
  return Array.isArray(raw) ? raw.filter((id) => typeof id === "string") : [];
}

export function writeOwnedProductIds(ids: string[]): void {
  try {
    localStorage.setItem(OWNED_PARTS_STORAGE_KEY, JSON.stringify([...new Set(ids)]));
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent("garage-owned-updated"));
}

export function markProductOwned(productId: string, owned: boolean): void {
  const set = new Set(readOwnedProductIds());
  if (owned) set.add(productId);
  else set.delete(productId);
  writeOwnedProductIds([...set]);
}

export function readSavedSetups(): SavedSuspensionSetup[] {
  if (typeof window === "undefined") return [];
  const raw = safeParse<SavedSuspensionSetup[]>(localStorage.getItem(SAVED_SUSPENSION_SETUPS_KEY), []);
  return Array.isArray(raw) ? raw : [];
}

export function writeSavedSetups(list: SavedSuspensionSetup[]): void {
  try {
    localStorage.setItem(SAVED_SUSPENSION_SETUPS_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent("garage-setups-updated"));
}

export function isOwnedOrInCart(productId: string): boolean {
  return readOwnedProductIds().includes(productId) || readCartLines().some((l) => l.productId === productId);
}
