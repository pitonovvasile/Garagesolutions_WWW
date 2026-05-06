import { VEHICLE_LIST } from "../data/vehicles";
import { useGarageCars } from "../hooks/useGarageCars";
import { formatSavedCarLabel, readSavedCars } from "../lib/garageStorage";
import { useSuspensionStore } from "../store/suspensionStore";
import { ModuleEntryCard } from "./ModuleEntryCard";

const ARCH_LABEL: Record<string, string> = {
  double_wishbone: "Double Wishbone",
  macpherson: "MacPherson",
  multi_link: "Multi-link",
};

const LAYOUT_LABEL: Record<string, string> = {
  coilover: "Coilover",
  separate: "Spring + damper separate",
};

export function LeftSidebar() {
  const garageCars = useGarageCars();
  const vehicleId = useSuspensionStore((s) => s.vehicleId);
  const setVehicleId = useSuspensionStore((s) => s.setVehicleId);
  const garageCarIndex = useSuspensionStore((s) => s.garageCarIndex);
  const applyGarageSavedIndex = useSuspensionStore((s) => s.applyGarageSavedIndex);
  const axle = useSuspensionStore((s) => s.axle);
  const setAxle = useSuspensionStore((s) => s.setAxle);
  const setLibraryOpen = useSuspensionStore((s) => s.setLibraryOpen);
  const workflow = useSuspensionStore((s) => s.workflow);
  const setModuleOpen = useSuspensionStore((s) => s.setModuleOpen);

  const vehicle = VEHICLE_LIST.find((v) => v.id === vehicleId) ?? VEHICLE_LIST[0]!;
  const ap = axle === "front" ? vehicle.front : vehicle.rear;

  const garageSelectValue =
    garageCarIndex !== null && garageCarIndex >= 0 && garageCarIndex < garageCars.length
      ? String(garageCarIndex)
      : "__none__";

  return (
    <aside className="flex w-[280px] shrink-0 flex-col border-r border-white/10 bg-[#0b0f14]">
      <div className="border-b border-white/10 p-3">
        <ModuleEntryCard compact />
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        <section className="mb-6">
          <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-400/90">
            Mașini din garaj
          </h2>
          <label className="sr-only" htmlFor="sd-garage-car">
            Alege mașina salvată pe site
          </label>
          <select
            id="sd-garage-car"
            className="mb-2 w-full rounded-lg border border-white/10 bg-black/40 px-2 py-2 text-sm text-white outline-none focus:border-cyan-500/40"
            value={garageSelectValue}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "__none__") applyGarageSavedIndex(null);
              else applyGarageSavedIndex(Number(v));
            }}
          >
            <option value="__none__">— Nu lega de mașină salvată —</option>
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
          <p className="text-[11px] leading-relaxed text-neutral-500">
            Lista vine din același <span className="text-neutral-400">localStorage</span> ca garajul
            principal. Alegerea setează un preset geometric estimat; îl poți schimba mai jos.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-400/90">
            Preset geometric (stock)
          </h2>
          <label className="sr-only" htmlFor="sd-vehicle-preset">
            Tip șasiu / geometrie
          </label>
          <select
            id="sd-vehicle-preset"
            className="mb-2 w-full rounded-lg border border-white/10 bg-black/40 px-2 py-2 text-sm text-white outline-none focus:border-cyan-500/40"
            value={vehicleId}
            onChange={(e) => setVehicleId(e.target.value)}
          >
            {VEHICLE_LIST.map((v) => (
              <option key={v.id} value={v.id}>
                {v.label}
              </option>
            ))}
          </select>
          <p className="text-[11px] leading-relaxed text-neutral-500">
            Geometrie de bază față/spate pentru simulare; o poți rafina în Design (tragere puncte).
          </p>
        </section>

        <section className="mb-6">
          <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-400/90">
            Suspension setup
          </h2>
          <div className="mb-2 flex rounded-lg border border-white/10 p-0.5">
            {(["front", "rear"] as const).map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setAxle(a)}
                className={[
                  "flex-1 rounded-md py-2 text-xs font-semibold uppercase tracking-wide",
                  axle === a
                    ? "bg-cyan-500/20 text-white"
                    : "text-neutral-500 hover:text-neutral-300",
                ].join(" ")}
              >
                {a}
              </button>
            ))}
          </div>
          <div className="rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-xs text-neutral-300">
            <div className="font-medium text-white">{ARCH_LABEL[ap.type] ?? ap.type}</div>
            <div className="mt-1 text-[11px] text-neutral-500">{LAYOUT_LABEL[ap.layout] ?? ap.layout}</div>
          </div>
        </section>

        <section className="mb-6">
          <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-400/90">
            Library
          </h2>
          <div className="space-y-1">
            {(
              [
                ["springs", "Springs"] as const,
                ["dampers", "Dampers"] as const,
                ["plates", "Camber Plates"] as const,
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setLibraryOpen(key)}
                className="w-full rounded-lg px-3 py-2 text-left text-sm text-neutral-300 transition hover:bg-white/5 hover:text-white"
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-400/90">
            My Setups
          </h2>
          <button
            type="button"
            className="mb-1 w-full rounded-lg px-3 py-2 text-left text-sm text-neutral-300 hover:bg-white/5"
            onClick={() =>
              alert("Saved setups: poți lega de localStorage / API în producție.")
            }
          >
            Saved Setups
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              className="flex-1 rounded-lg border border-white/10 bg-white/5 py-2 text-xs font-medium text-neutral-200 hover:bg-white/10"
              onClick={() => {
                const j = prompt("Paste JSON setup:");
                if (j) console.info("Import", j);
              }}
            >
              Import
            </button>
            <button
              type="button"
              className="flex-1 rounded-lg border border-cyan-500/30 bg-cyan-500/10 py-2 text-xs font-medium text-cyan-100 hover:bg-cyan-500/20"
              onClick={() => {
                const st = useSuspensionStore.getState();
                const cars = readSavedCars();
                const savedSnap =
                  st.garageCarIndex !== null && st.garageCarIndex < cars.length
                    ? cars[st.garageCarIndex]
                    : null;
                const blob = new Blob(
                  [
                    JSON.stringify(
                      {
                        vehicleId: st.vehicleId,
                        garageCarIndex: st.garageCarIndex,
                        savedGarageCar: savedSnap,
                        axle: st.axle,
                        points: st.points,
                        wf: workflow,
                        springId: st.springId,
                        damperId: st.damperId,
                        at: new Date().toISOString(),
                      },
                      null,
                      2,
                    ),
                  ],
                  { type: "application/json" },
                );
                const a = document.createElement("a");
                a.href = URL.createObjectURL(blob);
                a.download = "suspension-vehicle-setup.json";
                a.click();
                URL.revokeObjectURL(a.href);
              }}
            >
              Export
            </button>
          </div>
        </section>

        <a
          className="mt-4 inline-flex w-full items-center justify-center rounded-lg border border-white/10 py-2 text-xs text-neutral-400 transition hover:border-cyan-500/30 hover:text-cyan-200"
          href="../garage.html"
        >
          ← Înapoi la garaj
        </a>
        <button
          type="button"
          className="mt-2 w-full rounded-lg border border-white/10 py-2 text-xs text-neutral-400 hover:bg-white/5 hover:text-neutral-200"
          onClick={() => {
            setModuleOpen(false);
            try {
              window.location.hash = "";
            } catch {
              /* ignore */
            }
          }}
        >
          Închide modulul (launcher)
        </button>
      </div>
    </aside>
  );
}
