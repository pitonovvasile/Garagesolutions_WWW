import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./supabase-config.mjs";
import { createSupabaseCookieMirrorStorage } from "./supabase-session-cookie-mirror.mjs";
import { onGarageCarsUpdated, readSavedCars, writeSavedCars } from "./garage-saved-cars.mjs";
import { syncGarageFromCloudAndLocal, pushLocalGarageToCloud } from "./garage-cloud-sync.mjs";
import { garageOemSuspensionFromCar } from "./garage-oem-suspension.mjs";
import { getBrandLogoUrl } from "./brand-logo-fallbacks.mjs";
import {
  ensureRoGeoData,
  injectCountyDatalistOnce,
  normalizeBucharestCountyCity,
  wireAddressCardGeo,
} from "./ro-address-geo.mjs";

const elGate = document.getElementById("cont-auth-gate");
const elApp = document.getElementById("cont-app");
const contAuthError = document.getElementById("cont-auth-error");
const contForgotToggle = document.getElementById("cont-forgot-toggle");
const contRecoveryRequestForm = document.getElementById("cont-recovery-request-form");
const contRecoveryCancel = document.getElementById("cont-recovery-cancel");
const contRecoveryMsg = document.getElementById("cont-recovery-message");
const contResetPanel = document.getElementById("cont-reset-password-panel");
const contResetForm = document.getElementById("cont-reset-password-form");
const contResetMsg = document.getElementById("cont-reset-password-message");
const contResetDismiss = document.getElementById("cont-reset-password-dismiss");
const contWelcomeSection = document.getElementById("cont-welcome-section");
const contWelcomeCopy = document.getElementById("cont-welcome-copy");
const contWelcomeSteps = document.getElementById("cont-welcome-steps");
const contWelcomeDismiss = document.getElementById("cont-welcome-dismiss");
const contWelcomeProfile = document.getElementById("cont-welcome-profile");
const contWelcomeDelivery = document.getElementById("cont-welcome-delivery");
const contFormMsg = document.getElementById("cont-form-message");
const contPwdMsg = document.getElementById("cont-password-message");
const contDeliveryMsg = document.getElementById("cont-delivery-message");
const contBillingMsg = document.getElementById("cont-billing-message");
const contGarageCarsMsg = document.getElementById("cont-garage-cars-message");
const deliveryListEl = document.getElementById("delivery-addresses-list");
const deliveryAddBtn = document.getElementById("delivery-add-btn");
const deliveryEmptyHint = document.getElementById("delivery-empty-hint");
const savedCarsListEl = document.getElementById("cont-saved-cars-list");
const savedCarsEmptyHintEl = document.getElementById("cont-saved-cars-empty");
const savedCarsClearBtn = document.getElementById("cont-saved-cars-clear-btn");
const savedCarsAsideEl = document.getElementById("cont-saved-cars-aside");
const savedCarsRailEl = document.getElementById("cont-saved-cars-rail");
const billingForm = document.getElementById("cont-billing-form");
const billTypeEl = document.getElementById("bill-type");
const billPfWrap = document.getElementById("bill-pf-wrap");
const billPjWrap = document.getElementById("bill-pj-wrap");

const loginForm = document.getElementById("cont-login-form");
const registerForm = document.getElementById("cont-register-form");
const profileForm = document.getElementById("cont-profile-form");
const contProfileEditBtn = document.getElementById("cont-profile-edit-btn");
const contProfileCancelBtn = document.getElementById("cont-profile-cancel-btn");
const passwordForm = document.getElementById("cont-password-form");
const signOutBtn = document.getElementById("cont-sign-out-btn");
const contHeaderEmail = document.getElementById("cont-header-email");
const contConnectMeta = document.getElementById("cont-connect-meta");
const headerUserLabel = document.getElementById("header-user-label");
const headerFavoritesWrap = document.getElementById("header-favorites-wrap");
const headerIdentityBtn = document.getElementById("header-identity-btn");

const fieldActivity = document.getElementById("profile-activity");
const wrapCompany = document.getElementById("profile-company-wrap");

const inpPwd = document.getElementById("cont-pwd-new");
const inpPwd2 = document.getElementById("cont-pwd-confirm");
const inpProfileEmail = document.getElementById("cont-profile-email");
const RECONFIGURE_CAR_KEY = "garageSolutionsReconfigureCarV1";
const RECONFIGURE_CAR_EDIT_CONTEXT_KEY = "garageSolutionsReconfigureCarEditContextV1";
const WELCOME_DISMISSED_PREFIX = "garageSolutionsWelcomeDismissedV1:";
const WELCOME_PENDING_REASON_KEY = "garageSolutionsWelcomePendingReasonV1";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: createSupabaseCookieMirrorStorage(),
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

const welcomeState = {
  user: null,
  profile: null,
  deliveryCount: 0,
};

let passwordRecoveryMode = false;

function setMsg(el, text, isError) {
  if (!el) return;
  if (!text) {
    el.textContent = "";
    el.hidden = true;
    el.classList.remove("cont-message--error", "cont-message--ok");
    return;
  }
  el.textContent = text;
  el.hidden = false;
  el.classList.toggle("cont-message--error", Boolean(isError));
  el.classList.toggle("cont-message--ok", !isError);
}

function currentAccountRedirectUrl() {
  const url = new URL(window.location.href);
  url.search = "";
  url.hash = "";
  return url.toString();
}

function urlLooksLikePasswordRecovery() {
  const params = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(String(window.location.hash || "").replace(/^#/, ""));
  return params.get("type") === "recovery" || hash.get("type") === "recovery";
}

function clearSensitiveAuthUrlParts() {
  if (!window.history?.replaceState) return;
  const url = new URL(window.location.href);
  url.searchParams.delete("type");
  url.searchParams.delete("access_token");
  url.searchParams.delete("refresh_token");
  url.searchParams.delete("expires_in");
  url.searchParams.delete("token_type");
  url.searchParams.delete("error");
  url.searchParams.delete("error_code");
  url.searchParams.delete("error_description");
  url.hash = "";
  window.history.replaceState({}, document.title, url.toString());
}

function setRecoveryRequestVisible(visible) {
  if (contRecoveryRequestForm) contRecoveryRequestForm.hidden = !visible;
  if (contForgotToggle) contForgotToggle.hidden = visible;
  if (visible) {
    const loginEmail = loginForm?.querySelector('input[name="email"]')?.value || "";
    const recoveryEmail = contRecoveryRequestForm?.querySelector('input[name="email"]');
    if (recoveryEmail && loginEmail && !recoveryEmail.value) recoveryEmail.value = loginEmail;
    recoveryEmail?.focus();
  } else {
    setMsg(contRecoveryMsg, "", false);
  }
}

function setResetPanelVisible(visible, message = "") {
  if (contResetPanel) contResetPanel.hidden = !visible;
  if (visible) {
    setMsg(contResetMsg, message, false);
    requestAnimationFrame(() => contResetPanel?.scrollIntoView({ behavior: "smooth", block: "start" }));
  } else {
    setMsg(contResetMsg, "", false);
  }
}

function displayNameForHeader(user) {
  const meta = user?.user_metadata && typeof user.user_metadata === "object" ? user.user_metadata : {};
  const fullName = [meta.first_name, meta.last_name]
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .filter(Boolean)
    .join(" ");
  if (fullName) return fullName;
  if (typeof user?.displayName === "string" && user.displayName.trim()) return user.displayName.trim();
  const email = typeof user?.email === "string" ? user.email.trim() : "";
  return email ? email.split("@")[0] : "Contul meu";
}

function syncHeaderWithAccountSession(user) {
  const label = user ? displayNameForHeader(user) : "Contul meu";
  if (headerUserLabel) headerUserLabel.textContent = label;
  if (headerFavoritesWrap) headerFavoritesWrap.hidden = !user;
  if (headerIdentityBtn) {
    headerIdentityBtn.setAttribute(
      "aria-label",
      user ? `Deschide contul pentru ${label}` : "Deschide autentificarea contului",
    );
  }
}

function formatSupabaseErr(err) {
  if (!err) return "Eroare necunoscută.";
  const parts = [err.message, err.details, err.hint].filter(Boolean);
  return parts.join(" — ");
}

/** Sesiune locală mai fiabilă decât getUser() la click rapid după login. */
async function getContAuthUser() {
  const { data: s, error: se } = await supabase.auth.getSession();
  if (se) return { user: null, error: se.message };
  const fromSession = s?.session?.user;
  if (fromSession) return { user: fromSession, error: null };
  const { data: gu, error: ue } = await supabase.auth.getUser();
  if (ue) return { user: null, error: ue.message };
  if (gu?.user) return { user: gu.user, error: null };
  return { user: null, error: null };
}

/** @type {(() => void) | null} */
let teardownContNavSpy = null;
/** Re-evaluare highlight nav după layout (ex. liste încărcate async). */
let refreshContNavFromScroll = () => {};

/** Linie de referință (px): ultima secțiune cu top ≤ marker devine activă. Aliniat cu scroll-margin pe ancore. */
function contNavScrollMarkerPx() {
  const el = document.getElementById("cont-profile-section");
  if (el) {
    const sm = parseFloat(getComputedStyle(el).scrollMarginTop);
    if (Number.isFinite(sm) && sm > 0) return Math.round(sm + 8);
  }
  const root = document.documentElement;
  const raw = getComputedStyle(root).getPropertyValue("--header-height-hero-apex").trim();
  if (raw) {
    const probe = document.createElement("div");
    probe.style.cssText = `position:absolute;visibility:hidden;height:${raw};width:0;pointer-events:none`;
    document.body.appendChild(probe);
    const h = probe.getBoundingClientRect().height;
    probe.remove();
    if (Number.isFinite(h) && h > 0) return Math.round(h + 12);
  }
  return 100;
}

function setupContSectionNavSpy() {
  teardownContNavSpy?.();
  teardownContNavSpy = null;
  const nav = document.querySelector(".cont-app-nav");
  if (!nav || elApp?.hidden) return;
  const links = [...nav.querySelectorAll("a.cont-app-nav__link")];
  const sections = links
    .map((a) => {
      const href = a.getAttribute("href");
      if (!href || !href.startsWith("#")) return null;
      return document.querySelector(href);
    })
    .filter(Boolean);
  if (!sections.length) return;

  const setActive = (id) => {
    links.forEach((l) => l.classList.toggle("is-active", l.getAttribute("href") === `#${id}`));
  };

  const updateActiveFromScroll = () => {
    const marker = contNavScrollMarkerPx();
    const docBottom = window.scrollY + window.innerHeight;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight - 2;
    if (maxScroll > 40 && docBottom >= maxScroll + 40) {
      const last = sections[sections.length - 1];
      if (last?.id) setActive(last.id);
      return;
    }
    let chosen = sections[0];
    for (let i = sections.length - 1; i >= 0; i -= 1) {
      const el = sections[i];
      const top = el.getBoundingClientRect().top;
      if (top <= marker) {
        chosen = el;
        break;
      }
    }
    if (chosen?.id) setActive(chosen.id);
  };

  refreshContNavFromScroll = updateActiveFromScroll;

  let ticking = false;
  const onScrollOrResize = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      updateActiveFromScroll();
    });
  };

  const scrollMarginTopPx = (el) => {
    const v = parseFloat(getComputedStyle(el).scrollMarginTop);
    return Number.isFinite(v) ? v : 0;
  };

  const ac = new AbortController();
  const { signal } = ac;

  nav.addEventListener(
    "click",
    (ev) => {
      const a = ev.target.closest("a.cont-app-nav__link");
      if (!a || !nav.contains(a)) return;
      const href = a.getAttribute("href");
      if (!href || !href.startsWith("#")) return;
      const target = document.querySelector(href);
      if (!target) return;
      ev.preventDefault();
      const extra = scrollMarginTopPx(target);
      const y = target.getBoundingClientRect().top + window.scrollY - extra;
      window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
      const id = target.id;
      if (id) setActive(id);
    },
    { signal },
  );

  window.addEventListener("scroll", onScrollOrResize, { passive: true, signal });
  window.addEventListener("resize", onScrollOrResize, { passive: true, signal });
  teardownContNavSpy = () => {
    ac.abort();
    links.forEach((l) => l.classList.remove("is-active"));
    refreshContNavFromScroll = () => {};
  };
  onScrollOrResize();
}

function showView(session) {
  if (session) {
    if (elGate) elGate.hidden = true;
    if (elApp) elApp.hidden = false;
    requestAnimationFrame(() => requestAnimationFrame(() => setupContSectionNavSpy()));
  } else {
    teardownContNavSpy?.();
    teardownContNavSpy = null;
    refreshContNavFromScroll = () => {};
    if (elGate) elGate.hidden = false;
    if (elApp) elApp.hidden = true;
  }
}

function toggleCompanyField() {
  if (!fieldActivity || !wrapCompany) return;
  const v = fieldActivity.value;
  wrapCompany.hidden = v !== "juridica";
  const companyInp = document.getElementById("profile-company");
  if (companyInp) companyInp.required = v === "juridica";
}

fieldActivity?.addEventListener("change", toggleCompanyField);

function toggleBillFields() {
  const t = billTypeEl?.value || "";
  if (billPfWrap) billPfWrap.hidden = t !== "fizica";
  if (billPjWrap) billPjWrap.hidden = t !== "juridica";
}

billTypeEl?.addEventListener("change", toggleBillFields);

async function ensureProfileRow(user) {
  const { data, error } = await supabase.from("profiles").select("id").eq("id", user.id).maybeSingle();
  if (error) throw error;
  if (!data) {
    const { error: e2 } = await supabase.from("profiles").insert({ id: user.id });
    if (e2 && e2.code !== "23505") throw e2;
  }
}

function applyAuthMetadataToProfileFields(user) {
  const meta =
    user?.user_metadata && typeof user.user_metadata === "object" ? user.user_metadata : {};
  const fnEl = document.getElementById("profile-first-name");
  const lnEl = document.getElementById("profile-last-name");
  if (!fnEl || !lnEl) return;
  const hasFn = () => String(fnEl.value || "").trim().length > 0;
  const hasLn = () => String(lnEl.value || "").trim().length > 0;
  if (!hasLn() && meta.last_name) lnEl.value = String(meta.last_name).trim();
  if (!hasFn() && meta.first_name) fnEl.value = String(meta.first_name).trim();
  if (!hasLn() && meta.family_name) lnEl.value = String(meta.family_name).trim();
  if (!hasFn() && meta.given_name) fnEl.value = String(meta.given_name).trim();
  const combinedName = meta.full_name || meta.name || user?.displayName;
  if (!hasFn() && !hasLn() && combinedName) {
    const parts = String(combinedName).trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      lnEl.value = parts[0];
      fnEl.value = parts.slice(1).join(" ");
    } else if (parts.length === 1) {
      fnEl.value = parts[0];
    }
  }
}

function setProfileFormLocked(locked) {
  const form = document.getElementById("cont-profile-form");
  if (!form) return;
  form
    .querySelectorAll('input:not([type="submit"]):not([type="button"]), select, textarea')
    .forEach((el) => {
      el.disabled = locked;
    });
  const submitBtn = form.querySelector('button[type="submit"]');
  if (submitBtn) submitBtn.disabled = locked;
  if (contProfileEditBtn) {
    contProfileEditBtn.hidden = !locked;
  }
  if (contProfileCancelBtn) {
    contProfileCancelBtn.hidden = locked;
  }
  form.classList.toggle("cont-profile-form--locked", locked);
}

function fillForm(row) {
  const set = (id, v) => {
    const n = document.getElementById(id);
    if (n) n.value = v ?? "";
  };
  set("profile-last-name", row.last_name);
  set("profile-first-name", row.first_name);
  set("profile-birth", row.birth_date);
  if (fieldActivity) {
    fieldActivity.value = row.activity_type || "";
  }
  set("profile-company", row.company_name);
  set("profile-website", row.website);
  set("how-heard", row.how_heard);
  const nl = document.getElementById("profile-newsletter-yes");
  const nn = document.getElementById("profile-newsletter-no");
  if (row.newsletter === true) {
    if (nl) nl.checked = true;
  } else {
    if (nn) nn.checked = true;
  }
  toggleCompanyField();
}

function fillFormBilling(row) {
  if (billTypeEl) {
    billTypeEl.value = row.bill_type || "";
  }
  const set = (id, v) => {
    const n = document.getElementById(id);
    if (n) n.value = v ?? "";
  };
  set("bill-pf-last", row.bill_pf_last_name);
  set("bill-pf-first", row.bill_pf_first_name);
  set("bill-pf-cnp", row.bill_pf_cnp);
  set("bill-pf-county", row.bill_pf_county);
  set("bill-pf-city", row.bill_pf_city);
  set("bill-pf-street", row.bill_pf_street);
  set("bill-pf-postal", row.bill_pf_postal);
  set("bill-pj-denumire", row.bill_pj_denumire);
  set("bill-pj-cui", row.bill_pj_cui);
  set("bill-pj-reg", row.bill_pj_reg_com);
  set("bill-pj-county", row.bill_pj_county);
  set("bill-pj-city", row.bill_pj_city);
  set("bill-pj-street", row.bill_pj_street);
  set("bill-pj-postal", row.bill_pj_postal);
  set("bill-pj-bank", row.bill_pj_bank);
  set("bill-pj-iban", row.bill_pj_iban);
  set("bill-pj-contact", row.bill_pj_contact);
  toggleBillFields();
}

const PROFILE_BILLING_SELECT = [
  "first_name, last_name, birth_date, activity_type, company_name, how_heard, website, newsletter,",
  "bill_type, bill_pf_last_name, bill_pf_first_name, bill_pf_cnp, bill_pf_county, bill_pf_city, bill_pf_street, bill_pf_postal,",
  "bill_pj_denumire, bill_pj_cui, bill_pj_reg_com, bill_pj_county, bill_pj_city, bill_pj_street, bill_pj_postal, bill_pj_bank, bill_pj_iban, bill_pj_contact",
].join(" ");

function welcomeDismissKey(user) {
  return `${WELCOME_DISMISSED_PREFIX}${user?.id || user?.email || "anonymous"}`;
}

function isWelcomeDismissed(user) {
  try {
    return localStorage.getItem(welcomeDismissKey(user)) === "1";
  } catch {
    return false;
  }
}

function markWelcomeDismissed(user) {
  try {
    localStorage.setItem(welcomeDismissKey(user), "1");
  } catch {
    /* ignore */
  }
}

function profileIsComplete(row) {
  if (!row) return false;
  const hasName = Boolean(String(row.first_name || "").trim() && String(row.last_name || "").trim());
  const hasActivity = Boolean(String(row.activity_type || "").trim());
  const hasCompanyIfNeeded = row.activity_type !== "juridica" || Boolean(String(row.company_name || "").trim());
  return hasName && hasActivity && hasCompanyIfNeeded;
}

function renderWelcomeFlow(user = welcomeState.user, profile = welcomeState.profile) {
  if (!contWelcomeSection || !contWelcomeSteps) return;
  welcomeState.user = user || welcomeState.user;
  welcomeState.profile = profile || welcomeState.profile;
  const activeUser = welcomeState.user;
  if (!activeUser) {
    contWelcomeSection.hidden = true;
    return;
  }

  const carsCount = readSavedCars().length;
  const steps = [
    {
      title: "Profil",
      copy: "Nume, prenume și tip cont completate.",
      complete: profileIsComplete(welcomeState.profile),
    },
    {
      title: "Garaj",
      copy: carsCount ? `${carsCount} mașină/mașini salvate.` : "Salvează prima mașină pentru filtrări rapide.",
      complete: carsCount > 0,
    },
    {
      title: "Livrare",
      copy: welcomeState.deliveryCount
        ? `${welcomeState.deliveryCount} adresă/adrese salvate.`
        : "Adaugă o adresă ca să pregătim checkout-ul.",
      complete: welcomeState.deliveryCount > 0,
    },
  ];
  const allComplete = steps.every((step) => step.complete);
  let pendingReason = "";
  try {
    pendingReason = sessionStorage.getItem(WELCOME_PENDING_REASON_KEY) || "";
  } catch {
    pendingReason = "";
  }
  if (allComplete && !pendingReason) {
    contWelcomeSection.hidden = true;
    return;
  }
  if (isWelcomeDismissed(activeUser) && !pendingReason) {
    contWelcomeSection.hidden = true;
    return;
  }

  if (contWelcomeCopy) {
    contWelcomeCopy.textContent =
      pendingReason === "registered"
        ? "Contul a fost creat. Următorii pași leagă profilul, garajul și livrarea de contul tău."
        : "Completează datele de bază ca să putem lega rapid mașinile, adresele și comenzile de contul tău.";
  }

  contWelcomeSteps.innerHTML = "";
  steps.forEach((step) => {
    const li = document.createElement("li");
    li.className = `cont-welcome-step${step.complete ? " is-complete" : ""}`;
    li.innerHTML = `<strong>${escAttr(step.title)}</strong><span>${escAttr(step.copy)}</span>`;
    contWelcomeSteps.appendChild(li);
  });
  contWelcomeSection.hidden = false;
}

function encodeAddrPayload(ar) {
  try {
    return btoa(unescape(encodeURIComponent(JSON.stringify(ar))));
  } catch (_) {
    return "";
  }
}

function decodeAddrPayload(s) {
  if (!s) return null;
  try {
    return JSON.parse(decodeURIComponent(escape(atob(s))));
  } catch (_) {
    return null;
  }
}

/** O singură bucată de text pentru rezumat; max. 2 rânduri în CSS (line-clamp). */
function formatAddressSummary(ar) {
  const segs = [];
  const name = String(ar.recipient_name || "").trim();
  const phone = String(ar.phone || "").trim();
  if (name && phone) segs.push(`${name} · ${phone}`);
  else if (name || phone) segs.push(name || phone);
  const streetLine = [ar.street, ar.address_line2]
    .map((x) => String(x || "").trim())
    .filter(Boolean)
    .join(", ");
  if (streetLine) segs.push(streetLine);
  const cityPart = [ar.city, ar.county]
    .map((x) => String(x || "").trim())
    .filter(Boolean)
    .join(", ");
  const postPart = [String(ar.postal_code || "").trim(), String(ar.country || "RO").trim() || "RO"]
    .filter(Boolean)
    .join(" ");
  const tail = [cityPart, postPart].filter(Boolean).join(" · ");
  if (tail) segs.push(tail);
  return segs.join(" · ") || "Adresă incompletă";
}

/**
 * @param {object|null} addr
 * @param {object} _user
 * @param {{ variant?: "form" }} [opts] — pentru rând salvat: implicit rezumat; `form` = același formular ca la adăugare
 */
function buildAddressCard(addr, _user, opts = {}) {
  const isNew = !addr?.id;
  const ar = isNew
    ? {
        id: null,
        label: "",
        recipient_name: "",
        phone: "",
        street: "",
        address_line2: "",
        city: "",
        county: "",
        postal_code: "",
        country: "RO",
        is_default: false,
      }
    : { ...addr };

  const variant = isNew ? "form" : opts.variant === "form" ? "form" : "summary";

  const el = document.createElement("article");
  el.className =
    variant === "summary" ? "cont-addr-card cont-addr-card--summary" : "cont-addr-card";
  el.dataset.draft = isNew ? "1" : "0";
  if (!isNew) {
    el.dataset.id = ar.id;
    el.dataset.addrPayload = encodeAddrPayload(ar);
  }

  const title = (ar.label || "").trim() || (isNew ? "Adresă nouă" : "Adresă fără etichetă");

  if (variant === "summary") {
    el.innerHTML = `
    <div class="cont-addr-card__head">
      <h3 class="cont-addr-card__h">${escAttr(title)}</h3>
      ${ar.is_default ? '<span class="cont-addr-card__def">Implicită</span>' : ""}
    </div>
    <div class="cont-addr-card__body cont-addr-card__body--summary">
      <p class="cont-addr-card__summary">${escAttr(formatAddressSummary(ar))}</p>
    </div>
    <div class="cont-addr-card__actions">
      <button type="button" class="cont-btn cont-btn--secondary" data-delivery-action="edit">Editează</button>
      <button type="button" class="cont-btn cont-btn--ghost" data-delivery-action="delete">Șterge adresa</button>
    </div>
  `;
    return el;
  }

  const actionsHtml = isNew
    ? `<button type="button" class="cont-btn cont-btn--primary" data-delivery-action="save">Salvează adresa</button>
        <button type="button" class="cont-btn cont-btn--ghost" data-delivery-action="cancel">Renunță</button>`
    : `<button type="button" class="cont-btn cont-btn--primary" data-delivery-action="save">Salvează adresa</button>
        <button type="button" class="cont-btn cont-btn--ghost" data-delivery-action="discard">Renunță</button>
        <button type="button" class="cont-btn cont-btn--ghost" data-delivery-action="delete">Șterge adresa</button>`;

  el.innerHTML = `
    <div class="cont-addr-card__head">
      <h3 class="cont-addr-card__h">${escAttr(title)}</h3>
      ${ar.is_default && !isNew ? '<span class="cont-addr-card__def">Implicită</span>' : ""}
    </div>
    <div class="cont-addr-card__body">
      <div class="cont-form cont-form--2col">
        <label class="cont-field cont-field--full">
          <span class="cont-field__label">Etichetă (ex. Acasă, Service)</span>
          <input class="cont-input cont-addr__label" type="text" value="${escAttr(ar.label)}" maxlength="80" />
        </label>
        <label class="cont-field">
          <span class="cont-field__label">Nume destinatar</span>
          <input class="cont-input cont-addr__recipient" type="text" value="${escAttr(ar.recipient_name)}" />
        </label>
        <label class="cont-field">
          <span class="cont-field__label">Telefon</span>
          <input class="cont-input cont-addr__phone" type="tel" value="${escAttr(ar.phone)}" />
        </label>
        <label class="cont-field cont-field--full">
          <span class="cont-field__label">Stradă, număr</span>
          <input class="cont-input cont-addr__street" type="text" required value="${escAttr(ar.street)}" />
        </label>
        <label class="cont-field cont-field--full">
          <span class="cont-field__label">Complement (bloc, sc., et., ap.)</span>
          <input class="cont-input cont-addr__line2" type="text" value="${escAttr(ar.address_line2)}" />
        </label>
        <label class="cont-field">
          <span class="cont-field__label">Localitate <span class="cont-req">*</span></span>
          <div class="cont-addr-city-wrap">
            <input class="cont-input cont-addr__city" type="text" required value="${escAttr(ar.city)}" autocomplete="off" spellcheck="false" placeholder="Oraș / localitate (ex. București)" aria-autocomplete="list" aria-expanded="false" />
            <ul class="cont-addr-city-sug" role="listbox" hidden></ul>
          </div>
        </label>
        <label class="cont-field">
          <span class="cont-field__label">Județ / sector</span>
          <input class="cont-input cont-addr__county" type="text" value="${escAttr(ar.county)}" list="ro-county-sector-datalist" autocomplete="off" placeholder="Județ sau Sectorul 1–6 (pentru București)" />
        </label>
        <label class="cont-field">
          <span class="cont-field__label">Cod poștal</span>
          <input class="cont-input cont-addr__postal" type="text" value="${escAttr(ar.postal_code)}" inputmode="numeric" />
        </label>
        <label class="cont-field">
          <span class="cont-field__label">Țară</span>
          <input class="cont-input cont-addr__country" type="text" value="${escAttr(ar.country || "RO")}" />
        </label>
        <label class="cont-field cont-field--full cont-addr__defaultline">
          <input class="cont-addr__default" type="checkbox" ${ar.is_default ? "checked" : ""} />
          <span>Adresă implicită de livrare (celelalte devin ne-implicite)</span>
        </label>
      </div>
      <div class="cont-addr-card__actions">
        ${actionsHtml}
      </div>
    </div>
  `;
  return el;
}

function escAttr(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatSavedCar(car) {
  return [car?.brand, car?.model, car?.engine].filter(Boolean).join(" | ");
}

function parseEngineMetrics(engineText) {
  const raw = String(engineText || "");
  const kw = raw.match(/(\d+(?:[.,]\d+)?)\s*KW\b/i)?.[1]?.replace(",", ".") || "";
  const cp = raw.match(/(\d+(?:[.,]\d+)?)\s*CP\b/i)?.[1]?.replace(",", ".") || "";
  const nm = raw.match(/(\d+(?:[.,]\d+)?)\s*NM\b/i)?.[1]?.replace(",", ".") || "";
  return { kw, cp, nm };
}

function toPartsSummaryFromSavedCar(car) {
  const engine = String(car?.engine || "").trim();
  const metrics = parseEngineMetrics(engine);
  return {
    brand: String(car?.brand || "").trim(),
    model: String(car?.model || "").trim(),
    generation: String(car?.generation || car?.gen || "").trim(),
    body: String(car?.body || car?.bodyType || car?.body_style || "").trim(),
    engine,
    gearbox: String(car?.gearbox || car?.transmission || "").trim(),
    drivetrain: String(car?.drivetrain || car?.drive || "").trim(),
    differential: String(car?.differential || "").trim(),
    powerKw: String(car?.powerKw || metrics.kw || "").trim(),
    powerCp: String(car?.powerCp || metrics.cp || "").trim(),
    torqueNm: String(car?.torqueNm || metrics.nm || "").trim(),
    productionYears: String(car?.productionYears || car?.years || "").trim(),
    brandLogoUrl: String(car?.brandLogoUrl || getBrandLogoUrl(car?.brand) || "").trim(),
  };
}

/** VIN dacă există pe obiect (câmpuri uzuale); normalizat 8–17 caractere alfanumerice. */
function savedCarVin(car) {
  const raw = car?.vin ?? car?.VIN ?? car?.vehicleVin ?? car?.frameVin;
  const s = String(raw || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  return s.length >= 8 && s.length <= 17 ? s : "";
}

function savedCarProductionYears(car) {
  return String(car?.productionYears || car?.years || "").trim();
}

function buildGarageRailPreviewHtml(car, index) {
  const summary = toPartsSummaryFromSavedCar(car);
  const logoUrl = String(summary.brandLogoUrl || getBrandLogoUrl(car?.brand) || "").trim();
  const brand = String(car?.brand || "").trim();
  const model = String(car?.model || "").trim();
  const engine = String(car?.engine || summary.engine || "").trim();
  const years = savedCarProductionYears(car);
  const vin = savedCarVin(car);
  const initials = (brand.slice(0, 2).toUpperCase() || "?").slice(0, 2);
  const chips = [];
  if (engine) chips.push(`<span class="cont-garage-preview__chip">${escAttr(engine)}</span>`);
  if (years) chips.push(`<span class="cont-garage-preview__chip">${escAttr(years)}</span>`);
  if (vin) chips.push(`<span class="cont-garage-preview__chip cont-garage-preview__chip--vin">VIN · ${escAttr(vin)}</span>`);
  const oem = garageOemSuspensionFromCar(car);
  const oemFront = oem.front || "—";
  const oemRear = oem.rear || "—";
  const metaInner =
    chips.join("") ||
    '<span class="cont-garage-preview__muted">Fără detalii suplimentare</span>';
  const logoBlock = logoUrl
    ? `<img class="cont-garage-preview__logo" src="${escAttr(logoUrl)}" width="96" height="96" alt="" loading="lazy" decoding="async" />`
    : `<span class="cont-garage-preview__logo-fallback" aria-hidden="true">${escAttr(initials)}</span>`;
  const modelLine = [brand, model].filter(Boolean).join(" · ");
  return `
    <article class="cont-garage-preview" data-garage-preview-index="${index}">
      <div class="cont-garage-preview__logo-wrap">${logoBlock}</div>
      <p class="cont-garage-preview__model">${escAttr(modelLine || `Mașina ${index + 1}`)}</p>
      <p class="cont-garage-preview__oem" title="Din catalog rezolvat (user_saved_vehicles_resolved)">OEM suspensie: față ${escAttr(oemFront)} · spate ${escAttr(oemRear)}</p>
      <div class="cont-garage-preview__meta">${metaInner}</div>
    </article>
  `;
}

function openPartsListForSavedCar(car) {
  const summary = toPartsSummaryFromSavedCar(car);
  try {
    sessionStorage.setItem("garageSolutionsSelectedVehicleSummaryV1", JSON.stringify(summary));
  } catch (_) {}
  const params = new URLSearchParams();
  Object.entries(summary).forEach(([k, v]) => {
    const s = String(v || "").trim();
    if (s) params.set(k, s);
  });
  const qs = params.toString();
  window.location.assign(`lista-piese.html${qs ? `?${qs}` : ""}`);
}

function openConfiguratorForSavedCarEdit(car, index) {
  const summary = toPartsSummaryFromSavedCar(car);
  try {
    sessionStorage.setItem(RECONFIGURE_CAR_KEY, JSON.stringify(summary));
    sessionStorage.setItem(
      RECONFIGURE_CAR_EDIT_CONTEXT_KEY,
      JSON.stringify({
        index,
        savedAt: String(car?.savedAt || "").trim(),
        brand: String(car?.brand || "").trim(),
        model: String(car?.model || "").trim(),
        engine: String(car?.engine || "").trim(),
      })
    );
  } catch (_) {}
  window.location.assign("index.html#vehicle-config-section");
}

function renderSavedCarsForAccount() {
  if (!savedCarsListEl) return;
  const cars = readSavedCars();
  savedCarsListEl.innerHTML = "";
  if (savedCarsRailEl) savedCarsRailEl.innerHTML = "";

  if (!cars.length) {
    if (savedCarsEmptyHintEl) savedCarsEmptyHintEl.hidden = false;
    if (savedCarsClearBtn) savedCarsClearBtn.disabled = true;
    if (savedCarsAsideEl) savedCarsAsideEl.hidden = true;
    renderWelcomeFlow();
    requestAnimationFrame(() => refreshContNavFromScroll());
    return;
  }
  if (savedCarsEmptyHintEl) savedCarsEmptyHintEl.hidden = true;
  if (savedCarsClearBtn) savedCarsClearBtn.disabled = false;
  if (savedCarsAsideEl) savedCarsAsideEl.hidden = false;
  if (savedCarsRailEl) {
    savedCarsRailEl.innerHTML = cars.map((c, i) => buildGarageRailPreviewHtml(c, i)).join("");
  }
  cars.forEach((car, index) => {
    const li = document.createElement("li");
    li.className = "cont-addr-card cont-garage-saved-card";
    li.dataset.savedCarIndex = String(index);
    const title = formatSavedCar(car) || `Mașina ${index + 1}`;
    const oem = garageOemSuspensionFromCar(car);
    const oemFront = oem.front || "—";
    const oemRear = oem.rear || "—";
    li.innerHTML = `
      <div class="cont-addr-card__head">
        <h3 class="cont-addr-card__h">${escAttr(title)}</h3>
      </div>
      <p class="cont-garage-saved-card__oem">OEM suspensie: față ${escAttr(oemFront)} · spate ${escAttr(oemRear)}</p>
      <div class="cont-addr-card__actions">
        <button type="button" class="cont-btn cont-btn--secondary" data-saved-car-parts="${index}">Lista piese</button>
        <button type="button" class="cont-btn cont-btn--secondary" data-saved-car-edit="${index}">Editează</button>
        <button type="button" class="cont-btn cont-btn--ghost" data-saved-car-delete="${index}">Șterge</button>
      </div>
    `;
    savedCarsListEl.appendChild(li);
  });
  renderWelcomeFlow();
  requestAnimationFrame(() => refreshContNavFromScroll());
}

function readAddressCard(card) {
  return {
    label: card.querySelector(".cont-addr__label")?.value?.trim() || null,
    recipient_name: card.querySelector(".cont-addr__recipient")?.value?.trim() || null,
    phone: card.querySelector(".cont-addr__phone")?.value?.trim() || null,
    street: card.querySelector(".cont-addr__street")?.value?.trim() || "",
    address_line2: card.querySelector(".cont-addr__line2")?.value?.trim() || null,
    city: card.querySelector(".cont-addr__city")?.value?.trim() || "",
    county: card.querySelector(".cont-addr__county")?.value?.trim() || null,
    postal_code: card.querySelector(".cont-addr__postal")?.value?.trim() || null,
    country: (card.querySelector(".cont-addr__country")?.value || "RO").trim() || "RO",
    is_default: card.querySelector(".cont-addr__default")?.checked === true,
  };
}

let deliveryListBound = false;

function bindDeliveryListOnce() {
  if (deliveryListBound || !deliveryListEl) return;
  deliveryListBound = true;
  deliveryListEl.addEventListener("click", (ev) => {
    const btn = ev.target.closest("[data-delivery-action]");
    if (!btn || !deliveryListEl.contains(btn)) return;
    const action = btn.getAttribute("data-delivery-action");
    const card = btn.closest(".cont-addr-card");
    if (!card) return;
    (async () => {
      try {
        const { user, error: authErr } = await getContAuthUser();
        if (!user) {
          setMsg(
            contDeliveryMsg,
            authErr || "Nu ești autentificat. Reîncarcă pagina și conectează-te din nou.",
            true
          );
          return;
        }
        if (action === "save") {
          await saveAddressCard(card, user);
          return;
        }
        if (action === "edit") {
          const row = decodeAddrPayload(card.dataset.addrPayload);
          if (!row?.id) return;
          const formCard = buildAddressCard(row, user, { variant: "form" });
          card.replaceWith(formCard);
          try {
            injectCountyDatalistOnce();
            await ensureRoGeoData();
          } catch (_) {}
          if (formCard.querySelector(".cont-addr__city")) wireAddressCardGeo(formCard);
          return;
        }
        if (action === "discard") {
          if (!card.dataset.id || !card.dataset.addrPayload) return;
          const row = decodeAddrPayload(card.dataset.addrPayload);
          if (!row?.id) return;
          const summaryCard = buildAddressCard(row, user);
          card.replaceWith(summaryCard);
          return;
        }
        if (action === "delete") {
          if (!card.dataset.id) return;
          if (!confirm("Ștergi definitiv această adresă de livrare?")) return;
          setMsg(contDeliveryMsg, "", false);
          const { error } = await supabase
            .from("delivery_addresses")
            .delete()
            .eq("id", card.dataset.id)
            .eq("user_id", user.id);
          if (error) {
            setMsg(contDeliveryMsg, formatSupabaseErr(error), true);
            return;
          }
          setMsg(contDeliveryMsg, "Adresa a fost ștearsă.", false);
          await loadDeliveryAddresses(user);
          return;
        }
        if (action === "cancel") {
          if (card.dataset.id) return;
          card.remove();
          syncDeliveryEmpty();
        }
      } catch (e) {
        setMsg(contDeliveryMsg, e?.message || String(e), true);
      }
    })();
  });
}

function syncDeliveryEmpty() {
  if (!deliveryListEl || !deliveryEmptyHint) return;
  const n = deliveryListEl.querySelectorAll(".cont-addr-card").length;
  if (n > 0) {
    deliveryEmptyHint.hidden = true;
    deliveryEmptyHint.setAttribute("hidden", "");
  } else {
    deliveryEmptyHint.removeAttribute("hidden");
    deliveryEmptyHint.hidden = false;
  }
}

async function saveAddressCard(card, user) {
  const countyInput = card.querySelector(".cont-addr__county");
  const cityInput = card.querySelector(".cont-addr__city");
  normalizeBucharestCountyCity(countyInput, cityInput);
  const partial = readAddressCard(card);
  if (!partial.street || !partial.city) {
    setMsg(
      contDeliveryMsg,
      "Completează strada și localitatea. Pentru București: la localitate „București”, apoi la „Județ / sector” alege sectorul (sau folosește lista de localități după ce ai completat județul).",
      true
    );
    return;
  }
  setMsg(contDeliveryMsg, "", false);
  if (partial.is_default) {
    const { error: defErr } = await supabase
      .from("delivery_addresses")
      .update({ is_default: false })
      .eq("user_id", user.id);
    if (defErr) {
      setMsg(contDeliveryMsg, formatSupabaseErr(defErr), true);
      return;
    }
  }
  const id = card.dataset.id;
  if (id) {
    const { error } = await supabase
      .from("delivery_addresses")
      .update(partial)
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) {
      setMsg(contDeliveryMsg, formatSupabaseErr(error), true);
      return;
    }
  } else {
    const { error } = await supabase
      .from("delivery_addresses")
      .insert({ user_id: user.id, ...partial })
      .select("id");
    if (error) {
      setMsg(contDeliveryMsg, formatSupabaseErr(error), true);
      return;
    }
  }
  await loadDeliveryAddresses(user);
  setMsg(contDeliveryMsg, "Adresa de livrare a fost salvată.", false);
}

async function loadDeliveryAddresses(user) {
  if (!deliveryListEl) return;
  bindDeliveryListOnce();
  setMsg(contDeliveryMsg, "", false);
  const { data, error } = await supabase
    .from("delivery_addresses")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });
  if (error) {
    setMsg(
      contDeliveryMsg,
      `Adrese livrare: ${formatSupabaseErr(error)} (asigură-te că rulezi migrarea 002 în Supabase)`,
      true
    );
    deliveryListEl.innerHTML = "";
    welcomeState.deliveryCount = 0;
    renderWelcomeFlow(user);
    syncDeliveryEmpty();
    return;
  }
  const rows = data || [];
  welcomeState.deliveryCount = rows.length;
  try {
    injectCountyDatalistOnce();
    await ensureRoGeoData();
  } catch (e) {
    setMsg(contDeliveryMsg, `Listă localități: ${e?.message || String(e)}`, true);
  }
  deliveryListEl.innerHTML = "";
  rows.forEach((r) => {
    const card = buildAddressCard(r, user);
    deliveryListEl.appendChild(card);
    if (card.querySelector(".cont-addr__city")) wireAddressCardGeo(card);
  });
  renderWelcomeFlow(user);
  syncDeliveryEmpty();
}

deliveryAddBtn?.addEventListener("click", () => {
  (async () => {
    try {
      const { user, error: authErr } = await getContAuthUser();
      if (!user || !deliveryListEl) {
        if (authErr) setMsg(contDeliveryMsg, authErr, true);
        return;
      }
      const card = buildAddressCard(null, user);
      deliveryListEl.appendChild(card);
      try {
        injectCountyDatalistOnce();
        await ensureRoGeoData();
      } catch (_) {}
      if (card.querySelector(".cont-addr__city")) wireAddressCardGeo(card);
      syncDeliveryEmpty();
    } catch (e) {
      setMsg(contDeliveryMsg, e?.message || String(e), true);
    }
  })();
});

contForgotToggle?.addEventListener("click", () => {
  setRecoveryRequestVisible(true);
});

contRecoveryCancel?.addEventListener("click", () => {
  setRecoveryRequestVisible(false);
});

contRecoveryRequestForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  setMsg(contRecoveryMsg, "", false);
  const fd = new FormData(contRecoveryRequestForm);
  const email = (fd.get("email") || "").toString().trim();
  if (!email) {
    setMsg(contRecoveryMsg, "Introdu adresa de e-mail a contului.", true);
    return;
  }
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: currentAccountRedirectUrl(),
  });
  if (error) {
    setMsg(contRecoveryMsg, formatSupabaseErr(error), true);
    return;
  }
  setMsg(
    contRecoveryMsg,
    "Dacă e-mailul există în platformă, vei primi un link de resetare. Verifică și folderul Spam.",
    false
  );
});

contResetForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  setMsg(contResetMsg, "", false);
  const fd = new FormData(contResetForm);
  const p1 = (fd.get("password") || "").toString();
  const p2 = (fd.get("password2") || "").toString();
  if (p1.length < 6) {
    setMsg(contResetMsg, "Parola trebuie să aibă cel puțin 6 caractere.", true);
    return;
  }
  if (p1 !== p2) {
    setMsg(contResetMsg, "Parolele nu coincid.", true);
    return;
  }
  const { error } = await supabase.auth.updateUser({ password: p1 });
  if (error) {
    setMsg(contResetMsg, formatSupabaseErr(error), true);
    return;
  }
  contResetForm.reset();
  passwordRecoveryMode = false;
  clearSensitiveAuthUrlParts();
  setMsg(contResetMsg, "Parola a fost actualizată. Rămâi conectat în contul tău.", false);
  setTimeout(() => setResetPanelVisible(false), 1400);
});

contResetDismiss?.addEventListener("click", () => {
  passwordRecoveryMode = false;
  clearSensitiveAuthUrlParts();
  setResetPanelVisible(false);
});

contWelcomeDismiss?.addEventListener("click", () => {
  markWelcomeDismissed(welcomeState.user);
  try {
    sessionStorage.removeItem(WELCOME_PENDING_REASON_KEY);
  } catch {
    /* ignore */
  }
  if (contWelcomeSection) contWelcomeSection.hidden = true;
});

contWelcomeProfile?.addEventListener("click", () => {
  setProfileFormLocked(false);
  document.getElementById("cont-profile-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
  document.getElementById("profile-last-name")?.focus({ preventScroll: true });
});

contWelcomeDelivery?.addEventListener("click", () => {
  document.getElementById("cont-delivery-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
  if (!deliveryListEl?.querySelector(".cont-addr-card")) {
    deliveryAddBtn?.click();
  }
});

async function loadProfile(user) {
  await refreshUserHeader(user);
  setMsg(contFormMsg, "", false);
  setMsg(contBillingMsg, "", false);
  try {
    await ensureProfileRow(user);
    let { data, error } = await supabase
      .from("profiles")
      .select(PROFILE_BILLING_SELECT)
      .eq("id", user.id)
      .maybeSingle();
    if (error) {
      const r2 = await supabase
        .from("profiles")
        .select("first_name, last_name, birth_date, activity_type, company_name, how_heard, website, newsletter")
        .eq("id", user.id)
        .maybeSingle();
      if (r2.error) {
        setMsg(contFormMsg, error.message, true);
        return;
      }
      data = r2.data;
      setMsg(
        contBillingMsg,
        "Rulează migrarea 002 (facturare) în Supabase, apoi reîncarcă pagina, ca să se încarce câmpurile de facturare.",
        true
      );
    }
    welcomeState.user = user;
    welcomeState.profile = data || {};
    fillForm(data || {});
    fillFormBilling(data || {});
    renderWelcomeFlow(user, data || {});
  } catch (e) {
    setMsg(contFormMsg, e?.message || String(e), true);
  } finally {
    try {
      await loadDeliveryAddresses(user);
    } catch (e) {
      setMsg(contDeliveryMsg, e?.message || String(e), true);
    }
    applyAuthMetadataToProfileFields(user);
    requestAnimationFrame(() => refreshContNavFromScroll());
  }
}

async function refreshUserHeader(user) {
  if (contHeaderEmail) contHeaderEmail.textContent = user?.email || "—";
  if (contConnectMeta) {
    const t = user?.last_sign_in_at
      ? new Date(user.last_sign_in_at).toLocaleString("ro-RO")
      : "—";
    contConnectMeta.textContent = `Ultima autentificare: ${t}`;
  }
}

async function onSession(session) {
  if (!session?.user) {
    welcomeState.user = null;
    welcomeState.profile = null;
    welcomeState.deliveryCount = 0;
    if (contWelcomeSection) contWelcomeSection.hidden = true;
    syncHeaderWithAccountSession(null);
    showView(false);
    renderSavedCarsForAccount();
    return;
  }
  welcomeState.user = session.user;
  syncHeaderWithAccountSession(session.user);
  showView(true);
  if (passwordRecoveryMode) {
    setResetPanelVisible(true, "Sesiunea de recuperare este activă. Setează parola nouă mai jos.");
  }
  try {
    await syncGarageFromCloudAndLocal(supabase);
  } catch (e) {
    console.warn("[cont] sync garaj cloud", e?.message || e);
  }
  renderSavedCarsForAccount();
  try {
    await loadProfile(session.user);
    setProfileFormLocked(true);
  } catch (e) {
    setMsg(contFormMsg, e?.message || String(e), true);
    setProfileFormLocked(false);
  }
}

loginForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  setMsg(contAuthError, "", false);
  const fd = new FormData(loginForm);
  const email = (fd.get("email") || "").toString().trim();
  const password = (fd.get("password") || "").toString();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    setMsg(contAuthError, error.message, true);
    return;
  }
  loginForm.reset();
  setRecoveryRequestVisible(false);
});

registerForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  setMsg(contAuthError, "", false);
  const fd = new FormData(registerForm);
  const email = (fd.get("email") || "").toString().trim();
  const p1 = (fd.get("password") || "").toString();
  const p2 = (fd.get("password2") || "").toString();
  if (p1.length < 6) {
    setMsg(contAuthError, "Parola trebuie sa aibă cel puțin 6 caractere.", true);
    return;
  }
  if (p1 !== p2) {
    setMsg(contAuthError, "Parolele nu coincid.", true);
    return;
  }
  const { error } = await supabase.auth.signUp({ email, password: p1 });
  if (error) {
    setMsg(contAuthError, error.message, true);
    return;
  }
  try {
    sessionStorage.setItem(WELCOME_PENDING_REASON_KEY, "registered");
  } catch {
    /* ignore */
  }
  setMsg(
    contAuthError,
    "Cont creat. Dacă proiectul cere confirmare e-mail, verifică Inboxul; apoi te poți conecta.",
    false
  );
  registerForm.reset();
});

profileForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  setMsg(contFormMsg, "", false);
  const { data: u, error: ue } = await supabase.auth.getUser();
  if (ue || !u.user) {
    setMsg(contFormMsg, "Sesiune indisponibilă. Reautentifică-te.", true);
    return;
  }
  const user = u.user;
  const act = fieldActivity?.value || "";
  const payload = {
    id: user.id,
    first_name: (document.getElementById("profile-first-name")?.value || "").trim() || null,
    last_name: (document.getElementById("profile-last-name")?.value || "").trim() || null,
    birth_date: document.getElementById("profile-birth")?.value || null,
    activity_type: act || null,
    company_name: act === "juridica"
      ? (document.getElementById("profile-company")?.value || "").trim() || null
      : null,
    how_heard: document.getElementById("how-heard")?.value || null,
    website: (document.getElementById("profile-website")?.value || "").trim() || null,
    newsletter: document.getElementById("profile-newsletter-yes")?.checked === true,
  };
  if (act === "juridica" && !payload.company_name) {
    setMsg(contFormMsg, "Completează denumirea firmă / punct de lucru (garaj) pentru persoană juridică.", true);
    return;
  }
  const { error } = await supabase.from("profiles").upsert(payload, { onConflict: "id" });
  if (error) {
    setMsg(contFormMsg, error.message, true);
    return;
  }
  welcomeState.profile = { ...(welcomeState.profile || {}), ...payload };
  try {
    sessionStorage.removeItem(WELCOME_PENDING_REASON_KEY);
  } catch {
    /* ignore */
  }
  renderWelcomeFlow(user, welcomeState.profile);
  setMsg(contFormMsg, "Datele au fost salvate.", false);
  setProfileFormLocked(true);
});

contProfileEditBtn?.addEventListener("click", () => {
  setProfileFormLocked(false);
  document.getElementById("profile-last-name")?.focus();
});

contProfileCancelBtn?.addEventListener("click", async () => {
  const { data: u, error: ue } = await supabase.auth.getUser();
  if (ue || !u.user) return;
  setMsg(contFormMsg, "", false);
  await loadProfile(u.user);
  setProfileFormLocked(true);
});

billingForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  setMsg(contBillingMsg, "", false);
  const { data: u, error: ue } = await supabase.auth.getUser();
  if (ue || !u.user) {
    setMsg(contBillingMsg, "Sesiune indisponibilă. Reautentifică-te.", true);
    return;
  }
  const user = u.user;
  const bt = billTypeEl?.value || "";
  if (!bt) {
    setMsg(contBillingMsg, "Alege facturare pe persoană fizică sau persoană juridică.", true);
    return;
  }
  const g = (id) => (document.getElementById(id)?.value || "").trim() || null;
  /** @type {Record<string, unknown>} */
  const up = { bill_type: bt };
  if (bt === "fizica") {
    up.bill_pf_last_name = g("bill-pf-last");
    up.bill_pf_first_name = g("bill-pf-first");
    up.bill_pf_cnp = g("bill-pf-cnp");
    up.bill_pf_county = g("bill-pf-county");
    up.bill_pf_city = g("bill-pf-city");
    up.bill_pf_street = g("bill-pf-street");
    up.bill_pf_postal = g("bill-pf-postal");
    up.bill_pj_denumire = null;
    up.bill_pj_cui = null;
    up.bill_pj_reg_com = null;
    up.bill_pj_county = null;
    up.bill_pj_city = null;
    up.bill_pj_street = null;
    up.bill_pj_postal = null;
    up.bill_pj_bank = null;
    up.bill_pj_iban = null;
    up.bill_pj_contact = null;
  } else {
    up.bill_pj_denumire = g("bill-pj-denumire");
    up.bill_pj_cui = g("bill-pj-cui");
    up.bill_pj_reg_com = g("bill-pj-reg");
    up.bill_pj_county = g("bill-pj-county");
    up.bill_pj_city = g("bill-pj-city");
    up.bill_pj_street = g("bill-pj-street");
    up.bill_pj_postal = g("bill-pj-postal");
    up.bill_pj_bank = g("bill-pj-bank");
    up.bill_pj_iban = g("bill-pj-iban");
    up.bill_pj_contact = g("bill-pj-contact");
    up.bill_pf_last_name = null;
    up.bill_pf_first_name = null;
    up.bill_pf_cnp = null;
    up.bill_pf_county = null;
    up.bill_pf_city = null;
    up.bill_pf_street = null;
    up.bill_pf_postal = null;
  }
  const { error } = await supabase.from("profiles").update(up).eq("id", user.id);
  if (error) {
    setMsg(contBillingMsg, error.message, true);
    return;
  }
  setMsg(contBillingMsg, "Datele de facturare au fost salvate.", false);
});

passwordForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  setMsg(contPwdMsg, "", false);
  const { data: u, error: ue } = await supabase.auth.getUser();
  if (ue || !u.user) {
    setMsg(contPwdMsg, "Sesiune indisponibilă.", true);
    return;
  }
  const user = u.user;
  const newEmail = (document.getElementById("cont-profile-email")?.value || "").trim();
  const p1 = (inpPwd?.value || "").trim();
  const p2 = (inpPwd2?.value || "").trim();
  if (p1 && p1.length < 6) {
    setMsg(contPwdMsg, "Parola nouă: minim 6 caractere.", true);
    return;
  }
  if (p1 && p1 !== p2) {
    setMsg(contPwdMsg, "Parolele noi nu coincid.", true);
    return;
  }
  const updates = {};
  if (newEmail && newEmail !== user.email) {
    updates.email = newEmail;
  }
  if (p1) {
    updates.password = p1;
  }
  if (Object.keys(updates).length === 0) {
    setMsg(contPwdMsg, "Modifică e-mailul sau completează parola nouă.", true);
    return;
  }
  const { data, error } = await supabase.auth.updateUser(updates);
  if (error) {
    setMsg(contPwdMsg, error.message, true);
    return;
  }
  if (passwordForm) passwordForm.reset();
  if (inpProfileEmail) inpProfileEmail.value = data.user?.email || newEmail;
  if (contHeaderEmail) contHeaderEmail.textContent = data.user?.email || newEmail;
  if (inpPwd) inpPwd.value = "";
  if (inpPwd2) inpPwd2.value = "";
  setMsg(
    contPwdMsg,
    updates.email
      ? "E-mailul poate solicita confirmare (verifică Inboxul). Parola, dacă a fost setată, este actualizată."
      : "Parola a fost actualizată.",
    false
  );
  const { data: s } = await supabase.auth.getSession();
  if (s?.session?.user) await refreshUserHeader(s.session.user);
});

signOutBtn?.addEventListener("click", async () => {
  await supabase.auth.signOut();
  setMsg(contFormMsg, "", false);
  setMsg(contPwdMsg, "", false);
  setMsg(contDeliveryMsg, "", false);
  setMsg(contBillingMsg, "", false);
});

savedCarsListEl?.addEventListener("click", (ev) => {
  const editBtn = ev.target.closest("[data-saved-car-edit]");
  if (editBtn) {
    const idx = Number.parseInt(editBtn.getAttribute("data-saved-car-edit") || "", 10);
    if (!Number.isInteger(idx) || idx < 0) return;
    const cars = readSavedCars();
    const car = cars[idx];
    if (!car) return;
    openConfiguratorForSavedCarEdit(car, idx);
    return;
  }
  const partsBtn = ev.target.closest("[data-saved-car-parts]");
  if (partsBtn) {
    const idx = Number.parseInt(partsBtn.getAttribute("data-saved-car-parts") || "", 10);
    if (!Number.isInteger(idx) || idx < 0) return;
    const cars = readSavedCars();
    const car = cars[idx];
    if (!car) return;
    openPartsListForSavedCar(car);
    return;
  }
  const btn = ev.target.closest("[data-saved-car-delete]");
  if (!btn) return;
  const idx = Number.parseInt(btn.getAttribute("data-saved-car-delete") || "", 10);
  if (!Number.isInteger(idx) || idx < 0) return;
  const cars = readSavedCars();
  if (!cars[idx]) return;
  cars.splice(idx, 1);
  writeSavedCars(cars);
  void pushLocalGarageToCloud(supabase).catch((e) => console.warn("[cont] push garaj", e));
  renderSavedCarsForAccount();
  setMsg(contGarageCarsMsg, "Mașina a fost ștearsă din garaj.", false);
});

savedCarsClearBtn?.addEventListener("click", () => {
  const cars = readSavedCars();
  if (!cars.length) return;
  if (!confirm("Ștergi toate mașinile salvate din garaj?")) return;
  writeSavedCars([]);
  void pushLocalGarageToCloud(supabase).catch((e) => console.warn("[cont] push garaj", e));
  renderSavedCarsForAccount();
  setMsg(contGarageCarsMsg, "Toate mașinile salvate au fost șterse.", false);
});

onGarageCarsUpdated(renderSavedCarsForAccount);

if (urlLooksLikePasswordRecovery()) {
  passwordRecoveryMode = true;
}

supabase.auth.onAuthStateChange((event, session) => {
  if (event === "PASSWORD_RECOVERY") {
    passwordRecoveryMode = true;
  }
  // Ieșim din callback înainte de orice cerere Supabase (lock-ul Auth).
  setTimeout(() => { void onSession(session); }, 0);
});

const { data: { session: initial } } = await supabase.auth.getSession();
onSession(initial);
