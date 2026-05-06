export const GARAGE_STORAGE_KEY = "garageSolutionsSavedCars";
export const GARAGE_TRANSFER_KEY = "garageSolutionsSavedCarsTransfer";
export const GARAGE_BROADCAST_CHANNEL = "garageSolutionsGarageV1";

export interface SavedGarageCar {
  brand: string;
  model?: string;
  engine?: string;
  bodyType?: string;
  [key: string]: unknown;
}

function parseCarList(raw: string | null): SavedGarageCar[] {
  if (!raw || typeof raw !== "string") return [];
  try {
    const p = JSON.parse(raw) as unknown;
    if (!Array.isArray(p)) return [];
    return p.filter((c): c is SavedGarageCar => {
      if (!c || typeof c !== "object") return false;
      const brand = typeof (c as SavedGarageCar).brand === "string" ? (c as SavedGarageCar).brand.trim() : "";
      return brand.length > 0;
    });
  } catch {
    return [];
  }
}

function carKey(c: SavedGarageCar): string {
  return [c.brand, c.model ?? "", c.engine ?? ""]
    .map((s) => String(s || "").trim().toLowerCase())
    .join("\0");
}

function uniqueMerge(listA: SavedGarageCar[], listB: SavedGarageCar[]): SavedGarageCar[] {
  const out: SavedGarageCar[] = [];
  const seen = new Set<string>();
  for (const c of [...listA, ...listB]) {
    const k = carKey(c);
    if (!k || k === "\0\0\0") continue;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(c);
  }
  return out;
}

const EMPTY_GARAGE_SNAPSHOT: SavedGarageCar[] = [];
let _garageSnapshotSig = "";
let _garageSnapshotRef: SavedGarageCar[] = EMPTY_GARAGE_SNAPSHOT;

/**
 * Mirrors `assets/js/garage-saved-cars.mjs` — merge transfer + localStorage, persist, clear transfer.
 * Păstrează aceeași referință de tablou cât timp datele sunt identice — cerut de `useSyncExternalStore`.
 */
export function readSavedCars(): SavedGarageCar[] {
  if (typeof window === "undefined" || typeof localStorage === "undefined") {
    return EMPTY_GARAGE_SNAPSHOT;
  }

  const stored = parseCarList(localStorage.getItem(GARAGE_STORAGE_KEY));
  const transfer = parseCarList(sessionStorage.getItem(GARAGE_TRANSFER_KEY));
  const merged = uniqueMerge(transfer, stored);

  try {
    if (merged.length > 0) {
      const serialized = JSON.stringify(merged);
      if (localStorage.getItem(GARAGE_STORAGE_KEY) !== serialized) {
        localStorage.setItem(GARAGE_STORAGE_KEY, serialized);
      }
    }
  } catch (e) {
    console.warn("[suspension] readSavedCars: could not persist localStorage", e);
  }

  try {
    sessionStorage.removeItem(GARAGE_TRANSFER_KEY);
  } catch {
    /* ignore */
  }

  const sig = JSON.stringify(merged);
  if (sig === _garageSnapshotSig) {
    return _garageSnapshotRef;
  }

  _garageSnapshotSig = sig;
  _garageSnapshotRef = merged.length === 0 ? EMPTY_GARAGE_SNAPSHOT : merged;

  return _garageSnapshotRef;
}


export function subscribeGarageCars(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  const onStorage = (e: StorageEvent) => {
    if (e.key === GARAGE_STORAGE_KEY || e.key === GARAGE_TRANSFER_KEY || e.key === null) {
      onStoreChange();
    }
  };
  window.addEventListener("storage", onStorage);

  const ch =
    typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(GARAGE_BROADCAST_CHANNEL) : null;

  const onMsg = (e: MessageEvent) => {
    if (e?.data?.type === "garage-cars-updated") onStoreChange();
  };
  ch?.addEventListener("message", onMsg);

  return () => {
    window.removeEventListener("storage", onStorage);
    ch?.removeEventListener("message", onMsg);
    ch?.close();
  };
}

/** Map saved shop/garage row → closest stock geometry preset id. */
export function guessVehicleTemplateId(car: SavedGarageCar): string {
  const brand = String(car.brand || "").toLowerCase();
  const model = String(car.model || "").toLowerCase();
  const engine = String(car.engine || "").toLowerCase();
  const blob = `${brand} ${model} ${engine}`;

  const isBmw = brand.includes("bmw") || /\bbmw\b/.test(blob);
  if (isBmw) {
    if (/\be46\b|e46|330i|328i|325i|323i|320d|318i|316i|m3/.test(blob) && !/g80/.test(blob)) {
      return "bmw-e46";
    }
    if (/\bm2\b|f87|g87/.test(blob)) return "bmw-m2";
  }

  return "generic-dw";
}

export function formatSavedCarLabel(car: SavedGarageCar, index: number): string {
  const parts = [car.brand, car.model, car.engine].filter(
    (x): x is string => typeof x === "string" && x.trim().length > 0,
  );
  const core = parts.length ? parts.join(" · ") : car.brand;
  return `${index + 1}. ${core}`;
}
