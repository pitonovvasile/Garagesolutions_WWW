import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./supabase-config.mjs";
import { onGarageCarsUpdated, readSavedCars, writeSavedCars } from "./garage-saved-cars.mjs";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const elGate = document.getElementById("cont-auth-gate");
const elApp = document.getElementById("cont-app");
const contAuthError = document.getElementById("cont-auth-error");
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
const billingForm = document.getElementById("cont-billing-form");
const billTypeEl = document.getElementById("bill-type");
const billPfWrap = document.getElementById("bill-pf-wrap");
const billPjWrap = document.getElementById("bill-pj-wrap");

const loginForm = document.getElementById("cont-login-form");
const registerForm = document.getElementById("cont-register-form");
const profileForm = document.getElementById("cont-profile-form");
const passwordForm = document.getElementById("cont-password-form");
const signOutBtn = document.getElementById("cont-sign-out-btn");
const contHeaderEmail = document.getElementById("cont-header-email");
const contConnectMeta = document.getElementById("cont-connect-meta");

const fieldActivity = document.getElementById("profile-activity");
const wrapCompany = document.getElementById("profile-company-wrap");

const inpEmail = document.getElementById("cont-login-email");
const inpPwd = document.getElementById("cont-pwd-new");
const inpPwd2 = document.getElementById("cont-pwd-confirm");
const inpProfileEmail = document.getElementById("cont-profile-email");

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

function showView(session) {
  if (session) {
    if (elGate) elGate.hidden = true;
    if (elApp) elApp.hidden = false;
  } else {
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

function buildAddressCard(addr, _user) {
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

  const el = document.createElement("article");
  el.className = "cont-addr-card";
  if (!isNew) el.dataset.id = ar.id;
  el.dataset.draft = isNew ? "1" : "0";

  const title = (ar.label || "").trim() || (isNew ? "Adresă nouă" : "Adresă fără etichetă");
  el.innerHTML = `
    <div class="cont-addr-card__head">
      <h3 class="cont-addr-card__h">${title}</h3>
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
          <input class="cont-input cont-addr__city" type="text" required value="${escAttr(ar.city)}" />
        </label>
        <label class="cont-field">
          <span class="cont-field__label">Județ / sector</span>
          <input class="cont-input cont-addr__county" type="text" value="${escAttr(ar.county)}" />
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
        <button type="button" class="cont-btn cont-btn--primary" data-delivery-action="save">Salvează adresa</button>
        ${
          isNew
            ? '<button type="button" class="cont-btn cont-btn--ghost" data-delivery-action="cancel">Renunță</button>'
            : '<button type="button" class="cont-btn cont-btn--ghost" data-delivery-action="delete">Șterge adresa</button>'
        }
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

function renderSavedCarsForAccount() {
  if (!savedCarsListEl) return;
  const cars = readSavedCars();
  savedCarsListEl.innerHTML = "";
  if (!cars.length) {
    if (savedCarsEmptyHintEl) savedCarsEmptyHintEl.hidden = false;
    if (savedCarsClearBtn) savedCarsClearBtn.disabled = true;
    return;
  }
  if (savedCarsEmptyHintEl) savedCarsEmptyHintEl.hidden = true;
  if (savedCarsClearBtn) savedCarsClearBtn.disabled = false;
  cars.forEach((car, index) => {
    const li = document.createElement("li");
    li.className = "cont-addr-card";
    li.innerHTML = `
      <div class="cont-addr-card__head">
        <h3 class="cont-addr-card__h">${escAttr(formatSavedCar(car) || `Mașina ${index + 1}`)}</h3>
      </div>
      <div class="cont-addr-card__actions">
        <button type="button" class="cont-btn cont-btn--ghost" data-saved-car-delete="${index}">Șterge</button>
      </div>
    `;
    savedCarsListEl.appendChild(li);
  });
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
      const { data: u } = await supabase.auth.getUser();
      const user = u?.user;
      if (!user) return;
      if (action === "save") {
        await saveAddressCard(card, user);
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
          setMsg(contDeliveryMsg, error.message, true);
          return;
        }
        setMsg(contDeliveryMsg, "Adresa a fost ștearsă.", false);
        await loadDeliveryAddresses(user);
        return;
      }
      if (action === "cancel") {
        card.remove();
        syncDeliveryEmpty();
      }
    })();
  });
}

function syncDeliveryEmpty() {
  if (!deliveryListEl || !deliveryEmptyHint) return;
  const n = deliveryListEl.querySelectorAll(".cont-addr-card").length;
  deliveryEmptyHint.hidden = n > 0;
}

async function saveAddressCard(card, user) {
  const partial = readAddressCard(card);
  if (!partial.street || !partial.city) {
    setMsg(contDeliveryMsg, "Completează strada și localitatea.", true);
    return;
  }
  setMsg(contDeliveryMsg, "", false);
  if (partial.is_default) {
    await supabase
      .from("delivery_addresses")
      .update({ is_default: false })
      .eq("user_id", user.id);
  }
  const id = card.dataset.id;
  if (id) {
    const { error } = await supabase
      .from("delivery_addresses")
      .update(partial)
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) {
      setMsg(contDeliveryMsg, error.message, true);
      return;
    }
  } else {
    const { error } = await supabase
      .from("delivery_addresses")
      .insert({ user_id: user.id, ...partial });
    if (error) {
      setMsg(contDeliveryMsg, error.message, true);
      return;
    }
  }
  setMsg(contDeliveryMsg, "Adresa de livrare a fost salvată.", false);
  await loadDeliveryAddresses(user);
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
      `Adrese livrare: ${error.message} (asigură-te că rulezi migrarea 002 în Supabase)`,
      true
    );
    return;
  }
  deliveryListEl.innerHTML = "";
  const rows = data || [];
  rows.forEach((r) => deliveryListEl.appendChild(buildAddressCard(r, user)));
  syncDeliveryEmpty();
}

deliveryAddBtn?.addEventListener("click", () => {
  (async () => {
    const { data: u } = await supabase.auth.getUser();
    const user = u?.user;
    if (!user || !deliveryListEl) return;
    deliveryListEl.appendChild(buildAddressCard(null, user));
    syncDeliveryEmpty();
    if (deliveryEmptyHint) deliveryEmptyHint.hidden = true;
  })();
});

async function loadProfile(user) {
  setMsg(contFormMsg, "", false);
  setMsg(contBillingMsg, "", false);
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
  fillForm(data || {});
  fillFormBilling(data || {});
  if (inpProfileEmail) inpProfileEmail.value = user.email || "";
  if (contHeaderEmail) contHeaderEmail.textContent = user.email || "—";
  if (contConnectMeta) {
    const t = user.last_sign_in_at
      ? new Date(user.last_sign_in_at).toLocaleString("ro-RO")
      : "—";
    contConnectMeta.textContent = `Ultima autentificare: ${t}`;
  }
  try {
    await loadDeliveryAddresses(user);
  } catch (e) {
    setMsg(contDeliveryMsg, e?.message || String(e), true);
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
    showView(false);
    renderSavedCarsForAccount();
    return;
  }
  showView(true);
  renderSavedCarsForAccount();
  try {
    await loadProfile(session.user);
  } catch (e) {
    setMsg(contFormMsg, e?.message || String(e), true);
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
  setMsg(contFormMsg, "Datele au fost salvate.", false);
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
  if (s?.user) await refreshUserHeader(s.user);
});

signOutBtn?.addEventListener("click", async () => {
  await supabase.auth.signOut();
  setMsg(contFormMsg, "", false);
  setMsg(contPwdMsg, "", false);
  setMsg(contDeliveryMsg, "", false);
  setMsg(contBillingMsg, "", false);
});

savedCarsListEl?.addEventListener("click", (ev) => {
  const btn = ev.target.closest("[data-saved-car-delete]");
  if (!btn) return;
  const idx = Number.parseInt(btn.getAttribute("data-saved-car-delete") || "", 10);
  if (!Number.isInteger(idx) || idx < 0) return;
  const cars = readSavedCars();
  if (!cars[idx]) return;
  cars.splice(idx, 1);
  writeSavedCars(cars);
  renderSavedCarsForAccount();
  setMsg(contGarageCarsMsg, "Mașina a fost ștearsă din garaj.", false);
});

savedCarsClearBtn?.addEventListener("click", () => {
  const cars = readSavedCars();
  if (!cars.length) return;
  if (!confirm("Ștergi toate mașinile salvate din garaj?")) return;
  writeSavedCars([]);
  renderSavedCarsForAccount();
  setMsg(contGarageCarsMsg, "Toate mașinile salvate au fost șterse.", false);
});

window.addEventListener("storage", (e) => {
  if (e.key === "garageSolutionsSavedCars") {
    renderSavedCarsForAccount();
  }
});

onGarageCarsUpdated(renderSavedCarsForAccount);

supabase.auth.onAuthStateChange((_event, session) => {
  onSession(session);
});

const { data: { session: initial } } = await supabase.auth.getSession();
onSession(initial);
