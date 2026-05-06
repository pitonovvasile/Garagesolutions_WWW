import { DEFAULT_VEHICLE_ID } from "./data/vehicles";
import { BottomWorkflow } from "./components/BottomWorkflow";
import { CenterViewport } from "./components/CenterViewport";
import { LeftSidebar } from "./components/LeftSidebar";
import { LibraryModal } from "./components/LibraryModal";
import { ModuleEntryCard } from "./components/ModuleEntryCard";
import { RightPanel } from "./components/RightPanel";
import { useEffect } from "react";
import { readSavedCars } from "./lib/garageStorage";
import { useSuspensionStore } from "./store/suspensionStore";

export function App() {
  const moduleOpen = useSuspensionStore((s) => s.moduleOpen);

  /** Preselect garaj din URL (?car= index 0-based, ca în garage-view). */
  useEffect(() => {
    const carParam = new URLSearchParams(window.location.search).get("car");
    if (carParam == null || carParam === "") return;
    const n = Number(carParam);
    if (!Number.isInteger(n) || n < 0) return;
    const cars = readSavedCars();
    if (n >= cars.length) return;
    useSuspensionStore.getState().applyGarageSavedIndex(n);
  }, []);

  useEffect(() => {
    const parseCarIndex = (): number | null => {
      const raw = new URLSearchParams(window.location.search).get("car");
      if (raw == null || raw === "") return null;
      const n = Number(raw);
      if (!Number.isInteger(n) || n < 0) return null;
      return n;
    };

    const sync = () => {
      if (window.location.hash !== "#work") return;
      const idx = parseCarIndex();
      const cars = readSavedCars();
      const st = useSuspensionStore.getState();
      if (idx !== null && idx < cars.length) {
        st.applyGarageSavedIndex(idx);
      } else {
        if (idx !== null) st.applyGarageSavedIndex(null);
        st.resetToPreset(DEFAULT_VEHICLE_ID);
      }
      st.setModuleOpen(true);
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") useSuspensionStore.getState().setLibraryOpen(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!moduleOpen) {
    return (
      <div
        className="flex items-center justify-center overflow-hidden bg-[#06080c] p-8 text-neutral-200"
        style={{ height: "100dvh", minHeight: "100dvh" }}
      >
        <ModuleEntryCard />
      </div>
    );
  }

  return (
    <div
      className="flex flex-col overflow-hidden bg-[#06080c] text-neutral-200"
      style={{ height: "100dvh", minHeight: "100dvh" }}
    >
      <div className="flex min-h-0 min-w-0 flex-1 flex-row overflow-hidden">
        <LeftSidebar />
        <CenterViewport />
        <RightPanel />
      </div>
      <BottomWorkflow />
      <LibraryModal />
    </div>
  );
}
