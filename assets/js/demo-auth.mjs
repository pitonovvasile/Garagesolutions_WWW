/**
 * Sesiune demo — doar in browser (localStorage), doar pe localhost / loopback.
 * Fără securitate reală; pentru prezentare / prototip local.
 * Parolă: "demo" + orice e-mail valid. Contul real e pe cont.html (Supabase Auth).
 */
export const DEMO_SESSION_KEY = "garageSolutionsDemoSessionV1";
export const DEMO_SESSION_CHANGED_EVENT = "garageSolutionsDemoSessionChanged";

const SESSION_MS = 7 * 24 * 60 * 60 * 1000;

const DEMO_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

/** Demo auth e permis doar pe loopback — nu pe Pages / domenii publice. */
export function isDemoAuthAllowed() {
  if (typeof window === "undefined") return false;
  try {
    return DEMO_HOSTS.has(window.location.hostname);
  } catch {
    return false;
  }
}

function isValidEmail(s) {
  return typeof s === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

function clearDemoSessionSilent() {
  try {
    localStorage.removeItem(DEMO_SESSION_KEY);
  } catch {
    /* ignore */
  }
}

export function getSession() {
  if (!isDemoAuthAllowed()) {
    clearDemoSessionSilent();
    return null;
  }
  try {
    const raw = localStorage.getItem(DEMO_SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s || !s.email || !s.expiresAt) {
      return null;
    }
    if (s.expiresAt < Date.now()) {
      localStorage.removeItem(DEMO_SESSION_KEY);
      return null;
    }
    return s;
  } catch {
    return null;
  }
}

export function isLoggedIn() {
  return getSession() !== null;
}

/**
 * @returns {{ ok: true, email: string, displayName: string } | { ok: false, error: string }}
 */
function createSessionForEmail(e) {
  const at = e.indexOf("@");
  const displayName = e.slice(0, at) || "utilizator";
  const session = {
    email: e,
    displayName: displayName.charAt(0).toUpperCase() + displayName.slice(1).toLowerCase(),
    loginAt: Date.now(),
    expiresAt: Date.now() + SESSION_MS,
  };
  try {
    localStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(session));
    emitDemoSessionChanged();
  } catch (err) {
    return { ok: false, error: "Nu s-a putut salva sesiunea (stocare privata?)" };
  }
  return { ok: true, email: e, displayName: session.displayName };
}

function emitDemoSessionChanged() {
  try {
    window.dispatchEvent(new CustomEvent(DEMO_SESSION_CHANGED_EVENT));
  } catch (_) {}
}

export function setDemoSession(session) {
  if (!isDemoAuthAllowed()) return false;
  try {
    localStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(session));
    emitDemoSessionChanged();
    return true;
  } catch {
    return false;
  }
}

/**
 * @returns {{ ok: true, email: string, displayName: string } | { ok: false, error: string }}
 */
export function loginDemo(email, password) {
  if (!isDemoAuthAllowed()) {
    return {
      ok: false,
      error: "Autentificarea demo e disponibilă doar pe localhost. Folosește Contul meu (Supabase) pe cont.html.",
    };
  }
  const e = (email || "").trim();
  if (!isValidEmail(e)) {
    return { ok: false, error: "Introdu un e-mail valid." };
  }
  if ((password || "") !== "demo") {
    return { ok: false, error: 'Parola de demo este cuvantul: demo' };
  }
  return createSessionForEmail(e);
}

/**
 * Creare cont (demo, fără server): validează câmpurile și conectează automat.
 * La următoarea vizită, conectează-te cu același e-mail și parola **demo**.
 * @returns {{ ok: true, email: string, displayName: string } | { ok: false, error: string }}
 */
export function registerDemo(email, password, passwordConfirm) {
  if (!isDemoAuthAllowed()) {
    return {
      ok: false,
      error: "Înregistrarea demo e disponibilă doar pe localhost. Folosește Contul meu pe cont.html.",
    };
  }
  const e = (email || "").trim();
  if (!isValidEmail(e)) {
    return { ok: false, error: "Introdu un e-mail valid." };
  }
  const p = password || "";
  const c = passwordConfirm || "";
  if (p !== "demo") {
    return { ok: false, error: 'Parola de demo este cuvantul: demo' };
  }
  if (p !== c) {
    return { ok: false, error: "Parolele nu coincid." };
  }
  return createSessionForEmail(e);
}

/**
 * Recuperare parolă (demo): nu se trimite e-mail real.
 * @returns {{ ok: true, message: string } | { ok: false, error: string }}
 */
export function requestPasswordResetDemo(email) {
  if (!isDemoAuthAllowed()) {
    return { ok: false, error: "Resetarea demo e disponibilă doar pe localhost." };
  }
  const e = (email || "").trim();
  if (!isValidEmail(e)) {
    return { ok: false, error: "Introdu un e-mail valid." };
  }
  return {
    ok: true,
    message:
      "Dacă există un cont asociat acestui e-mail, vei primi un mesaj cu linkul de resetare. Verifică Inboxul și folderul Spam. (Mod demonstrație: nu se trimite niciun e-mail real.)",
  };
}

export function logoutDemo() {
  try {
    localStorage.removeItem(DEMO_SESSION_KEY);
    emitDemoSessionChanged();
  } catch {
    /* ignore */
  }
}
