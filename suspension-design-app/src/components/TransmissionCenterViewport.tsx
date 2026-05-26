import { useEffect, useMemo, useState, type ReactNode } from "react";
import transmissionIcon from "../../../assets/transmission-icon.png";
import {
  buildCatalogGroups,
  buildRecommendedCards,
  TRANSMISSION_NAV_SECTIONS,
  type TransmissionCatalogGroup,
  type TransmissionNavSectionId,
} from "../data/transmissionCatalogStructure";
import { useTransmissionDrivetrainProfile } from "../hooks/useTransmissionDrivetrainProfile";
import {
  extractProductBrand,
  extractProductName,
  extractProductPrice,
  fetchTransmissionProducts,
  filterTransmissionProducts,
  type TransmissionProductRow,
} from "../services/transmissionProductsClient";
import { useTransmissionStore } from "../store/transmissionStore";
import { useSuspensionAssistantStore } from "../store/suspensionAssistantStore";
import {
  DrivetrainSummaryCompact,
  TransmissionBadge,
  TransmissionConfigurationFlow,
} from "./transmission/TransmissionUi";

const OBSERVER_SECTIONS: TransmissionNavSectionId[] = [
  ...TRANSMISSION_NAV_SECTIONS.map((s) => s.id),
  "products",
];

function SectionPanel({
  id,
  title,
  subtitle,
  children,
  accent = false,
  subdued = false,
}: {
  id: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  accent?: boolean;
  subdued?: boolean;
}) {
  return (
    <section
      id={id}
      className={[
        "scroll-mt-3 rounded-lg border bg-[#080c11]/60 p-3 sm:p-4",
        accent ? "border-violet-500/25 shadow-[0_0_24px_rgba(124,58,237,0.08)]" : "",
        subdued ? "border-white/[0.06] opacity-90" : "border-white/10",
      ].join(" ")}
      aria-labelledby={`${id}-title`}
    >
      <h2
        id={`${id}-title`}
        className={[
          "text-[11px] font-semibold uppercase tracking-[0.14em]",
          accent ? "text-violet-100" : "text-neutral-100",
        ].join(" ")}
      >
        {title}
      </h2>
      {subtitle ? <p className="mt-1 text-[10px] leading-relaxed text-neutral-500">{subtitle}</p> : null}
      <div className={subtitle ? "mt-3" : "mt-3"}>{children}</div>
    </section>
  );
}

function CatalogGroupBlock({
  group,
  onItemClick,
  maxItems = 8,
}: {
  group: TransmissionCatalogGroup;
  onItemClick: (item: { dbCategoryKey: string; dbSubcategory?: string; label: string }) => void;
  maxItems?: number;
}) {
  const visibleItems = group.items
    .filter((i) => !i.hidden)
    .sort((a, b) => Number(a.dimmed) - Number(b.dimmed))
    .slice(0, maxItems);
  if (!visibleItems.length) return null;

  return (
    <article
      className={[
        "rounded-lg border bg-gradient-to-b from-[#111827]/80 to-[#0f172a]/90 p-3 transition hover:border-violet-500/45 hover:shadow-[0_0_18px_rgba(124,58,237,0.1)]",
        group.priority === "tertiary" ? "border-white/[0.06] opacity-75" : "border-violet-500/20",
      ].join(" ")}
    >
      <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-100">
        <span className="mr-1.5" aria-hidden>
          {group.icon}
        </span>
        {group.title}
      </h3>
      <div className="grid gap-1">
        {visibleItems.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => onItemClick(item)}
            className={[
              "flex flex-wrap items-center justify-between gap-1 rounded-md border border-white/10 bg-black/20 px-2 py-1.5 text-left transition hover:border-violet-500/40 hover:text-white",
              item.dimmed ? "opacity-50" : "",
            ].join(" ")}
          >
            <span className="text-[10px] text-neutral-200">{item.label}</span>
            <span className="flex flex-wrap gap-1">
              {(item.badges ?? ["service"]).slice(0, 2).map((b) => (
                <TransmissionBadge key={b} tone={b} />
              ))}
            </span>
          </button>
        ))}
      </div>
    </article>
  );
}

export function TransmissionCenterViewport() {
  const { profile } = useTransmissionDrivetrainProfile();
  const setDrivetrainModalOpen = useSuspensionAssistantStore((s) => s.setDrivetrainModalOpen);

  const searchQuery = useTransmissionStore((s) => s.searchQuery);
  const brandFilter = useTransmissionStore((s) => s.brandFilter);
  const priceBand = useTransmissionStore((s) => s.priceBand);
  const drivetrainDetailsExpanded = useTransmissionStore((s) => s.drivetrainDetailsExpanded);
  const workflowStepIndex = useTransmissionStore((s) => s.workflowStepIndex);
  const setSearchQuery = useTransmissionStore((s) => s.setSearchQuery);
  const setBrandFilter = useTransmissionStore((s) => s.setBrandFilter);
  const setPriceBand = useTransmissionStore((s) => s.setPriceBand);
  const setActiveSection = useTransmissionStore((s) => s.setActiveSection);
  const setDrivetrainDetailsExpanded = useTransmissionStore((s) => s.setDrivetrainDetailsExpanded);
  const setWorkflowStepIndex = useTransmissionStore((s) => s.setWorkflowStepIndex);

  const recommended = useMemo(() => buildRecommendedCards(profile), [profile]);
  const catalogGroups = useMemo(() => buildCatalogGroups(profile), [profile]);
  const awdGroups = useMemo(
    () => catalogGroups.filter((g) => g.id === "awd-transfer" || (profile.isAwdFamily && g.id === "differentials")),
    [catalogGroups, profile.isAwdFamily],
  );
  const upgradeGroups = useMemo(
    () => catalogGroups.filter((g) => g.id === "performance-upgrades"),
    [catalogGroups],
  );
  const catalogGroupsMain = useMemo(
    () =>
      catalogGroups.filter(
        (g) => !["performance-upgrades"].includes(g.id),
      ),
    [catalogGroups],
  );

  const [activeQuery, setActiveQuery] = useState({ category: "", subcategory: "", label: "" });
  const [loadedRows, setLoadedRows] = useState<TransmissionProductRow[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState<string | null>(null);

  const filteredRows = useMemo(
    () =>
      filterTransmissionProducts(loadedRows, {
        query: searchQuery,
        brand: brandFilter,
        priceBand,
      }),
    [loadedRows, searchQuery, brandFilter, priceBand],
  );

  const brandOptions = useMemo(
    () =>
      Array.from(new Set(loadedRows.map((r) => extractProductBrand(r)).filter(Boolean))).sort((a, b) =>
        a.localeCompare(b),
      ),
    [loadedRows],
  );

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target?.id) {
          const id = visible.target.id.replace("tx-center-", "") as TransmissionNavSectionId;
          if (OBSERVER_SECTIONS.includes(id)) setActiveSection(id);
        }
      },
      { root: null, rootMargin: "-12% 0px -58% 0px", threshold: [0.08, 0.2, 0.45] },
    );

    for (const id of OBSERVER_SECTIONS) {
      const el = document.getElementById(`tx-center-${id}`);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [setActiveSection]);

  async function loadProducts(item: { dbCategoryKey: string; dbSubcategory?: string; label: string }) {
    const sub = item.dbSubcategory ?? item.label;
    setActiveQuery({ category: item.dbCategoryKey, subcategory: sub, label: item.label });
    setProductsLoading(true);
    setProductsError(null);
    setWorkflowStepIndex(2);
    setActiveSection("products");
    document.getElementById("tx-center-products")?.scrollIntoView({ behavior: "smooth" });

    const { rows, error } = await fetchTransmissionProducts(item.dbCategoryKey, sub);
    setLoadedRows(rows);
    setProductsError(error);
    setProductsLoading(false);
    setBrandFilter("");
  }

  function scrollTo(id: TransmissionNavSectionId, stepIndex?: number) {
    setActiveSection(id);
    if (stepIndex !== undefined) setWorkflowStepIndex(stepIndex);
    document.getElementById(`tx-center-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function expandDrivetrainDetails() {
    const next = !drivetrainDetailsExpanded;
    setDrivetrainDetailsExpanded(next);
    if (next) scrollTo("drivetrain-data", 0);
  }

  return (
    <main className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[#06080c]">
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-2 sm:p-3">
        <div className="mx-auto flex max-w-6xl flex-col gap-2.5">
          <SectionPanel id="tx-center-overview" title="Transmission & AWD Drivetrain Setup">
            <div className="grid gap-3 lg:grid-cols-[1fr_5.5rem] lg:items-start">
              <div>
                <h1 className="text-lg font-semibold uppercase tracking-wide text-white sm:text-xl">
                  Transmission &amp; AWD Drivetrain Setup
                </h1>
                <p className="mt-1 max-w-xl text-[10px] leading-relaxed text-neutral-400">
                  Service, catalog and upgrade paths for transmission, transfer case and differentials — driven by your
                  vehicle&apos;s AWD / 4x4 layout.
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setDrivetrainDetailsExpanded(true);
                      scrollTo("drivetrain-data", 0);
                    }}
                    className="rounded-full border border-cyan-500/35 bg-cyan-500/10 px-2.5 py-1 text-[8px] font-semibold uppercase tracking-[0.12em] text-cyan-100 transition hover:bg-cyan-500/20"
                  >
                    View drivetrain data
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollTo("recommended", 1)}
                    className="rounded-full border border-violet-500/35 bg-violet-500/10 px-2.5 py-1 text-[8px] font-semibold uppercase tracking-[0.12em] text-violet-100 transition hover:bg-violet-500/20"
                  >
                    Start AWD drivetrain check
                  </button>
                </div>
              </div>
              <img
                src={transmissionIcon}
                alt=""
                className="mx-auto h-[5.5rem] w-[5.5rem] rounded-lg border border-violet-500/30 bg-[#0c1219] object-contain p-1.5 shadow-[0_0_20px_rgba(124,58,237,0.14)] lg:mx-0"
              />
            </div>

            <div className="mt-2.5">
              <DrivetrainSummaryCompact
                profile={profile}
                expanded={drivetrainDetailsExpanded}
                onToggleExpand={expandDrivetrainDetails}
              />
            </div>
          </SectionPanel>

          <SectionPanel
            id="tx-center-recommended"
            title="Recommended for this drivetrain"
            subtitle="Service and upgrade paths generated from the selected AWD / 4x4 layout."
            accent
          >
            <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">
              {recommended.map((card) => (
                <article
                  key={card.id}
                  className="rounded-lg border border-violet-500/30 bg-gradient-to-b from-[#141c2b]/90 to-[#0f172a]/95 p-3 shadow-[0_0_16px_rgba(124,58,237,0.12)]"
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <h3 className="text-[11px] font-semibold uppercase tracking-wide text-neutral-50">{card.title}</h3>
                    <TransmissionBadge tone={card.badge} />
                  </div>
                  <ul className="space-y-0.5">
                    {card.items.map((item) => (
                      <li key={item} className="text-[10px] text-neutral-300">
                        · {item}
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </SectionPanel>

          <div id="tx-center-flow">
            <TransmissionConfigurationFlow
              activeStepIndex={workflowStepIndex}
              onStepClick={(section, stepIndex) => scrollTo(section, stepIndex)}
            />
          </div>

          <SectionPanel id="tx-center-catalog" title="Parts catalog">
            <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">
              {catalogGroupsMain.map((group) => (
                <CatalogGroupBlock key={group.id} group={group} onItemClick={(item) => void loadProducts(item)} />
              ))}
            </div>
          </SectionPanel>

          {profile.isAwdFamily ? (
            <SectionPanel
              id="tx-center-awd-systems"
              title="AWD / 4x4 systems"
              subtitle="Transfer case, coupling and axle systems to verify for this layout."
            >
              <div className="grid gap-2.5 md:grid-cols-2">
                {awdGroups.map((group) => (
                  <CatalogGroupBlock key={group.id} group={group} onItemClick={(item) => void loadProducts(item)} />
                ))}
              </div>
            </SectionPanel>
          ) : (
            <SectionPanel id="tx-center-awd-systems" title="AWD / 4x4 systems" subdued>
              <p className="text-[10px] text-neutral-500">
                No AWD / 4x4 layout detected. Related categories remain in the catalog when applicable.
              </p>
            </SectionPanel>
          )}

          <SectionPanel id="tx-center-upgrades" title="Upgrade paths">
            <div className="grid gap-2.5 md:grid-cols-2">
              {upgradeGroups.map((group) => (
                <CatalogGroupBlock key={group.id} group={group} onItemClick={(item) => void loadProducts(item)} />
              ))}
            </div>
          </SectionPanel>

          <SectionPanel id="tx-center-drivetrain-data" title="Drivetrain data" subdued>
            {drivetrainDetailsExpanded ? (
              <>
                <p className="text-[10px] text-neutral-400">
                  Resolved from garage vehicle metadata — no model-specific hardcoding.
                </p>
                <button
                  type="button"
                  onClick={() => setDrivetrainModalOpen(true)}
                  className="mt-2 text-[9px] font-semibold uppercase tracking-wide text-violet-300/90 hover:text-violet-200"
                >
                  Open drivetrain diagram →
                </button>
              </>
            ) : (
              <p className="text-[10px] text-neutral-500">
                Use <strong className="font-semibold text-neutral-400">Expand drivetrain details</strong> in the summary
                above to view full technical data.
              </p>
            )}
          </SectionPanel>

          <SectionPanel id="tx-center-products" title="Product results" subdued>
            <div className="mb-2 grid gap-2 md:grid-cols-3">
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search transmission catalog..."
                className="rounded-md border border-white/10 bg-black/30 px-2.5 py-1.5 text-[10px] text-white outline-none focus:border-violet-500/40"
              />
              <select
                value={brandFilter}
                onChange={(e) => setBrandFilter(e.target.value)}
                className="rounded-md border border-white/10 bg-black/30 px-2.5 py-1.5 text-[10px] text-white outline-none focus:border-violet-500/40"
              >
                <option value="">All brands</option>
                {brandOptions.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
              <select
                value={priceBand}
                onChange={(e) => setPriceBand(e.target.value as typeof priceBand)}
                className="rounded-md border border-white/10 bg-black/30 px-2.5 py-1.5 text-[10px] text-white outline-none focus:border-violet-500/40"
              >
                <option value="">All prices</option>
                <option value="0-500">0 - 500 RON</option>
                <option value="500-1000">500 - 1000 RON</option>
                <option value="1000+">1000+ RON</option>
              </select>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/20 p-2.5">
              {productsLoading ? (
                <p className="text-[10px] text-neutral-400">Loading products…</p>
              ) : activeQuery.category ? (
                <>
                  <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-wide text-violet-300/90">
                    {activeQuery.label || activeQuery.subcategory} · {filteredRows.length} result(s)
                  </p>
                  {productsError ? (
                    <p className="text-[10px] text-red-300/90">{productsError}</p>
                  ) : filteredRows.length ? (
                    <ul className="space-y-1 text-[10px] text-neutral-200">
                      {filteredRows.map((row, i) => {
                        const price = extractProductPrice(row);
                        return (
                          <li key={i} className="rounded-md border border-white/[0.06] bg-black/20 px-2 py-1">
                            <strong>{extractProductName(row)}</strong>
                            <span className="text-neutral-500">
                              {" "}
                              — {extractProductBrand(row) || "n/a"} —{" "}
                              {price !== null ? `${price} RON` : "price n/a"}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="text-[10px] text-neutral-400">No products found.</p>
                  )}
                </>
              ) : (
                <p className="text-[10px] text-neutral-400">Select a catalog item to load compatible products.</p>
              )}
            </div>
          </SectionPanel>

          <SectionPanel id="tx-center-saved" title="Saved setup" subdued>
            <p className="text-[10px] leading-relaxed text-neutral-400">
              Link service items and upgrade parts to the selected vehicle, then save or buy from the workflow.
            </p>
            <button
              type="button"
              disabled
              className="mt-2 cursor-not-allowed rounded-full border border-white/10 px-2.5 py-1 text-[8px] font-semibold uppercase tracking-[0.12em] text-neutral-500"
            >
              Save transmission setup (coming soon)
            </button>
          </SectionPanel>
        </div>
      </div>
    </main>
  );
}
