import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./supabase-config.mjs";
import { isCatalogAdminEmail } from "./catalog-admin-config.mjs";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const TABLES = [
  "manufacturer_groups",
  "brands",
  "bmw_catalog_entries",
  "bmw_catalog_aliases",
  "models",
  "generations",
  "generation_specs",
  "generation_variants",
  "engines",
  "transmissions",
  "transmission_gears",
];
const REQUIRED_CATEGORIES = new Set(["classic", "current"]);
const ALIAS_TYPES = new Set(["search", "display", "legacy"]);
const state = { tables: Object.fromEntries(TABLES.map((t) => [t, []])), errors: {}, selectedEntryId: "", selectedGenerationId: "", selectedVariantId: "" };

const $ = (id) => document.getElementById(id);
const esc = (v) => String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
const txt = (row, keys, fallback = "") => keys.map((k) => row?.[k]).find((v) => v !== undefined && v !== null && String(v).trim() !== "") ?? fallback;
const norm = (v) => String(v ?? "").trim().toLowerCase();

function filters() {
  const category = $("f-category").value;
  return {
    category: REQUIRED_CATEGORIES.has(category) ? category : "classic",
    brand: norm($("f-brand").value),
    chassis_code: norm($("f-chassis").value),
    body_style: norm($("f-body-style").value),
    production_start_year: Number($("f-start-year").value || 0),
    production_end_year: Number($("f-end-year").value || 0),
    engine_code: norm($("f-engine-code").value),
    transmission_name: norm($("f-transmission-name").value),
  };
}

async function fetchTable(table) {
  const { data, error } = await supabase.from(table).select("*");
  if (error) {
    state.errors[table] = error.message;
    state.tables[table] = [];
    return;
  }
  state.errors[table] = "";
  state.tables[table] = data || [];
}

function scheduleRenderStatus() {
  const failed = Object.entries(state.errors).filter(([, v]) => v);
  $("live-status").textContent = failed.length
    ? `Live partial: ${failed.map(([k]) => k).join(", ")} inaccesibil(e) (RLS/schema).`
    : "Live ok: date sincronizate cu Supabase.";
}

function applyEntryFilters(entries) {
  const f = filters();
  return entries.filter((e) => {
    if (norm(txt(e, ["category"])) !== f.category) return false;
    if (f.brand) {
      const b = state.tables.brands.find((x) => String(x.id) === String(txt(e, ["brand_id", "brandId"], "")));
      if (!b || !norm(txt(b, ["display_name", "name", "slug"])).includes(f.brand)) return false;
    }
    const chassis = norm(txt(e, ["chassis_code", "code", "chassisCode"]));
    if (f.chassis_code && !chassis.includes(f.chassis_code)) return false;
    const start = Number(txt(e, ["production_start_year", "start_year"], 0)) || 0;
    const end = Number(txt(e, ["production_end_year", "end_year"], 0)) || 0;
    if (f.production_start_year && start && start < f.production_start_year) return false;
    if (f.production_end_year && end && end > f.production_end_year) return false;
    return true;
  });
}

function renderBrandGroupList() {
  $("manufacturer-groups-list").innerHTML = state.tables.manufacturer_groups
    .map((g) => `<li><strong>${esc(txt(g, ["display_name", "name"], "Unnamed group"))}</strong><span>ID: ${esc(txt(g, ["id"], "n/a"))}</span></li>`)
    .join("");
}

function renderBrands() {
  const f = filters();
  const groupsById = new Map(state.tables.manufacturer_groups.map((g) => [String(g.id), g]));
  const rows = state.tables.brands.filter((b) => norm(txt(b, ["category"])) === f.category);
  $("brands-list").innerHTML = rows
    .map((b) => {
      const group = groupsById.get(String(txt(b, ["manufacturer_group_id", "manufacturerGroupId"], "")));
      return `<li><strong>${esc(txt(b, ["display_name", "name"], "Unnamed brand"))}</strong><span>Group: ${esc(txt(group || {}, ["display_name", "name"], "n/a"))}</span></li>`;
    })
    .join("");
  $("f-brand").innerHTML = `<option value="">Toate</option>${rows.map((b) => `<option value="${esc(norm(txt(b, ["display_name", "name", "slug"])))}">${esc(txt(b, ["display_name", "name", "slug"], "Brand"))}</option>`).join("")}`;
}

function renderCatalogList() {
  const rows = applyEntryFilters(state.tables.bmw_catalog_entries);
  if (!state.selectedEntryId && rows[0]) state.selectedEntryId = String(rows[0].id);
  $("catalog-list").innerHTML = rows
    .map((e) => `<li><button data-entry-id="${esc(txt(e, ["id"], ""))}" class="catalog-live__pick${String(e.id) === state.selectedEntryId ? " is-active" : ""}">${esc(txt(e, ["display_name", "name"], "Untitled"))}</button><span>Chassis: ${esc(txt(e, ["chassis_code", "code"], "n/a"))}</span><span>Family: ${esc(txt(e, ["family_name"], "n/a"))}</span></li>`)
    .join("");
}

function renderEntryDetail() {
  const entry = state.tables.bmw_catalog_entries.find((e) => String(e.id) === state.selectedEntryId);
  if (!entry) {
    $("entry-detail").textContent = "Nicio intrare selectata.";
    return;
  }
  const aliases = state.tables.bmw_catalog_aliases.filter((a) => String(txt(a, ["entry_id"])) === String(entry.id));
  const gens = state.tables.generation_specs.filter((g) => String(txt(g, ["entry_id", "catalog_entry_id"])) === String(entry.id));
  if (!state.selectedGenerationId && gens[0]) state.selectedGenerationId = String(gens[0].id);
  $("entry-detail").innerHTML = `<h3>${esc(txt(entry, ["display_name", "name"], "Entry"))}</h3><p>Chassis: <strong>${esc(txt(entry, ["chassis_code", "code"], "n/a"))}</strong></p><p>Family: ${esc(txt(entry, ["family_name"], "n/a"))}</p><p>Notes: ${esc(txt(entry, ["notes"], "—"))}</p><p>Aliases: ${aliases.length}</p><ul>${aliases.slice(0, 10).map((a) => `<li>${esc(txt(a, ["alias"], ""))} <em>(${esc(txt(a, ["alias_type"], ""))})</em></li>`).join("")}</ul><h4>Generatii</h4><ul>${gens.map((g) => `<li><button data-generation-id="${esc(txt(g, ["id"], ""))}" class="catalog-live__pick${String(g.id) === state.selectedGenerationId ? " is-active" : ""}">${esc(txt(g, ["display_name", "name"], "Generation"))}</button></li>`).join("")}</ul>`;
}

function renderGenerationDetail() {
  const g = state.tables.generation_specs.find((x) => String(x.id) === state.selectedGenerationId);
  if (!g) {
    $("generation-detail").textContent = "Nicio generatie selectata.";
    return;
  }
  const bodyStyleFilter = filters().body_style;
  let vars = state.tables.generation_variants.filter((v) => String(txt(v, ["generation_spec_id", "generation_id"])) === String(g.id));
  if (bodyStyleFilter) vars = vars.filter((v) => norm(txt(v, ["body_style"])).includes(bodyStyleFilter));
  if (!state.selectedVariantId && vars[0]) state.selectedVariantId = String(vars[0].id);
  $("generation-detail").innerHTML = `<h3>${esc(txt(g, ["display_name", "name"], "Generation"))}</h3><p>Start: ${esc(txt(g, ["production_start_year", "start_year"], "n/a"))} | End: ${esc(txt(g, ["production_end_year", "end_year"], "n/a"))}</p><p>Body style: ${esc(txt(g, ["body_style"], "n/a"))}</p><h4>Variants</h4><ul>${vars.map((v) => `<li><button data-variant-id="${esc(txt(v, ["id"], ""))}" class="catalog-live__pick${String(v.id) === state.selectedVariantId ? " is-active" : ""}">${esc(txt(v, ["display_name", "name"], "Variant"))}</button></li>`).join("")}</ul>`;
}

function renderVariantDetail() {
  const v = state.tables.generation_variants.find((x) => String(x.id) === state.selectedVariantId);
  if (!v) {
    $("variant-detail").textContent = "Nicio varianta selectata.";
    return;
  }
  const f = filters();
  if (f.engine_code && !norm(txt(v, ["engine_code", "engine"])).includes(f.engine_code)) {
    $("variant-detail").textContent = "Varianta selectata nu respecta filtrul engine_code.";
    return;
  }
  if (f.transmission_name && !norm(txt(v, ["transmission_name", "transmission"])).includes(f.transmission_name)) {
    $("variant-detail").textContent = "Varianta selectata nu respecta filtrul transmission_name.";
    return;
  }
  $("variant-detail").innerHTML = `<h3>${esc(txt(v, ["display_name", "name"], "Variant"))}</h3><p>Engine: <strong>${esc(txt(v, ["engine_code", "engine"], "n/a"))}</strong></p><p>Transmission: <strong>${esc(txt(v, ["transmission_name", "transmission"], "n/a"))}</strong></p><p>Notes: ${esc(txt(v, ["notes"], "—"))}</p>`;
}

function renderSearch() {
  const q = norm($("search-q").value);
  const t = $("search-alias-type").value;
  const entries = applyEntryFilters(state.tables.bmw_catalog_entries);
  const byCode = q ? entries.filter((e) => norm(txt(e, ["chassis_code", "code", "display_name", "name"])).includes(q)).map((e) => ({ entry: e, via: "code" })) : [];
  const byAlias = q
    ? state.tables.bmw_catalog_aliases
        .filter((a) => (!t || ALIAS_TYPES.has(t) && txt(a, ["alias_type"]) === t) && norm(txt(a, ["alias"])).includes(q))
        .map((a) => ({ alias: a, entry: state.tables.bmw_catalog_entries.find((e) => String(e.id) === String(txt(a, ["entry_id"]))) }))
        .filter((x) => x.entry)
    : [];
  $("search-results").innerHTML = [...byCode.map((x) => `<li><strong>${esc(txt(x.entry, ["display_name", "name"], "Entry"))}</strong><span>via code</span></li>`), ...byAlias.map((x) => `<li><strong>${esc(txt(x.entry, ["display_name", "name"], "Entry"))}</strong><span>via alias:${esc(txt(x.alias, ["alias_type"], "search"))} (${esc(txt(x.alias, ["alias"], ""))})</span></li>`)].join("");
}

function renderAll() {
  renderBrandGroupList();
  renderBrands();
  renderCatalogList();
  renderEntryDetail();
  renderGenerationDetail();
  renderVariantDetail();
  renderSearch();
  scheduleRenderStatus();
}

async function refreshForTable(table) {
  await fetchTable(table);
  if (table === "brands") await fetchTable("bmw_catalog_entries");
  if (table === "bmw_catalog_entries") {
    await fetchTable("generation_specs");
    await fetchTable("bmw_catalog_aliases");
  }
  if (table === "generation_specs") await fetchTable("generation_variants");
  if (table === "generation_variants") renderVariantDetail();
  if (table === "bmw_catalog_aliases") renderSearch();
  renderAll();
}

async function bootstrap() {
  for (const table of TABLES) await fetchTable(table);
  renderAll();
  await syncAdminUiGate();
  supabase.auth.onAuthStateChange(() => {
    void syncAdminUiGate();
  });
  TABLES.forEach((table) => {
    supabase
      .channel(`catalog-live-${table}`)
      .on("postgres_changes", { event: "*", schema: "public", table }, async () => {
        await refreshForTable(table);
      })
      .subscribe();
  });
}

function wireEvents() {
  ["f-category", "f-brand", "f-chassis", "f-body-style", "f-start-year", "f-end-year", "f-engine-code", "f-transmission-name", "search-q", "search-alias-type"].forEach((id) =>
    $(id).addEventListener("input", renderAll)
  );
  $("catalog-list").addEventListener("click", (e) => {
    const id = e.target?.dataset?.entryId;
    if (!id) return;
    state.selectedEntryId = id;
    state.selectedGenerationId = "";
    state.selectedVariantId = "";
    renderAll();
  });
  $("entry-detail").addEventListener("click", (e) => {
    const id = e.target?.dataset?.generationId;
    if (!id) return;
    state.selectedGenerationId = id;
    state.selectedVariantId = "";
    renderAll();
  });
  $("generation-detail").addEventListener("click", (e) => {
    const id = e.target?.dataset?.variantId;
    if (!id) return;
    state.selectedVariantId = id;
    renderAll();
  });
  const adminForm = $("admin-form");
  if (adminForm) {
    adminForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const entryId = $("admin-entry-id").value.trim();
      const notes = $("admin-notes").value.trim();
      if (!entryId) return;
      $("admin-status").textContent = "Salvare...";
      const { data: session } = await supabase.auth.getSession();
      const user = session?.session?.user;
      if (!user) {
        $("admin-status").textContent = "Necesită autentificare admin pentru write path.";
        return;
      }
      if (!isCatalogAdminEmail(user.email)) {
        $("admin-status").textContent =
          "Contul nu e în allowlist admin (catalog-admin-config.mjs). Write-urile sunt blocate în UI; RLS trebuie să blocheze și pe server.";
        return;
      }
      const { error } = await supabase.from("bmw_catalog_entries").update({ notes }).eq("id", entryId);
      $("admin-status").textContent = error
        ? `Eroare save: ${error.message}`
        : "Salvat. Se va propaga live prin Realtime.";
      if (!error) await refreshForTable("bmw_catalog_entries");
    });
  }
}

async function syncAdminUiGate() {
  const form = $("admin-form");
  const status = $("admin-status");
  if (!form) return;
  const { data: session } = await supabase.auth.getSession();
  const email = session?.session?.user?.email || "";
  const allowed = isCatalogAdminEmail(email);
  form.querySelectorAll("input, textarea, button").forEach((el) => {
    el.disabled = !allowed;
  });
  if (!status) return;
  if (!email) {
    status.textContent = "Write admin: autentifică-te + allowlist (vezi catalog-admin-config.mjs).";
  } else if (!allowed) {
    status.textContent = `Write admin: dezactivat pentru ${email} (nu e în allowlist).`;
  } else {
    status.textContent = "Write admin: activ pentru contul curent.";
  }
}

wireEvents();
bootstrap();
