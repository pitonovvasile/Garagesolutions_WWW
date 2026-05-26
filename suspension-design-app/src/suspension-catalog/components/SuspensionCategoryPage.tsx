import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getSiteSupabaseClient, readSiteSupabaseEnv } from "../../lib/supabaseSiteClient";
import type {
  SuspensionCatalogTableConfig,
  SuspensionCompatFilters,
  SuspensionModelOption,
  SuspensionOptionRow,
} from "../types";
import { SUSPENSION_KITS_OEM_PLUS_SLUG } from "../types";
import { createSuspensionOptionsRepository } from "../suspensionOptionsRepository";
import { ManufacturerSelect } from "./ManufacturerSelect";
import { SuspensionModelSelect } from "./SuspensionModelSelect";
import { buildCompatOptionsFromRows, SuspensionFilters } from "./SuspensionFilters";
import { SuspensionProductCard } from "./SuspensionProductCard";

const EMPTY_COMPAT: SuspensionCompatFilters = {
  drivetrain: "",
  fuel_type: "",
  engine_group: "",
  body_type: "",
};

function applyClientCompat(rows: SuspensionOptionRow[], f: SuspensionCompatFilters): SuspensionOptionRow[] {
  const d = f.drivetrain.trim();
  const fu = f.fuel_type.trim();
  const e = f.engine_group.trim();
  const b = f.body_type.trim();
  return rows.filter((r) => {
    if (d && String(r.drivetrain ?? "").trim() !== d) return false;
    if (fu && String(r.fuel_type ?? "").trim() !== fu) return false;
    if (e && String(r.engine_group ?? "").trim() !== e) return false;
    if (b && String(r.body_type ?? "").trim() !== b) return false;
    return true;
  });
}

function SupabaseConfigRequiredScreen({
  errorMessage,
  tableName,
  embedded,
}: {
  errorMessage: string;
  tableName: string;
  embedded?: boolean;
}) {
  const inner = (
    <>
      {embedded ? (
        <h2 id="supabase-config-heading" className="text-lg font-semibold text-red-200">
          Conexiune Supabase
        </h2>
      ) : (
        <h1 className="text-xl font-semibold text-red-200">Conexiune Supabase</h1>
      )}
      <p className="rounded-lg border border-red-500/35 bg-red-950/25 px-3 py-2 text-sm text-red-100/95">{errorMessage}</p>
      <p className="text-sm text-neutral-300">
        Pagina citește <strong className="text-neutral-200">public.{tableName}</strong> cu aceeași cheie anon ca restul
        site-ului (mărci/modele, piese live). Editează{" "}
        <code className="rounded bg-neutral-800 px-1">assets/js/supabase-config.mjs</code> —{" "}
        <code className="rounded bg-neutral-800 px-1">SUPABASE_URL</code> și{" "}
        <code className="rounded bg-neutral-800 px-1">SUPABASE_ANON_KEY</code>. Nu există date demo în bundle.
      </p>
      <p className="text-xs text-neutral-500">
        Dacă URL-ul e corect dar nu apar rânduri: verifică în Supabase că există{" "}
        <code className="rounded bg-neutral-900 px-1">GRANT SELECT</code> / politici RLS pentru rolul{" "}
        <code className="rounded bg-neutral-900 px-1">anon</code> pe acest tabel.
      </p>
    </>
  );

  if (embedded) {
    return (
      <section
        className="mb-6 space-y-4 rounded-xl border border-red-500/30 bg-red-950/10 px-4 py-4 sm:px-5"
        aria-labelledby="supabase-config-heading"
      >
        {inner}
      </section>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 px-4 py-10 text-neutral-100">
      <main className="mx-auto max-w-2xl space-y-5">{inner}</main>
    </div>
  );
}

export interface SuspensionCategoryPageProps {
  title?: string;
  description?: string;
  productCategorySlug?: string;
  tableConfig: SuspensionCatalogTableConfig;
}

const DEFAULT_TITLE = "Kits suspensii OEM+";
const DEFAULT_DESCRIPTION =
  "Catalog kituri suspensii OEM+ din Supabase — fără cont, fără mașină selectată. Garajul personal nu influențează " +
  "acest flux. Producătorii și modelele se încarcă din public.bilstein_suspension_options (slug " +
  SUSPENSION_KITS_OEM_PLUS_SLUG + ", frontend_active = true).";

export function SuspensionCategoryPage({
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  productCategorySlug = SUSPENSION_KITS_OEM_PLUS_SLUG,
  tableConfig,
}: SuspensionCategoryPageProps) {
  const env = readSiteSupabaseEnv();
  const envErr = "error" in env ? env.error : null;
  const envOk = "error" in env ? null : env;
  const tableName = tableConfig.tableName;

  const repo = useMemo(() => {
    const r = readSiteSupabaseEnv();
    if ("error" in r) return null;
    return createSuspensionOptionsRepository(getSiteSupabaseClient(), { tableName });
  }, [tableName, envOk?.url, envOk?.anonKey]);

  const [manufacturers, setManufacturers] = useState<string[]>([]);
  const [selectedManufacturer, setSelectedManufacturer] = useState("");
  const [models, setModels] = useState<SuspensionModelOption[]>([]);
  const [selectedModelSlug, setSelectedModelSlug] = useState("");
  const [rawProducts, setRawProducts] = useState<SuspensionOptionRow[]>([]);
  const [compat, setCompat] = useState<SuspensionCompatFilters>(EMPTY_COMPAT);
  const [error, setError] = useState<string | null>(null);
  const [loadingManufacturers, setLoadingManufacturers] = useState(true);
  const [loadingModels, setLoadingModels] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [catalogPairs, setCatalogPairs] = useState<SuspensionModelOption[]>([]);
  const [loadingCatalogBrowse, setLoadingCatalogBrowse] = useState(false);
  const [catalogBrowseError, setCatalogBrowseError] = useState<string | null>(null);
  const pendingModelSlugRef = useRef<string | null>(null);

  /**
   * Debug opțional: doar cu `?oem_debug=1` în URL.
   * Loghează URL-ul Supabase, tabelul și două query-uri brute (diagnostic manual).
   */
  useEffect(() => {
    const qs =
      typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
    if (qs.get("oem_debug") !== "1") return;

    const cfg = readSiteSupabaseEnv();
    if ("error" in cfg) {
      console.warn("[OEM+ Supabase debug] Config invalid:", cfg.error);
      return;
    }

    let cancelled = false;
    const client = getSiteSupabaseClient();
    const slug = String(productCategorySlug ?? "").trim();

    void (async () => {
      const raw = await client
        .from(tableName)
        .select("id,manufacturer,product_category_slug,frontend_active")
        .limit(5);

      const filtered = await client
        .from(tableName)
        .select("id,manufacturer,product_category_slug,frontend_active")
        .eq("product_category_slug", slug)
        .eq("frontend_active", true)
        .limit(5);

      if (cancelled) return;

      let origin: string | null = null;
      let projectRef: string | null = null;
      try {
        const u = new URL(cfg.url);
        origin = u.origin;
        projectRef = u.hostname.split(".")[0] || null;
      } catch {
        origin = null;
      }

      const anonKeyPrefix =
        typeof cfg.anonKey === "string" && cfg.anonKey.length > 16 ? `${cfg.anonKey.slice(0, 16)}…` : "(lipsă)";

      console.info("[OEM+ Supabase debug]", {
        supabaseUrl: cfg.url,
        supabaseOrigin: origin,
        dashboardProjectRef: projectRef,
        anonKeyPrefix,
        table: tableName,
        productCategorySlug: slug,
        queryNoFilters: {
          error: raw.error
            ? { message: raw.error.message, code: raw.error.code, details: raw.error.details, hint: raw.error.hint }
            : null,
          rowCount: raw.data?.length ?? 0,
          rows: raw.data,
        },
        queryFiltered: {
          error: filtered.error
            ? {
                message: filtered.error.message,
                code: filtered.error.code,
                details: filtered.error.details,
                hint: filtered.error.hint,
              }
            : null,
          rowCount: filtered.data?.length ?? 0,
          rows: filtered.data,
        },
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [tableName, productCategorySlug]);

  useEffect(() => {
    const qs =
      typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
    if (!import.meta.env.DEV && qs.get("oem_debug") !== "1") return;
    console.info("[OEM+ UI state]", {
      manufacturers,
      manufacturersCount: manufacturers.length,
      catalogPairsCount: catalogPairs.length,
      error,
    });
  }, [manufacturers, catalogPairs, error]);

  useEffect(() => {
    if (!repo) {
      setCatalogPairs([]);
      setCatalogBrowseError(null);
      setLoadingCatalogBrowse(false);
      return;
    }
    let cancelled = false;
    setLoadingCatalogBrowse(true);
    setCatalogBrowseError(null);
    void (async () => {
      const { data, error: err } = await repo.listAllManufacturerModels(productCategorySlug);
      if (cancelled) return;
      setLoadingCatalogBrowse(false);
      if (err) {
        setCatalogPairs([]);
        setCatalogBrowseError(err.message);
        return;
      }
      setCatalogPairs(data);
    })();
    return () => {
      cancelled = true;
    };
  }, [repo, productCategorySlug]);

  useEffect(() => {
    if (!repo) {
      setLoadingManufacturers(false);
      return;
    }
    let cancelled = false;
    setLoadingManufacturers(true);
    setError(null);
    void (async () => {
      const { data, error: err } = await repo.listManufacturers(productCategorySlug);
      if (cancelled) return;
      setLoadingManufacturers(false);
      if (err) {
        setError(err.message);
        setManufacturers([]);
        return;
      }
      setManufacturers(data);
      setError(null);
    })();
    return () => {
      cancelled = true;
    };
  }, [repo, productCategorySlug]);

  useEffect(() => {
    if (!repo) return;
    if (!selectedManufacturer) {
      pendingModelSlugRef.current = null;
      setModels([]);
      setSelectedModelSlug("");
      setRawProducts([]);
      setCompat(EMPTY_COMPAT);
      return;
    }
    let cancelled = false;
    setLoadingModels(true);
    setError(null);
    void (async () => {
      const { data, error: err } = await repo.listSuspensionModels(productCategorySlug, selectedManufacturer);
      if (cancelled) return;
      setLoadingModels(false);
      if (err) {
        pendingModelSlugRef.current = null;
        setError(err.message);
        setModels([]);
        setSelectedModelSlug("");
        return;
      }
      setModels(data);
      setError(null);
      const pending = pendingModelSlugRef.current;
      if (pending && data.some((m) => m.suspension_model_slug === pending)) {
        setSelectedModelSlug(pending);
        pendingModelSlugRef.current = null;
      } else {
        setSelectedModelSlug("");
      }
      setRawProducts([]);
      setCompat(EMPTY_COMPAT);
    })();
    return () => {
      cancelled = true;
    };
  }, [repo, productCategorySlug, selectedManufacturer]);

  const loadProducts = useCallback(async () => {
    if (!repo) {
      setRawProducts([]);
      return;
    }
    if (!selectedManufacturer || !selectedModelSlug) {
      setRawProducts([]);
      return;
    }
    setLoadingProducts(true);
    setError(null);
    const { data, error: err } = await repo.listProducts(
      productCategorySlug,
      selectedManufacturer,
      selectedModelSlug,
    );
    setLoadingProducts(false);
    if (err) {
      setError(err.message);
      setRawProducts([]);
      return;
    }
    setRawProducts(data);
    setCompat(EMPTY_COMPAT);
    setError(null);
  }, [repo, productCategorySlug, selectedManufacturer, selectedModelSlug]);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  const filterOptions = useMemo(() => buildCompatOptionsFromRows(rawProducts), [rawProducts]);
  const filteredProducts = useMemo(() => applyClientCompat(rawProducts, compat), [rawProducts, compat]);

  const onManufacturerChange = (m: string) => {
    pendingModelSlugRef.current = null;
    setSelectedManufacturer(m);
    setSelectedModelSlug("");
    setRawProducts([]);
    setModels([]);
    setCompat(EMPTY_COMPAT);
  };

  const onPickCatalogRow = useCallback(
    async (row: SuspensionModelOption) => {
      if (!repo) return;
      setError(null);

      if (row.manufacturer !== selectedManufacturer) {
        pendingModelSlugRef.current = row.suspension_model_slug;
        setSelectedManufacturer(row.manufacturer);
        return;
      }

      pendingModelSlugRef.current = null;
      if (models.some((m) => m.suspension_model_slug === row.suspension_model_slug)) {
        setSelectedModelSlug(row.suspension_model_slug);
        return;
      }

      setLoadingModels(true);
      const { data, error: err } = await repo.listSuspensionModels(productCategorySlug, row.manufacturer);
      setLoadingModels(false);
      if (err) {
        setError(err.message);
        setModels([]);
        setSelectedModelSlug("");
        return;
      }
      setModels(data);
      setError(null);
      if (data.some((m) => m.suspension_model_slug === row.suspension_model_slug)) {
        setSelectedModelSlug(row.suspension_model_slug);
      } else {
        setSelectedModelSlug("");
      }
      setRawProducts([]);
      setCompat(EMPTY_COMPAT);
    },
    [repo, productCategorySlug, selectedManufacturer, models],
  );

  return (
    <div className="oem-plus-sheet mx-auto max-w-5xl px-4 pb-12 pt-2 text-neutral-200 sm:px-8">
      <div className="oem-plus-head mb-6 border-b border-white/10 pb-4">
        <nav className="flex flex-wrap gap-2 text-sm text-neutral-400" aria-label="Breadcrumb">
          <a className="hover:text-cyan-300" href="../index.html">
            Acasă
          </a>
          <span aria-hidden="true">/</span>
          <a className="hover:text-cyan-300" href="../categorii/suspensie.html">
            Suspensie
          </a>
          <span aria-hidden="true">/</span>
          <span className="text-neutral-200">{title}</span>
        </nav>
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-white sm:text-3xl">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm text-neutral-400">{description}</p>
      </div>

      <main>
        {envErr ? <SupabaseConfigRequiredScreen embedded errorMessage={envErr} tableName={tableName} /> : null}

        <section
          className="oem-plus-card mb-6 rounded-xl border border-white/12 bg-neutral-900/50 px-4 py-4 shadow-sm shadow-black/25 sm:px-5"
          aria-labelledby="oem-dropdowns-heading"
        >
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-neutral-500">Filtre catalog</p>
          <h2 id="oem-dropdowns-heading" className="mt-1 text-base font-semibold tracking-tight text-white sm:text-lg">
            Producător suspensie și model
          </h2>
          <p className="mt-1 max-w-3xl text-xs text-neutral-400">
            Date din <code className="rounded bg-neutral-800 px-1 py-px text-[0.7rem]">public.{tableName}</code> —{" "}
            <code className="rounded bg-neutral-800 px-1 py-px text-[0.7rem]">{productCategorySlug}</code>,{" "}
            <code className="rounded bg-neutral-800 px-1 py-px text-[0.7rem]">frontend_active</code> = true. Fără
            autentificare.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <ManufacturerSelect
              manufacturers={manufacturers}
              value={selectedManufacturer}
              onChange={onManufacturerChange}
              disabled={loadingManufacturers || Boolean(envErr)}
              label="Producător suspensie"
            />
            <SuspensionModelSelect
              models={models}
              valueSlug={selectedModelSlug}
              onChangeSlug={setSelectedModelSlug}
              disabled={loadingModels || !selectedManufacturer || Boolean(envErr)}
              label="Model suspensie"
            />
          </div>
          {envErr ? (
            <p className="mt-3 text-xs text-red-300/95">
              Listele nu se pot umple fără URL + cheie anon în{" "}
              <code className="rounded bg-neutral-900 px-1">assets/js/supabase-config.mjs</code>.
            </p>
          ) : null}
        </section>

        <section
          className="oem-plus-card mb-6 rounded-xl border border-cyan-500/25 bg-cyan-950/15 px-4 py-4 text-sm shadow-sm shadow-black/20"
          aria-labelledby="oem-catalog-browse-heading"
        >
          <h2 id="oem-catalog-browse-heading" className="text-base font-semibold text-cyan-100">
            Producători și modele (din baza de date)
          </h2>
          <p className="mt-1 text-xs text-neutral-400">
            Aceeași sursă ca rubricile de mai sus. «Alege» completează producătorul și modelul în liste.
          </p>
          {loadingCatalogBrowse ? (
            <p className="mt-3 text-neutral-500">Se încarcă…</p>
          ) : envErr ? (
            <p className="mt-3 text-sm text-neutral-400">Tabelul apare după configurarea Supabase (vezi mesajul de mai sus).</p>
          ) : catalogBrowseError ? (
            <div
              className="mt-3 rounded-lg border border-amber-500/40 bg-amber-950/25 px-3 py-2 text-xs text-amber-100"
              role="status"
            >
              <p className="font-medium text-amber-50">Nu s-a putut încărca catalogul</p>
              <p className="mt-1 text-amber-100/90">{catalogBrowseError}</p>
            </div>
          ) : catalogPairs.length === 0 ? (
            <p className="mt-3 text-neutral-500">Nu există perechi producător / model pentru slug-ul curent.</p>
          ) : (
            <div className="mt-3 max-h-[min(22rem,50vh)] overflow-auto rounded-lg border border-white/10">
              <table className="w-full min-w-[28rem] border-collapse text-left text-xs sm:text-sm">
                <thead className="sticky top-0 z-[1] bg-neutral-950/95 backdrop-blur">
                  <tr className="border-b border-white/10 text-neutral-400">
                    <th className="px-3 py-2 font-medium">Producător suspensie</th>
                    <th className="px-3 py-2 font-medium">Model</th>
                    <th className="w-0 px-2 py-2 font-medium whitespace-nowrap" aria-label="Acțiune" />
                  </tr>
                </thead>
                <tbody>
                  {catalogPairs.map((row) => (
                    <tr
                      key={`${row.manufacturer}\0${row.suspension_model_slug}`}
                      className="border-b border-white/[0.06] hover:bg-white/[0.04]"
                    >
                      <td className="px-3 py-2 text-neutral-200">{row.manufacturer}</td>
                      <td className="px-3 py-2 text-neutral-300">{row.suspension_model}</td>
                      <td className="px-2 py-2">
                        <button
                          type="button"
                          className="rounded-md border border-cyan-500/35 bg-cyan-950/40 px-2 py-1 text-[0.7rem] font-medium text-cyan-100 hover:bg-cyan-900/50 sm:text-xs"
                          onClick={() => onPickCatalogRow(row)}
                        >
                          Alege
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {error ? (
          <div
            className="mb-6 rounded-lg border border-red-500/40 bg-red-950/30 px-4 py-3 text-sm text-red-100"
            role="alert"
          >
            {error}
          </div>
        ) : null}

        {!loadingManufacturers && !error && manufacturers.length === 0 && !envErr ? (
          <div className="mt-3 space-y-2 text-sm text-amber-200/90">
            <p>
              Nu s-au găsit producători pentru{" "}
              <code className="rounded bg-neutral-800 px-1 py-0.5 text-amber-100">product_category_slug</code> ={" "}
              <code className="rounded bg-neutral-800 px-1 py-0.5 text-amber-100">{productCategorySlug}</code> și{" "}
              <code className="rounded bg-neutral-800 px-1 py-0.5 text-amber-100">frontend_active</code> = true în{" "}
              <code className="rounded bg-neutral-800 px-1 py-0.5">{tableName}</code>.
            </p>
            <ul className="list-disc space-y-1 pl-5 text-amber-100/90">
              <li>
                Verifică în Supabase că există rânduri pentru slug-ul și{" "}
                <code className="rounded bg-neutral-900 px-1">frontend_active</code> de mai sus.
              </li>
              <li>
                Dacă în fereastră privată listele sunt populate, probabil e cache în browser: hard refresh sau golește
                cache-ul pentru acest site (un bundle .js vechi poate lăsa mesaje sau stare învechită).
              </li>
              <li>
                Proiect (din <code className="rounded bg-neutral-900 px-1">supabase-config.mjs</code>):{" "}
                <code className="break-all rounded bg-neutral-900 px-1 text-xs">
                  {(() => {
                    if (!envOk) return "";
                    try {
                      return new URL(envOk.url).origin;
                    } catch {
                      return envOk.url;
                    }
                  })()}
                </code>
              </li>
            </ul>
          </div>
        ) : null}

        <SuspensionFilters
          options={filterOptions}
          value={compat}
          onChange={setCompat}
          disabled={!rawProducts.length || loadingProducts}
        />

        <section className="mt-8" aria-live="polite">
          <h2 className="mb-4 text-lg font-semibold text-white">
            Produse
            {selectedModelSlug ? (
              <span className="ml-2 text-sm font-normal text-neutral-500">
                ({filteredProducts.length}
                {filteredProducts.length !== rawProducts.length ? ` din ${rawProducts.length}` : ""})
              </span>
            ) : null}
          </h2>

          {loadingProducts ? (
            <p className="text-sm text-neutral-500">Se încarcă produsele…</p>
          ) : !selectedManufacturer ? (
            <p className="text-sm text-neutral-500">Selectează un producător.</p>
          ) : !selectedModelSlug ? (
            <p className="text-sm text-neutral-500">Selectează un model de suspensie.</p>
          ) : filteredProducts.length === 0 ? (
            <p className="text-sm text-neutral-500">Niciun produs pentru filtrele curente.</p>
          ) : (
            <ul className="grid list-none gap-4 p-0 sm:grid-cols-1">
              {filteredProducts.map((row) => (
                <li key={String(row.id)}>
                  <SuspensionProductCard row={row} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
