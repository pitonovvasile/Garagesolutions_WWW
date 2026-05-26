/**
 * Stocare Supabase Auth: localStorage (principal) + oglindă în cookie-uri (Max-Age 1 an)
 * pentru recuperare dacă localStorage e golat și pentru cerința de persistență pe cookie.
 */

export const SITE_PERSIST_COOKIE_MAX_AGE_SEC = 365 * 24 * 60 * 60;

const CHUNK_CHARS = 3000;
const CHUNK_PREFIX = "gs_sbch_";

function cookieSuffixAttrs() {
  const secure = typeof location !== "undefined" && location.protocol === "https:" ? "; Secure" : "";
  return `; Path=/; Max-Age=${SITE_PERSIST_COOKIE_MAX_AGE_SEC}; SameSite=Lax${secure}`;
}

function readCookieRaw(name) {
  if (typeof document === "undefined" || !document.cookie) return null;
  const esc = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = document.cookie.match(new RegExp(`(?:^|; )${esc}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}

function writeCookieRaw(name, value) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=${encodeURIComponent(value)}${cookieSuffixAttrs()}`;
}

function deleteCookieRaw(name) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
}

function slugForStorageKey(key) {
  let h = 0;
  for (let i = 0; i < key.length; i += 1) {
    h = (Math.imul(31, h) + key.charCodeAt(i)) | 0;
  }
  return `h${(h >>> 0).toString(36)}`;
}

function clearChunkCookies(slug) {
  const nRaw = readCookieRaw(`${CHUNK_PREFIX}${slug}_n`);
  const n = nRaw ? parseInt(nRaw, 10) : 48;
  const lim = Number.isFinite(n) && n > 0 && n < 48 ? n : 48;
  for (let i = 0; i <= lim; i += 1) {
    deleteCookieRaw(`${CHUNK_PREFIX}${slug}_${i}`);
  }
  deleteCookieRaw(`${CHUNK_PREFIX}${slug}_n`);
}

function readChunks(slug) {
  const nRaw = readCookieRaw(`${CHUNK_PREFIX}${slug}_n`);
  if (!nRaw) return null;
  const n = parseInt(nRaw, 10);
  if (!Number.isFinite(n) || n < 1 || n > 40) return null;
  const parts = [];
  for (let i = 0; i < n; i += 1) {
    const c = readCookieRaw(`${CHUNK_PREFIX}${slug}_${i}`);
    if (c === null) return null;
    parts.push(c);
  }
  try {
    return parts.join("");
  } catch {
    return null;
  }
}

function writeChunks(slug, rawValue) {
  clearChunkCookies(slug);
  const chunks = [];
  for (let o = 0; o < rawValue.length; o += CHUNK_CHARS) {
    chunks.push(rawValue.slice(o, o + CHUNK_CHARS));
  }
  if (chunks.length === 0) chunks.push("");
  writeCookieRaw(`${CHUNK_PREFIX}${slug}_n`, String(chunks.length));
  chunks.forEach((c, i) => {
    writeCookieRaw(`${CHUNK_PREFIX}${slug}_${i}`, c);
  });
}

/**
 * @returns {object}
 */
export function createSupabaseCookieMirrorStorage() {
  const ls = globalThis.localStorage;
  return {
    getItem(key) {
      try {
        const v = ls.getItem(key);
        if (v != null) return v;
      } catch {
        /* ignore */
      }
      const slug = slugForStorageKey(key);
      const fromCookie = readChunks(slug);
      if (fromCookie != null) {
        try {
          ls.setItem(key, fromCookie);
        } catch {
          /* ignore */
        }
        return fromCookie;
      }
      return null;
    },
    setItem(key, value) {
      try {
        ls.setItem(key, value);
      } catch {
        /* ignore */
      }
      writeChunks(slugForStorageKey(key), value);
    },
    removeItem(key) {
      try {
        ls.removeItem(key);
      } catch {
        /* ignore */
      }
      clearChunkCookies(slugForStorageKey(key));
    },
  };
}
