/**
 * Sesiune demo — doar in browser (localStorage). Fără securitate reală; pentru prezentare / prototip.
 * Parolă: "demo" + orice e-mail valid. Salt JWT nu exista — nu folosi in productie reale.
 */
export const DEMO_SESSION_KEY = "garageSolutionsDemoSessionV1";

const SESSION_MS = 7 * 24 * 60 * 60 * 1000;

function isValidEmail(s) {
  return typeof s === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

export function getSession() {
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
  } catch (err) {
    return { ok: false, error: "Nu s-a putut salva sesiunea (stocare privata?)" };
  }
  return { ok: true, email: e, displayName: session.displayName };
}

/**
 * @returns {{ ok: true, email: string, displayName: string } | { ok: false, error: string }}
 */
export function loginDemo(email, password) {
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
  const e = (email || "").trim();
  if (!isValidEmail(e)) {
    return { ok: false, error: "Introdu un e-mail valid." };
  }
  const p = password || "";
  const c = passwordConfirm || "";
  if (p.length < 6) {
    return { ok: false, error: "Parola trebuie sa aibă cel puțin 6 caractere." };
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
  } catch {
    /* ignore */
  }
}
