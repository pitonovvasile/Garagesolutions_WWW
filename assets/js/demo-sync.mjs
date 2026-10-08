export const DEMO_SYNC_APPLIED_EVENT = "garageSolutionsDemoSyncApplied";
export const DEMO_SYNC_STATUS_EVENT = "garageSolutionsDemoSyncStatus";

export const DEMO_SYNC_KEYS = [
  "garageSolutionsDemoSessionV1",
  "garageSolutionsDemoAccountProfileV1",
  "garageSolutionsDemoDeliveryAddressesV1",
  "garageSolutionsSavedCars",
  "garageSolutionsCarPaintV1",
  "garageSolutionsSuspensionSavedConfigurationV1",
  "garageSolutionsCartV1",
  "garageSolutionsOwnedPartsV1",
  "garageSolutionsSuspensionSetupsV1",
  "garageSolutionsAeroBodySetupsV1",
];

const DEMO_SYNC_ENDPOINT = "/__garage_demo_sync";
const DEMO_SYNC_META_KEY = "garageSolutionsDemoSyncMetaV1";
const SYNC_KEY_SET = new Set(DEMO_SYNC_KEYS);

let installed = false;
let applyingRemote = false;
let initialSyncPromise = null;
let pushTimer = 0;
let lastPushedJson = "";

const nativeSetItem = Storage.prototype.setItem;
const nativeRemoveItem = Storage.prototype.removeItem;

function emitStatus(detail) {
  try {
    window.dispatchEvent(new CustomEvent(DEMO_SYNC_STATUS_EVENT, { detail }));
  } catch (_) {}
}

function emitApplied() {
  try {
    window.dispatchEvent(new CustomEvent(DEMO_SYNC_APPLIED_EVENT));
    window.dispatchEvent(new CustomEvent("garageSolutionsDemoSessionChanged"));
    window.dispatchEvent(new CustomEvent("garageSolutionsGarageCarsChanged"));
    window.dispatchEvent(new CustomEvent("garage-suspension-config-saved"));
    window.dispatchEvent(new CustomEvent("garage-cart-updated"));
    window.dispatchEvent(new CustomEvent("garage-owned-updated"));
    window.dispatchEvent(new CustomEvent("garage-setups-updated"));
    window.dispatchEvent(new CustomEvent("garage-aero-body-setups-updated"));
  } catch (_) {}
}

function readMeta() {
  try {
    const raw = nativeGet(DEMO_SYNC_META_KEY);
    const meta = raw ? JSON.parse(raw) : null;
    return meta && Number.isFinite(Number(meta.revision)) ? meta : null;
  } catch {
    return null;
  }
}

function writeMeta(revision) {
  try {
    nativeSetItem.call(localStorage, DEMO_SYNC_META_KEY, JSON.stringify({ revision: Number(revision) || 0 }));
  } catch (_) {}
}

function nativeGet(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function collectLocalSnapshot() {
  const out = {};
  for (const key of DEMO_SYNC_KEYS) {
    const raw = nativeGet(key);
    if (typeof raw === "string") out[key] = raw;
  }
  return out;
}

function safeParse(raw, fallback) {
  if (typeof raw !== "string" || !raw.trim()) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function stringify(value) {
  return JSON.stringify(value);
}

function isObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function timestampOf(row) {
  if (!row || typeof row !== "object") return 0;
  for (const key of ["updatedAt", "updated_at", "savedAt", "saved_at", "createdAt", "created_at", "loginAt"]) {
    const value = row[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim()) {
      const t = Date.parse(value);
      if (Number.isFinite(t)) return t;
    }
  }
  return 0;
}

function mergePlainObject(remoteRaw, localRaw) {
  const remote = safeParse(remoteRaw, {});
  const local = safeParse(localRaw, {});
  if (!isObject(remote) && !isObject(local)) return null;
  return stringify({ ...(isObject(remote) ? remote : {}), ...(isObject(local) ? local : {}) });
}

function mergeSession(remoteRaw, localRaw) {
  const remote = safeParse(remoteRaw, null);
  const local = safeParse(localRaw, null);
  if (!remote && !local) return null;
  if (!remote) return stringify(local);
  if (!local) return stringify(remote);
  return stringify(timestampOf(local) >= timestampOf(remote) ? local : remote);
}

function rowId(row, fallbackKey) {
  if (!row || typeof row !== "object") return "";
  if (row.id != null) return `id:${String(row.id)}`;
  if (row.savedVehicleId != null) return `saved:${String(row.savedVehicleId)}`;
  return fallbackKey(row);
}

function carFallbackKey(row) {
  if (!row || typeof row !== "object") return "";
  return [
    row.brand || row.make || row.marca,
    row.model || row.modelName,
    row.engine,
    row.bodyType || row.body_type,
    row.catalogGenerationId || row.catalog_generation_id,
    row.catalogVariantId || row.catalog_variant_id || row.bmwVariantId || row.bmw_variant_id,
    row.catalogConfigurationId || row.catalog_configuration_id || row.bmwConfigurationId || row.bmw_configuration_id,
  ]
    .map((v) => String(v || "").trim().toLowerCase())
    .join("\0");
}

function addressFallbackKey(row) {
  return [
    row?.label,
    row?.recipient_name,
    row?.phone,
    row?.street,
    row?.address_line2,
    row?.city,
    row?.county,
    row?.postal_code,
  ]
    .map((v) => String(v || "").trim().toLowerCase())
    .join("\0");
}

function mergeArrayByIdentity(remoteRaw, localRaw, fallbackKey, opts = {}) {
  const remote = safeParse(remoteRaw, []);
  const local = safeParse(localRaw, []);
  const useRowId = opts.useRowId !== false;
  const out = [];
  const seen = new Map();
  const add = (row, preferLocal = false) => {
    if (!row || typeof row !== "object") return;
    const key = useRowId ? rowId(row, fallbackKey) : fallbackKey(row);
    if (!key || key.replace(/\0/g, "") === "") return;
    const currentIndex = seen.get(key);
    if (currentIndex == null) {
      seen.set(key, out.length);
      out.push(row);
      return;
    }
    const current = out[currentIndex];
    const nextTime = timestampOf(row);
    const currentTime = timestampOf(current);
    if (preferLocal || nextTime >= currentTime) out[currentIndex] = row;
  };
  if (Array.isArray(remote)) remote.forEach((row) => add(row, false));
  if (Array.isArray(local)) local.forEach((row) => add(row, true));
  return out.length ? stringify(out) : stringify([]);
}

function mergeStringArray(remoteRaw, localRaw) {
  const remote = safeParse(remoteRaw, []);
  const local = safeParse(localRaw, []);
  return stringify([...new Set([...(Array.isArray(remote) ? remote : []), ...(Array.isArray(local) ? local : [])])]);
}

function mergeSyncData(remoteData, localData) {
  const merged = {};
  for (const key of DEMO_SYNC_KEYS) {
    const remoteRaw = remoteData?.[key];
    const localRaw = localData?.[key];
    if (remoteRaw == null && localRaw == null) continue;

    if (key === "garageSolutionsDemoSessionV1") {
      merged[key] = mergeSession(remoteRaw, localRaw);
    } else if (key === "garageSolutionsDemoAccountProfileV1") {
      merged[key] = mergePlainObject(remoteRaw, localRaw);
    } else if (key === "garageSolutionsDemoDeliveryAddressesV1") {
      merged[key] = mergeArrayByIdentity(remoteRaw, localRaw, addressFallbackKey);
    } else if (key === "garageSolutionsSavedCars") {
      merged[key] = mergeArrayByIdentity(remoteRaw, localRaw, carFallbackKey, { useRowId: false });
    } else if (key === "garageSolutionsOwnedPartsV1") {
      merged[key] = mergeStringArray(remoteRaw, localRaw);
    } else if (
      key === "garageSolutionsCarPaintV1" ||
      key === "garageSolutionsSuspensionSavedConfigurationV1"
    ) {
      merged[key] = mergePlainObject(remoteRaw, localRaw);
    } else if (
      key === "garageSolutionsCartV1" ||
      key === "garageSolutionsSuspensionSetupsV1" ||
      key === "garageSolutionsAeroBodySetupsV1"
    ) {
      merged[key] = mergeArrayByIdentity(remoteRaw, localRaw, (row) => String(row?.productId || row?.id || ""));
    } else {
      merged[key] = localRaw ?? remoteRaw;
    }
  }
  return Object.fromEntries(Object.entries(merged).filter(([, value]) => typeof value === "string"));
}

function applySnapshot(snapshot, { authoritative = false } = {}) {
  applyingRemote = true;
  try {
    for (const key of DEMO_SYNC_KEYS) {
      if (typeof snapshot?.[key] === "string") {
        nativeSetItem.call(localStorage, key, snapshot[key]);
      } else if (authoritative) {
        nativeRemoveItem.call(localStorage, key);
      }
    }
  } finally {
    applyingRemote = false;
  }
  emitApplied();
}

async function fetchRemoteSnapshot() {
  const res = await fetch(DEMO_SYNC_ENDPOINT, { cache: "no-store" });
  if (!res.ok) throw new Error(`Sync ${res.status}`);
  const data = await res.json();
  return data && typeof data === "object" ? data : { revision: 0, data: {} };
}

async function putRemoteSnapshot(snapshot) {
  const json = JSON.stringify(snapshot);
  if (json === lastPushedJson) {
    const meta = readMeta();
    return { revision: meta?.revision || 0, data: snapshot };
  }
  const res = await fetch(DEMO_SYNC_ENDPOINT, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode: "replace", source: location.href, data: snapshot }),
  });
  if (!res.ok) throw new Error(`Sync ${res.status}`);
  const data = await res.json();
  lastPushedJson = json;
  return data;
}

export async function pullDemoSyncNow() {
  try {
    const remote = await fetchRemoteSnapshot();
    const remoteData = remote.data && typeof remote.data === "object" ? remote.data : {};
    const localData = collectLocalSnapshot();
    const meta = readMeta();

    if (meta && Number(remote.revision) > Number(meta.revision)) {
      applySnapshot(remoteData, { authoritative: true });
      writeMeta(remote.revision);
      emitStatus({ ok: true, mode: "pull", revision: remote.revision });
      return remoteData;
    }

    const merged = mergeSyncData(remoteData, localData);
    applySnapshot(merged, { authoritative: true });
    if (JSON.stringify(merged) !== JSON.stringify(remoteData)) {
      const pushed = await putRemoteSnapshot(merged);
      writeMeta(pushed.revision);
      emitStatus({ ok: true, mode: "merge-push", revision: pushed.revision });
    } else {
      writeMeta(remote.revision || 0);
      emitStatus({ ok: true, mode: "pull-current", revision: remote.revision || 0 });
    }
    return merged;
  } catch (e) {
    emitStatus({ ok: false, mode: "pull", error: e?.message || String(e) });
    return collectLocalSnapshot();
  }
}

export async function pushDemoSyncNow() {
  try {
    const snapshot = collectLocalSnapshot();
    const pushed = await putRemoteSnapshot(snapshot);
    writeMeta(pushed.revision);
    emitStatus({ ok: true, mode: "push", revision: pushed.revision });
    return pushed;
  } catch (e) {
    emitStatus({ ok: false, mode: "push", error: e?.message || String(e) });
    return null;
  }
}

function schedulePush() {
  if (applyingRemote) return;
  window.clearTimeout(pushTimer);
  pushTimer = window.setTimeout(() => {
    void pushDemoSyncNow();
  }, 250);
}

function isLocalStorageTarget(target) {
  return target === localStorage;
}

function installLocalStorageHooks() {
  if (installed || typeof window === "undefined" || !window.localStorage) return;
  installed = true;
  Storage.prototype.setItem = function patchedSetItem(key, value) {
    const result = nativeSetItem.call(this, key, value);
    if (isLocalStorageTarget(this) && SYNC_KEY_SET.has(String(key))) schedulePush();
    return result;
  };
  Storage.prototype.removeItem = function patchedRemoveItem(key) {
    const result = nativeRemoveItem.call(this, key);
    if (isLocalStorageTarget(this) && SYNC_KEY_SET.has(String(key))) schedulePush();
    return result;
  };
  window.addEventListener("storage", (e) => {
    if (SYNC_KEY_SET.has(String(e.key || ""))) schedulePush();
  });
  for (const ev of [
    "garageSolutionsGarageCarsChanged",
    "garage-suspension-config-saved",
    "garage-cart-updated",
    "garage-owned-updated",
    "garage-setups-updated",
    "garage-aero-body-setups-updated",
  ]) {
    window.addEventListener(ev, schedulePush);
  }
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void pullDemoSyncNow();
  });
  window.addEventListener("focus", () => {
    void pullDemoSyncNow();
  });
}

export function initDemoSync() {
  // The demo sync endpoint belongs to the local preview server. Public Pages
  // deployments keep each visitor's demo data in that browser's localStorage.
  if (!["localhost", "127.0.0.1", "::1", "[::1]"].includes(window.location.hostname)) {
    return Promise.resolve(collectLocalSnapshot());
  }
  installLocalStorageHooks();
  initialSyncPromise ||= pullDemoSyncNow();
  try {
    window.__garageDemoSync = {
      pull: pullDemoSyncNow,
      push: pushDemoSyncNow,
      snapshot: collectLocalSnapshot,
      keys: DEMO_SYNC_KEYS,
    };
  } catch (_) {}
  return initialSyncPromise;
}
