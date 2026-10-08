import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./supabase-config.mjs";
import { createSupabaseCookieMirrorStorage } from "./supabase-session-cookie-mirror.mjs";

const SUPPLIER_ID = "bardi";
const PAGE_SIZE = 80;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: createSupabaseCookieMirrorStorage(),
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

const $ = (id) => document.getElementById(id);

const els = {
  sessionLabel: $("admin-session-label"),
  authState: $("admin-auth-state"),
  locked: $("admin-locked"),
  lockedMessage: $("admin-locked-message"),
  loginForm: $("admin-login-form"),
  loginEmail: $("admin-login-email"),
  loginPassword: $("admin-login-password"),
  logout: $("admin-logout"),
  dashboard: $("admin-dashboard"),
  stats: $("admin-stats"),
  refresh: $("admin-refresh"),
  supplierList: $("supplier-list"),
  coverageSort: $("coverage-sort"),
  coverageList: $("coverage-list"),
  makeFilter: $("make-filter"),
  typeSearch: $("type-search"),
  typeList: $("type-list"),
  typePage: $("types-page"),
  typesPrev: $("types-prev"),
  typesNext: $("types-next"),
  detailStatus: $("detail-status"),
  typeDetail: $("type-detail"),
};

const state = {
  user: null,
  isAdmin: false,
  summary: null,
  coverageRows: [],
  typeRows: [],
  typeTotal: 0,
  typeOffset: 0,
  selectedTypeId: "",
  busy: false,
};

function formatError(error) {
  if (!error) return "Eroare necunoscută.";
  return [error.message, error.details, error.hint].filter(Boolean).join(" — ");
}

function setStatus(text, tone = "neutral") {
  if (!els.authState) return;
  els.authState.textContent = text;
  els.authState.dataset.tone = tone;
}

function showLocked(message, showLogout = false) {
  if (els.locked) els.locked.hidden = false;
  if (els.dashboard) els.dashboard.hidden = true;
  if (els.lockedMessage) els.lockedMessage.textContent = message;
  if (els.loginForm) els.loginForm.hidden = Boolean(state.user);
  if (els.logout) els.logout.hidden = !showLogout;
}

function showDashboard() {
  if (els.locked) els.locked.hidden = true;
  if (els.dashboard) els.dashboard.hidden = false;
}

function setSessionLabel() {
  const email = state.user?.email || "";
  if (els.sessionLabel) {
    els.sessionLabel.textContent = email ? `Conectat: ${email}` : "Neautentificat";
  }
}

function updateBusy(isBusy) {
  state.busy = isBusy;
  [els.refresh, els.typesPrev, els.typesNext].forEach((el) => {
    if (el) el.disabled = isBusy;
  });
}

function statLabel(key) {
  return (
    {
      suppliers: "Distribuitori",
      sourceSnapshots: "Snapshot-uri sursă",
      canonicalMakes: "Mărci canonice",
      canonicalModels: "Modele canonice",
      canonicalVehicleTypes: "Tipuri canonice",
      canonicalVehicleVariants: "Variante canonice",
      canonicalProducts: "Produse canonice",
      supplierVehicleTypes: "Tipuri Bardi",
      supplierVehicleYears: "Ani Bardi",
      supplierVehicleRefs: "Motorizări Bardi",
      supplierProducts: "Produse furnizori",
      supplierOffersCurrent: "Oferte curente",
    }[key] || key
  );
}

function formatNumber(value) {
  const n = Number(value || 0);
  return new Intl.NumberFormat("ro-RO").format(n);
}

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([key, value]) => {
    if (value === undefined || value === null || value === false) return;
    if (key === "className") node.className = value;
    else if (key === "text") node.textContent = String(value);
    else if (key === "dataset") {
      Object.entries(value).forEach(([dataKey, dataValue]) => {
        node.dataset[dataKey] = String(dataValue);
      });
    } else node.setAttribute(key, String(value));
  });
  children.forEach((child) => {
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  });
  return node;
}

function renderStats() {
  if (!els.stats) return;
  const counts = state.summary?.counts || {};
  const preferred = [
    "suppliers",
    "supplierVehicleTypes",
    "supplierVehicleYears",
    "supplierVehicleRefs",
    "canonicalMakes",
    "canonicalProducts",
    "supplierProducts",
    "supplierOffersCurrent",
  ];
  els.stats.replaceChildren(
    ...preferred.map((key) =>
      el("article", { className: "admin-stat" }, [
        el("span", { text: statLabel(key) }),
        el("strong", { text: formatNumber(counts[key]) }),
      ]),
    ),
  );
}

function renderSuppliers() {
  if (!els.supplierList) return;
  const suppliers = state.summary?.suppliers || [];
  if (!suppliers.length) {
    els.supplierList.replaceChildren(el("p", { className: "admin-empty", text: "Nu există distribuitori importați." }));
    return;
  }
  els.supplierList.replaceChildren(
    ...suppliers.map((supplier) =>
      el("article", { className: "supplier-card" }, [
        el("div", {}, [
          el("strong", { text: supplier.name || supplier.id }),
          el("span", {
            text: `${supplier.kind || "distributor"} · ${supplier.integrationStatus || "planned"}`,
          }),
        ]),
        el("dl", {}, [
          el("div", {}, [el("dt", { text: "Tipuri" }), el("dd", { text: formatNumber(supplier.vehicleTypes) })]),
          el("div", {}, [el("dt", { text: "Ani" }), el("dd", { text: formatNumber(supplier.vehicleYears) })]),
          el("div", {}, [el("dt", { text: "Motorizări" }), el("dd", { text: formatNumber(supplier.vehicleRefs) })]),
          el("div", {}, [el("dt", { text: "Oferte" }), el("dd", { text: formatNumber(supplier.currentOffers) })]),
        ]),
      ]),
    ),
  );
}

function sortedCoverageRows() {
  const rows = [...state.coverageRows];
  const sort = els.coverageSort?.value || "make";
  if (sort === "missing") {
    rows.sort((a, b) => Number(a.vehicleRefs || 0) - Number(b.vehicleRefs || 0) || String(a.make).localeCompare(String(b.make), "ro"));
  } else if (sort === "refs") {
    rows.sort((a, b) => Number(b.vehicleRefs || 0) - Number(a.vehicleRefs || 0) || String(a.make).localeCompare(String(b.make), "ro"));
  } else {
    rows.sort((a, b) => String(a.make).localeCompare(String(b.make), "ro"));
  }
  return rows;
}

function renderMakeFilter() {
  if (!els.makeFilter) return;
  const selected = els.makeFilter.value;
  const makes = sortedCoverageRows().map((row) => row.make).filter(Boolean);
  els.makeFilter.replaceChildren(
    el("option", { value: "", text: "Toate mărcile" }),
    ...makes.map((make) => el("option", { value: make, text: make })),
  );
  if (makes.includes(selected)) els.makeFilter.value = selected;
}

function renderCoverage() {
  if (!els.coverageList) return;
  renderMakeFilter();
  const rows = sortedCoverageRows();
  if (!rows.length) {
    els.coverageList.replaceChildren(el("p", { className: "admin-empty", text: "Nu avem încă acoperire importată." }));
    return;
  }
  els.coverageList.replaceChildren(
    ...rows.map((row) => {
      const missingRefs = Number(row.vehicleRefs || 0) === 0;
      return el("button", { type: "button", className: `coverage-row${missingRefs ? " coverage-row--warn" : ""}`, dataset: { make: row.make } }, [
        el("strong", { text: row.make }),
        el("span", { text: `${formatNumber(row.vehicleTypes)} tipuri` }),
        el("span", { text: `${formatNumber(row.modelYears)} ani` }),
        el("span", { text: `${formatNumber(row.vehicleRefs)} motorizări` }),
      ]);
    }),
  );
}

function renderTypes() {
  if (!els.typeList) return;
  if (!state.typeRows.length) {
    els.typeList.replaceChildren(el("p", { className: "admin-empty", text: "Nicio intrare pentru filtrul curent." }));
  } else {
    els.typeList.replaceChildren(
      ...state.typeRows.map((row) => {
        const years = [row.yearFrom, row.yearTo].filter((v) => v !== null && v !== undefined).join("-");
        const active = String(row.externalTypeId) === state.selectedTypeId;
        return el("button", { type: "button", className: `type-row${active ? " is-active" : ""}`, dataset: { typeId: row.externalTypeId } }, [
          el("span", { className: "type-row__main" }, [
            el("strong", { text: [row.make, row.model, row.generation].filter(Boolean).join(" · ") }),
            el("small", { text: `ID ${row.externalTypeId}${years ? ` · ${years}` : ""}` }),
          ]),
          el("span", { className: "type-row__meta", text: `${formatNumber(row.yearCount)} ani · ${formatNumber(row.vehicleRefCount)} refs` }),
        ]);
      }),
    );
  }
  const start = state.typeTotal ? state.typeOffset + 1 : 0;
  const end = Math.min(state.typeOffset + state.typeRows.length, state.typeTotal);
  if (els.typePage) els.typePage.textContent = `${formatNumber(start)}-${formatNumber(end)} din ${formatNumber(state.typeTotal)}`;
  if (els.typesPrev) els.typesPrev.disabled = state.busy || state.typeOffset <= 0;
  if (els.typesNext) els.typesNext.disabled = state.busy || state.typeOffset + PAGE_SIZE >= state.typeTotal;
}

function renderDetail(detail) {
  if (!els.typeDetail || !els.detailStatus) return;
  const type = detail?.type;
  if (!type) {
    els.detailStatus.textContent = "Selectează un tip.";
    els.typeDetail.replaceChildren(el("p", { className: "admin-empty", text: "Detaliile apar aici după selecție." }));
    return;
  }

  const refs = detail.vehicleRefs || [];
  const years = detail.years || [];
  els.detailStatus.textContent = `${formatNumber(years.length)} ani · ${formatNumber(refs.length)} motorizări`;
  els.typeDetail.replaceChildren(
    el("div", { className: "type-detail__summary" }, [
      el("strong", { text: [type.make, type.model, type.generation].filter(Boolean).join(" · ") }),
      el("span", { text: `Bardi type ID: ${type.externalTypeId}` }),
    ]),
    el("div", { className: "type-detail__columns" }, [
      el("section", {}, [
        el("h3", { text: "Ani" }),
        el(
          "div",
          { className: "pill-list" },
          years.length
            ? years.map((row) =>
                el("span", { className: row.vehicleRefCount ? "pill" : "pill pill--muted", text: `${row.year}: ${row.vehicleRefCount} refs` }),
              )
            : [el("p", { className: "admin-empty", text: "Nu există ani." })],
        ),
      ]),
      el("section", {}, [
        el("h3", { text: "Motorizări capturate" }),
        el(
          "div",
          { className: "engine-table" },
          refs.length
            ? refs.slice(0, 120).map((row) =>
                el("div", { className: "engine-row" }, [
                  el("span", { text: row.year || "-" }),
                  el("strong", { text: row.engineLabel || "Fără etichetă" }),
                  el("span", { text: [row.displacementL ? `${row.displacementL}L` : "", row.fuelType || ""].filter(Boolean).join(" · ") || "n/a" }),
                ]),
              )
            : [el("p", { className: "admin-empty", text: "Nu avem motorizări pentru acest tip." })],
        ),
      ]),
    ]),
  );
}

async function callRpc(name, args) {
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw error;
  return data;
}

async function assertAdmin() {
  const data = await callRpc("catalog_hub_is_admin");
  state.isAdmin = data === true;
  return state.isAdmin;
}

async function loadSummary() {
  state.summary = await callRpc("catalog_hub_admin_summary");
  renderStats();
  renderSuppliers();
}

async function loadCoverage() {
  const data = await callRpc("catalog_hub_admin_supplier_coverage", { p_supplier_id: SUPPLIER_ID });
  state.coverageRows = Array.isArray(data?.rows) ? data.rows : [];
  renderCoverage();
}

async function loadTypes(reset = false) {
  if (reset) state.typeOffset = 0;
  const data = await callRpc("catalog_hub_admin_vehicle_types", {
    p_supplier_id: SUPPLIER_ID,
    p_make: els.makeFilter?.value || null,
    p_search: els.typeSearch?.value || null,
    p_limit: PAGE_SIZE,
    p_offset: state.typeOffset,
  });
  state.typeRows = Array.isArray(data?.rows) ? data.rows : [];
  state.typeTotal = Number(data?.total || 0);
  if (!state.selectedTypeId || !state.typeRows.some((row) => String(row.externalTypeId) === state.selectedTypeId)) {
    state.selectedTypeId = state.typeRows[0]?.externalTypeId ? String(state.typeRows[0].externalTypeId) : "";
  }
  renderTypes();
  await loadTypeDetail();
}

async function loadTypeDetail() {
  if (!state.selectedTypeId) {
    renderDetail(null);
    return;
  }
  if (els.detailStatus) els.detailStatus.textContent = "Se încarcă...";
  const data = await callRpc("catalog_hub_admin_vehicle_type_detail", {
    p_supplier_id: SUPPLIER_ID,
    p_external_type_id: state.selectedTypeId,
  });
  renderDetail(data);
}

async function refreshAll() {
  updateBusy(true);
  setStatus("Se încarcă datele Catalog Hub...", "neutral");
  try {
    await loadSummary();
    await loadCoverage();
    await loadTypes(false);
    setStatus("Admin activ · Catalog Hub conectat", "ok");
  } catch (error) {
    setStatus("Nu pot citi Catalog Hub", "error");
    showLocked(formatError(error), Boolean(state.user));
  } finally {
    updateBusy(false);
  }
}

async function syncSession() {
  setStatus("Se verifică sesiunea...", "neutral");
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    state.user = null;
    state.isAdmin = false;
    setSessionLabel();
    setStatus("Sesiune indisponibilă", "error");
    showLocked(formatError(error), false);
    return;
  }

  state.user = data?.session?.user || null;
  setSessionLabel();
  if (!state.user) {
    state.isAdmin = false;
    setStatus("Autentificare necesară", "neutral");
    showLocked("Autentifică-te cu contul admin pentru a vedea Catalog Hub.", false);
    return;
  }

  try {
    const ok = await assertAdmin();
    if (!ok) {
      setStatus("Cont fără rol admin", "error");
      showLocked("Contul curent este autentificat, dar nu este în allowlist-ul Catalog Hub.", true);
      return;
    }
    showDashboard();
    await refreshAll();
  } catch (error) {
    setStatus("Admin indisponibil", "error");
    showLocked(formatError(error), true);
  }
}

function debounce(fn, waitMs) {
  let timer = 0;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), waitMs);
  };
}

function wireEvents() {
  els.loginForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = String(els.loginEmail?.value || "").trim();
    const password = String(els.loginPassword?.value || "");
    if (!email || !password) return;
    updateBusy(true);
    setStatus("Autentificare...", "neutral");
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (els.loginPassword) els.loginPassword.value = "";
      await syncSession();
    } catch (error) {
      setStatus("Autentificare eșuată", "error");
      showLocked(formatError(error), false);
    } finally {
      updateBusy(false);
    }
  });

  els.logout?.addEventListener("click", async () => {
    updateBusy(true);
    await supabase.auth.signOut();
    state.user = null;
    state.isAdmin = false;
    state.summary = null;
    state.coverageRows = [];
    state.typeRows = [];
    state.typeTotal = 0;
    state.selectedTypeId = "";
    renderStats();
    renderSuppliers();
    renderCoverage();
    renderTypes();
    renderDetail(null);
    updateBusy(false);
    await syncSession();
  });

  els.refresh?.addEventListener("click", () => {
    void refreshAll();
  });

  els.coverageSort?.addEventListener("change", () => {
    renderCoverage();
  });

  els.coverageList?.addEventListener("click", (event) => {
    const row = event.target.closest("[data-make]");
    if (!row) return;
    if (els.makeFilter) els.makeFilter.value = row.dataset.make || "";
    state.selectedTypeId = "";
    void loadTypes(true);
  });

  els.makeFilter?.addEventListener("change", () => {
    state.selectedTypeId = "";
    void loadTypes(true);
  });

  els.typeSearch?.addEventListener(
    "input",
    debounce(() => {
      state.selectedTypeId = "";
      void loadTypes(true);
    }, 250),
  );

  els.typeList?.addEventListener("click", (event) => {
    const row = event.target.closest("[data-type-id]");
    if (!row) return;
    state.selectedTypeId = row.dataset.typeId || "";
    renderTypes();
    void loadTypeDetail();
  });

  els.typesPrev?.addEventListener("click", () => {
    state.typeOffset = Math.max(0, state.typeOffset - PAGE_SIZE);
    state.selectedTypeId = "";
    void loadTypes(false);
  });

  els.typesNext?.addEventListener("click", () => {
    if (state.typeOffset + PAGE_SIZE >= state.typeTotal) return;
    state.typeOffset += PAGE_SIZE;
    state.selectedTypeId = "";
    void loadTypes(false);
  });

  supabase.auth.onAuthStateChange(() => {
    void syncSession();
  });
}

wireEvents();
await syncSession();
