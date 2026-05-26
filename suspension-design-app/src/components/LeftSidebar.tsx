import type { SuspensionGoalId } from "../data/suspensionCatalog";
import { getVehicle } from "../data/vehicles";
import { GOAL_OPTIONS, getGarageProfile, presetsForGoal } from "../data/vehicleGarageProfiles";
import { getVehicleStockSuspensionDoc } from "../data/vehicleStockSuspension";
import { useGarageCars } from "../hooks/useGarageCars";
import {
  emitGarageCarsRevalidate,
  formatSavedCarLabel,
  guessVehicleTemplateId,
  parseGarageCarQueryParam,
  presetVehicleDefinitionsFromGarage,
  readSavedCars,
  writeGarageCarQueryParam,
  type SavedGarageCar,
} from "../lib/garageStorage";
import { fetchBmwVariantSuspensionForCar } from "../lib/bmwGarageSuspensionEnrich";
import { garageOemSuspensionFromCar } from "../lib/garageResolvedSuspension";
import { useSuspensionAssistantStore } from "../store/suspensionAssistantStore";
import { useSuspensionStore } from "../store/suspensionStore";
import { useEffect, useMemo, useState } from "react";
import { SaveSuspensionConfigurationButton } from "./SaveSuspensionConfigurationButton";
import { AeroSidebarPanels } from "./AeroSidebarPanels";
import { BrakingSidebarPanels } from "./BrakingSidebarPanels";
import { PerformanceSidebarPanels } from "./PerformanceSidebarPanels";
import { TransmissionSidebarPanels } from "./TransmissionSidebarPanels";
import { VehicleArchitectureTable } from "./VehicleArchitectureTable";
import { VehicleDimensionsMassTables } from "./VehicleDimensionsMassTables";

const ARCH_LABEL: Record<string, string> = {
  double_wishbone: "Double Wishbone",
  macpherson: "MacPherson",
  multi_link: "Multi-link",
};

const LAYOUT_LABEL: Record<string, string> = {
  coilover: "Coilover",
  separate: "Spring + damper separate",
};

type LeftSidebarVariant = "default" | "garage-only";
type GarageSidebarModule = "performance" | "transmission" | "aerodynamics" | "braking";

export function LeftSidebar({
  variant = "default",
  garageSidebar = "performance",
}: {
  variant?: LeftSidebarVariant;
  garageSidebar?: GarageSidebarModule;
}) {
  const garageOnly = variant === "garage-only";
  const garageCars = useGarageCars();
  const vehicleId = useSuspensionStore((s) => s.vehicleId);
  const setVehicleId = useSuspensionStore((s) => s.setVehicleId);
  const garageCarIndex = useSuspensionStore((s) => s.garageCarIndex);
  const applyGarageSavedIndex = useSuspensionStore((s) => s.applyGarageSavedIndex);
  const axle = useSuspensionStore((s) => s.axle);
  const setAxle = useSuspensionStore((s) => s.setAxle);

  const goal = useSuspensionAssistantStore((s) => s.goal);
  const setGoal = useSuspensionAssistantStore((s) => s.setGoal);
  const pathMode = useSuspensionAssistantStore((s) => s.pathMode);
  const setPathMode = useSuspensionAssistantStore((s) => s.setPathMode);
  const activePresetId = useSuspensionAssistantStore((s) => s.activePresetId);
  const setActivePresetId = useSuspensionAssistantStore((s) => s.setActivePresetId);
  const applyPresetToSimulation = useSuspensionAssistantStore((s) => s.applyPresetToSimulation);
  const setStandAlignmentModalOpen = useSuspensionAssistantStore((s) => s.setStandAlignmentModalOpen);
  const stockSetupMode = useSuspensionAssistantStore((s) => s.stockSetupMode);

  const garageSelectValue =
    garageCars.length === 0
      ? "__empty__"
      : String(
          garageCarIndex !== null && garageCarIndex >= 0 && garageCarIndex < garageCars.length
            ? garageCarIndex
            : 0,
        );

  /** Cu mașini în garaj, geometria e mereu legată de rândul selectat — fără «delink» în UI. */
  const garageGeometryLocked = garageCars.length > 0;

  const oemStockDoc = useMemo(() => getVehicleStockSuspensionDoc(vehicleId), [vehicleId]);

  /** Bloc sus sidebar: extins = garaj (rând fix) + axă, OEM, setup assistant; restrâns = doar mașina. */
  const [sidebarTopExpanded, setSidebarTopExpanded] = useState(true);

  /**
   * Garaj: sincronizează din `?car=` la încărcarea listei / navigare browser —
   * nu reseta selecția manuală din dropdown (URL se actualizează la onChange).
   */
  useEffect(() => {
    const syncFromUrl = () => {
      const cars = readSavedCars();
      const st = useSuspensionStore.getState();
      if (cars.length === 0) {
        if (st.garageCarIndex !== null) applyGarageSavedIndex(null);
        return;
      }
      const fromUrl = parseGarageCarQueryParam();
      if (fromUrl !== null && fromUrl < cars.length) {
        if (st.garageCarIndex !== fromUrl) applyGarageSavedIndex(fromUrl);
        return;
      }
      if (st.garageCarIndex === null) {
        applyGarageSavedIndex(0);
        return;
      }
      if (st.garageCarIndex < 0 || st.garageCarIndex >= cars.length) {
        applyGarageSavedIndex(Math.max(0, cars.length - 1));
      }
    };

    syncFromUrl();
    window.addEventListener("popstate", syncFromUrl);
    return () => window.removeEventListener("popstate", syncFromUrl);
  }, [garageCars.length, applyGarageSavedIndex]);

  /** Dacă există legătură garaj, geometria trebuie să fie mereu `guess` pe rândul salvat (repară sesiuni vechi decuplate). */
  useEffect(() => {
    if (garageCarIndex === null) return;
    if (garageCarIndex < 0 || garageCarIndex >= garageCars.length) return;
    const expected = guessVehicleTemplateId(garageCars[garageCarIndex]!);
    if (vehicleId !== expected) applyGarageSavedIndex(garageCarIndex);
  }, [garageCarIndex, garageCars, vehicleId, applyGarageSavedIndex]);

  const presetGeometricOptions = useMemo(
    () => presetVehicleDefinitionsFromGarage(garageCars),
    [garageCars],
  );

  useEffect(() => {
    if (garageGeometryLocked) return;
    const allowed = new Set(presetGeometricOptions.map((v) => v.id));
    if (!allowed.has(vehicleId)) {
      setVehicleId(presetGeometricOptions[0]!.id);
    }
  }, [garageGeometryLocked, presetGeometricOptions, vehicleId, setVehicleId]);

  const vehicle = getVehicle(vehicleId);
  const ap = axle === "front" ? vehicle.front : vehicle.rear;
  const profile = useMemo(() => getGarageProfile(vehicle), [vehicle]);

  const linkedGarageCar = useMemo((): SavedGarageCar | null => {
    if (garageCarIndex === null || garageCarIndex < 0 || garageCarIndex >= garageCars.length) {
      return null;
    }
    return garageCars[garageCarIndex]!;
  }, [garageCarIndex, garageCars]);

  const oemFromCar = useMemo(() => garageOemSuspensionFromCar(linkedGarageCar), [linkedGarageCar]);

  const [oemFetched, setOemFetched] = useState<{ front: string; rear: string } | null>(null);

  useEffect(() => {
    setOemFetched(null);
    if (!linkedGarageCar) return;
    const fromCar = garageOemSuspensionFromCar(linkedGarageCar);
    /** Complet pe ambele axe — nu mai cerem Supabase. Dacă lipsește o axă, completăm din fetch. */
    if (fromCar.front && fromCar.rear) return;

    const o = linkedGarageCar as Record<string, unknown>;
    const hasKey =
      String(
        o.catalog_variant_id ??
          o.catalogVariantId ??
          o.bmw_variant_id ??
          o.bmwVariantId ??
          o.variantId ??
          o.variant_id ??
          "",
      ).trim() ||
      String(
        o.catalog_configuration_id ??
          o.catalogConfigurationId ??
          o.bmw_configuration_id ??
          o.bmwConfigurationId ??
          o.configurationId ??
          o.configuration_id ??
          "",
      ).trim();
    if (!hasKey) return;

    let cancelled = false;
    void (async () => {
      const row = await fetchBmwVariantSuspensionForCar(linkedGarageCar);
      if (cancelled || !row || (!row.front && !row.rear)) return;
      setOemFetched(row);
    })();
    return () => {
      cancelled = true;
    };
  }, [linkedGarageCar]);

  const oemDisplay = useMemo(() => {
    return {
      front: oemFromCar.front || (oemFetched?.front ?? ""),
      rear: oemFromCar.rear || (oemFetched?.rear ?? ""),
    };
  }, [oemFromCar, oemFetched]);

  const goalPresets = goal ? presetsForGoal(goal) : [];

  const oemLine =
    linkedGarageCar != null
      ? axle === "front"
        ? oemDisplay.front || "—"
        : oemDisplay.rear || "—"
      : `${ARCH_LABEL[ap.type] ?? ap.type} · ${LAYOUT_LABEL[ap.layout] ?? ap.layout}`;

  const simLine =
    linkedGarageCar != null
      ? `${ARCH_LABEL[ap.type] ?? ap.type} · ${LAYOUT_LABEL[ap.layout] ?? ap.layout}`
      : null;

  return (
    <aside className="flex w-[280px] shrink-0 flex-col border-r border-white/10 bg-[#0b0f14]">
      {/* Garaj (mereu) + bloc retractabil: axă, OEM, setup assistant */}
      <div
        className={[
          "shrink-0 bg-[#080c11] px-2 py-2",
          sidebarTopExpanded
            ? "border-b border-white/10"
            : "rounded-md border border-white/[0.08] shadow-inner",
        ].join(" ")}
      >
        <div className="flex flex-col gap-1.5">
          <div className="flex min-w-0 items-center gap-1">
            <span className="w-9 shrink-0 text-[8px] font-semibold uppercase leading-tight tracking-wide text-neutral-500">
              Garaj
            </span>
            <label className="sr-only" htmlFor="sd-garage-car">
              Alege mașina salvată pe site
            </label>
            <select
              id="sd-garage-car"
              className="min-w-0 flex-1 rounded-md border border-white/10 bg-black/45 py-1 pl-1.5 pr-1 text-[11px] leading-tight text-white outline-none focus:border-cyan-500/40"
              value={garageSelectValue}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "__empty__") return;
                const idx = Number(v);
                writeGarageCarQueryParam(idx);
                applyGarageSavedIndex(idx);
              }}
            >
              {garageCars.length === 0 ? (
                <option value="__empty__" disabled>
                  Nu există mașini în garaj (salvează din magazin)
                </option>
              ) : (
                garageCars.map((c, i) => (
                  <option key={`${formatSavedCarLabel(c, i)}-${i}`} value={String(i)}>
                    {formatSavedCarLabel(c, i)}
                  </option>
                ))
              )}
            </select>
            {!garageOnly ? (
              <button
                type="button"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-white/10 bg-black/35 text-[11px] text-neutral-400 transition hover:border-cyan-500/35 hover:bg-white/[0.06] hover:text-cyan-200/90"
                aria-expanded={sidebarTopExpanded}
                aria-controls="sd-sidebar-top-expanded-block"
                title={
                  sidebarTopExpanded
                    ? "Restrânge (doar mașina)"
                    : "Extinde: axă, OEM, setup assistant"
                }
                onClick={() => setSidebarTopExpanded((v) => !v)}
              >
                <span
                  className={["inline-block transition-transform", sidebarTopExpanded ? "-rotate-180" : ""].join(" ")}
                  aria-hidden
                >
                  ▾
                </span>
              </button>
            ) : null}
          </div>
          {!garageOnly && sidebarTopExpanded ? (
            <div
              id="sd-sidebar-top-expanded-block"
              className="flex max-h-[min(52vh,440px)] min-h-0 flex-col gap-2 overflow-y-auto overflow-x-hidden border-t border-white/10 pt-2"
            >
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="w-9 shrink-0 text-[8px] font-semibold uppercase leading-tight tracking-wide text-neutral-500">
                    Axă
                  </span>
                  <div className="flex min-w-0 flex-1 rounded-md border border-white/10 p-px">
                    {(["front", "rear"] as const).map((a) => (
                      <button
                        key={a}
                        type="button"
                        onClick={() => setAxle(a)}
                        className={[
                          "flex-1 rounded py-0.5 text-[9px] font-bold uppercase tracking-wide",
                          axle === a ? "bg-cyan-500/25 text-white" : "text-neutral-500 hover:text-neutral-300",
                        ].join(" ")}
                      >
                        {a === "front" ? "Față" : "Spate"}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex min-w-0 items-start gap-1.5">
                  <span className="w-9 shrink-0 pt-0.5 text-[8px] font-semibold uppercase leading-tight tracking-wide text-cyan-600/90">
                    OEM
                  </span>
                  <div className="min-w-0 flex-1">
                    <p
                      className="truncate text-[10px] leading-snug text-neutral-200"
                      title={oemLine}
                    >
                      {linkedGarageCar ? (
                        <>
                          <span className="text-neutral-500">{axle === "front" ? "Față: " : "Spate: "}</span>
                          <span className="font-medium text-white">{oemLine}</span>
                        </>
                      ) : (
                        <span className="text-neutral-300">{oemLine}</span>
                      )}
                    </p>
                    {simLine ? (
                      <p className="mt-0.5 truncate text-[9px] text-neutral-500" title={simLine}>
                        Sim · {axle}: {simLine}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>

              <section className="border-t border-white/[0.07] pt-2">
                <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-400/90">
                  Setup assistant
                </h2>
                <label className="sr-only" htmlFor="sd-goal">
                  Obiectiv setup
                </label>
                <select
                  id="sd-goal"
                  className="mb-2 w-full rounded-lg border border-white/10 bg-black/40 px-2 py-2 text-sm text-white outline-none focus:border-cyan-500/40"
                  value={goal ?? ""}
                  onChange={(e) => setGoal((e.target.value || null) as SuspensionGoalId | null)}
                >
                  <option value="">— Alege obiectiv —</option>
                  {GOAL_OPTIONS.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.label} — {g.hint}
                    </option>
                  ))}
                </select>
                <div className="mb-2 flex rounded-lg border border-white/10 p-0.5">
                  {(["preset", "custom"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPathMode(m)}
                      className={[
                        "flex-1 rounded-md py-1.5 text-[10px] font-semibold uppercase tracking-wide",
                        pathMode === m ? "bg-cyan-500/20 text-white" : "text-neutral-500 hover:text-neutral-300",
                      ].join(" ")}
                    >
                      {m === "preset" ? "Presets" : "Custom"}
                    </button>
                  ))}
                </div>
                {pathMode === "preset" && goal ? (
                  <>
                    <label className="sr-only" htmlFor="sd-goal-preset">
                      Preset for goal
                    </label>
                    <select
                      id="sd-goal-preset"
                      className="mb-2 w-full rounded-lg border border-white/10 bg-black/40 px-2 py-2 text-xs text-white outline-none focus:border-cyan-500/40"
                      value={activePresetId ?? ""}
                      onChange={(e) => setActivePresetId(e.target.value || null)}
                    >
                      {goalPresets.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="mb-2 w-full rounded-lg border border-cyan-500/35 bg-cyan-500/10 py-2 text-xs font-medium text-cyan-100 hover:bg-cyan-500/20"
                      onClick={() => activePresetId && applyPresetToSimulation(activePresetId)}
                    >
                      Apply preset (goal + ținte)
                    </button>
                  </>
                ) : null}
                {pathMode === "custom" ? (
                  <p className="mb-2 text-[10px] text-neutral-500">
                    Fără catalog de piese în app — completează resort / amortizor numeric în panoul din dreapta.
                  </p>
                ) : null}
                <p className="text-[10px] leading-relaxed text-neutral-500">{profile.stockAlignment}</p>
                {oemStockDoc ? (
                  <>
                    <button
                      type="button"
                      className="mt-2 w-full rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-2 text-[10px] font-semibold uppercase tracking-wide text-emerald-100 hover:bg-emerald-500/20"
                      onClick={() => setStandAlignmentModalOpen(true)}
                    >
                      Încarcă baseline OEM (geometrie)
                    </button>
                    {stockSetupMode ? (
                      <p className="text-[9px] leading-relaxed text-emerald-200/80">Mod OEM activ în simulare.</p>
                    ) : null}
                  </>
                ) : null}
              </section>
            </div>
          ) : null}
        </div>
      </div>

      <div
        className={[
          "flex min-h-0 flex-1 flex-col p-2",
          garageOnly ? "min-w-0 overflow-y-auto overflow-x-hidden" : "overflow-y-auto",
        ].join(" ")}
      >
        {garageOnly ? (
          garageSidebar === "transmission" ? (
            <TransmissionSidebarPanels />
          ) : garageSidebar === "aerodynamics" ? (
            <AeroSidebarPanels />
          ) : garageSidebar === "braking" ? (
            <BrakingSidebarPanels />
          ) : (
            <PerformanceSidebarPanels />
          )
        ) : null}
        {!garageOnly && garageCars.length === 0 ? (
          <div className="mb-4 space-y-2 rounded-lg border border-amber-500/25 bg-amber-500/10 p-2.5 text-[10px] leading-relaxed text-amber-50/95">
            <p className="font-medium text-amber-100/95">Nu apar mașinile din garaj?</p>
            <p className="text-neutral-400">
              Garajul se încarcă din <span className="text-neutral-300">Supabase</span> când ești autentificat
              (aceeași sesiune cookie ca pe magazin). Origin curent:{" "}
              <code className="break-all text-cyan-200/85">{typeof window !== "undefined" ? window.location.origin : ""}</code>
              . Fără cont sau fără cookie pe acest host, lista rămâne goală aici.
            </p>
            <p className="text-neutral-500">
              Dacă ești autentificat în cont, lista se poate sincroniza și din{" "}
              <span className="text-neutral-400">Supabase</span> (view{" "}
              <code className="text-neutral-400">user_saved_vehicles_resolved</code> pentru date tehnice; migrări
              garaj în proiectul DB).
            </p>
            <p className="text-neutral-500">
              Deschide modulul din același URL ca magazinul:{" "}
              <code className="text-neutral-400">…/garage/suspension-design.html</code> după{" "}
              <code className="text-neutral-400">npm run preview</code>, sau salvează o mașină din index cât timp ești
              pe același origin.
            </p>
            <div className="flex flex-wrap gap-2 pt-0.5">
              <button
                type="button"
                className="rounded-md border border-amber-400/35 bg-black/30 px-2 py-1.5 text-[10px] font-medium text-amber-100 hover:bg-amber-500/15"
                onClick={() => emitGarageCarsRevalidate()}
              >
                Reîncearcă citirea
              </button>
              <a
                className="inline-flex items-center rounded-md border border-white/15 bg-white/5 px-2 py-1.5 text-[10px] font-medium text-neutral-200 hover:bg-white/10"
                href="../garage.html"
              >
                Deschide garajul
              </a>
            </div>
          </div>
        ) : null}

        {!garageOnly ? (
          <div className="mb-2 flex min-w-0 flex-col gap-2 border-b border-white/10 pb-2">
            <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-cyan-400/85">
              Date vehicul (manual)
            </p>
            <div className="flex min-w-0 flex-col gap-2">
              <VehicleArchitectureTable fullWidth />
              <VehicleDimensionsMassTables fullWidth section="dimensions" />
              <VehicleDimensionsMassTables fullWidth section="mass" />
            </div>
            <div className="mt-2 border-t border-white/10 pt-2">
              <SaveSuspensionConfigurationButton compact />
            </div>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
