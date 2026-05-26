import garageSolutionsLogo from "../../assets/garage-solutions-logo.png";
import { DEFAULT_VEHICLE_ID } from "./data/vehicles";
import { AeroBottomWorkflow } from "./components/AeroBottomWorkflow";
import { AeroCenterViewport } from "./components/AeroCenterViewport";
import { AeroModuleStepper } from "./components/AeroModuleStepper";
import { AeroRightPanel } from "./components/AeroRightPanel";
import { BrakingBottomWorkflow } from "./components/BrakingBottomWorkflow";
import { BrakingCenterViewport } from "./components/BrakingCenterViewport";
import { BrakingModuleStepper } from "./components/BrakingModuleStepper";
import { BrakingRightPanel } from "./components/BrakingRightPanel";
import { AppLeftStrip } from "./components/AppLeftStrip";
import { PerformanceBottomWorkflow } from "./components/PerformanceBottomWorkflow";
import { TransmissionBottomWorkflow } from "./components/TransmissionBottomWorkflow";
import { BottomWorkflow } from "./components/BottomWorkflow";
import { CenterViewport } from "./components/CenterViewport";
import { CompareSetupsModal } from "./components/CompareSetupsModal";
import { LeftStripScrollBridge } from "./components/LeftStripScrollBridge";
import { LeftSidebar } from "./components/LeftSidebar";
import { ModuleEntryCard } from "./components/ModuleEntryCard";
import { PerformanceCenterViewport } from "./components/PerformanceCenterViewport";
import { PerformanceDesignLogo } from "./components/PerformanceDesignLogo";
import { PerformanceModuleStepper } from "./components/PerformanceModuleStepper";
import { PerformanceOeSpecsModal } from "./components/PerformanceOeSpecsModal";
import { PerformanceSetupAssistantPanel } from "./components/PerformanceSetupAssistantPanel";
import { PerformanceTargetModal } from "./components/PerformanceTargetModal";
import { SuspensionDesignLogo } from "./components/SuspensionDesignLogo";
import { DrivetrainConfigModal } from "./components/DrivetrainConfigModal";
import { SuspensionWorkshopModal } from "./components/SuspensionWorkshopModal";
import { OemStandAlignmentModal } from "./components/OemStandAlignmentModal";
import { TiresWheelsConfigModal } from "./components/TiresWheelsConfigModal";
import { VehicleGarageDataModal } from "./components/VehicleGarageDataModal";
import { RightPanel } from "./components/RightPanel";
import { SetupAssistantStepper } from "./components/SetupAssistantStepper";
import { SuspensionManualConfigHydration } from "./components/SuspensionManualConfigHydration";
import { TransmissionCenterViewport } from "./components/TransmissionCenterViewport";
import { TransmissionModuleStepper } from "./components/TransmissionModuleStepper";
import { TransmissionRightPanel } from "./components/TransmissionRightPanel";
import { useEffect } from "react";
import { isAerodynamicsModule, isBrakingModule, isPerformanceModule, isTransmissionModule } from "./lib/garageModuleMode";
import { readSavedCars } from "./lib/garageStorage";
import { useSuspensionStore } from "./store/suspensionStore";

function parseCarIndex(): number | null {
  const raw = new URLSearchParams(window.location.search).get("car");
  if (raw == null || raw === "") return null;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 0) return null;
  return n;
}

function applyCarFromUrl() {
  const idx = parseCarIndex();
  const cars = readSavedCars();
  const st = useSuspensionStore.getState();
  if (idx !== null && idx < cars.length) {
    st.applyGarageSavedIndex(idx);
  } else if (idx !== null && cars.length === 0) {
    /* Lista poate veni async din Supabase — nu reseta garajul încă. */
  } else if (idx !== null) {
    if (cars.length > 0) {
      st.applyGarageSavedIndex(0);
    } else {
      st.applyGarageSavedIndex(null);
      st.resetToPreset(DEFAULT_VEHICLE_ID);
    }
  }
  st.setModuleOpen(true);
}

export function App() {
  const performanceMode = isPerformanceModule();
  const transmissionMode = isTransmissionModule();
  const aerodynamicsMode = isAerodynamicsModule();
  const brakingMode = isBrakingModule();
  const moduleOpen = useSuspensionStore((s) => s.moduleOpen);

  /** Performance / Transmission / Aerodynamics / Braking: deschide direct workspace-ul; Suspension: `#work` + `?car=`. */
  useEffect(() => {
    if (performanceMode || transmissionMode || aerodynamicsMode || brakingMode) {
      applyCarFromUrl();
      return;
    }

    const sync = () => {
      if (window.location.hash !== "#work") return;
      applyCarFromUrl();
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, [performanceMode, transmissionMode, aerodynamicsMode, brakingMode]);

  if (!moduleOpen) {
    return (
      <div
        className="relative flex flex-col items-center justify-center gap-10 overflow-hidden bg-[#06080c] p-8 text-neutral-200"
        style={{ height: "100dvh", minHeight: "100dvh" }}
      >
        <div
          className="pointer-events-none absolute inset-y-0 left-0 z-0 w-20 border-r border-white/[0.07] bg-gradient-to-b from-[#0c121c] via-[#080c14] to-[#06080c] sm:w-24"
          aria-hidden="true"
        />
        <a
          href="../index.html"
          className="absolute left-[calc(5rem+0.5rem)] top-4 z-10 flex shrink-0 rounded-lg border border-white/10 bg-[#0b0f14]/90 p-2 shadow-lg backdrop-blur-sm transition hover:border-cyan-500/35 hover:bg-[#0c1219] sm:left-[calc(6rem+0.5rem)]"
          aria-label="Garage Solutions — acasă"
        >
          <img
            src={garageSolutionsLogo}
            alt="Garage Solutions"
            className="h-8 w-auto max-w-[128px] object-contain sm:h-9 sm:max-w-[148px]"
            width={333}
            height={222}
            decoding="async"
          />
        </a>
        {performanceMode ? (
          <PerformanceDesignLogo variant="full" />
        ) : (
          <SuspensionDesignLogo variant="full" />
        )}
        <ModuleEntryCard />
      </div>
    );
  }

  if (performanceMode) {
    return (
      <div
        className="flex flex-col overflow-visible bg-[#06080c] text-neutral-200"
        style={{ height: "100dvh", minHeight: "100dvh" }}
      >
        <PerformanceModuleStepper />
        <div className="flex min-h-0 min-w-0 flex-1 flex-row overflow-hidden">
          <AppLeftStrip />
          <LeftSidebar variant="garage-only" garageSidebar="performance" />
          <PerformanceCenterViewport />
          <PerformanceSetupAssistantPanel />
        </div>
        <PerformanceBottomWorkflow />
        <PerformanceOeSpecsModal />
        <PerformanceTargetModal />
        <VehicleGarageDataModal />
        <TiresWheelsConfigModal />
        <DrivetrainConfigModal />
        <LeftStripScrollBridge />
      </div>
    );
  }

  if (transmissionMode) {
    return (
      <div
        className="flex flex-col overflow-visible bg-[#06080c] text-neutral-200"
        style={{ height: "100dvh", minHeight: "100dvh" }}
      >
        <TransmissionModuleStepper />
        <div className="flex min-h-0 min-w-0 flex-1 flex-row overflow-hidden">
          <AppLeftStrip />
          <LeftSidebar variant="garage-only" garageSidebar="transmission" />
          <TransmissionCenterViewport />
          <TransmissionRightPanel />
        </div>
        <TransmissionBottomWorkflow />
        <VehicleGarageDataModal />
        <TiresWheelsConfigModal />
        <DrivetrainConfigModal />
        <LeftStripScrollBridge />
      </div>
    );
  }

  if (aerodynamicsMode) {
    return (
      <div
        className="flex flex-col overflow-visible bg-[#06080c] text-neutral-200"
        style={{ height: "100dvh", minHeight: "100dvh" }}
      >
        <AeroModuleStepper />
        <div className="flex min-h-0 min-w-0 flex-1 flex-row overflow-hidden">
          <AppLeftStrip />
          <LeftSidebar variant="garage-only" garageSidebar="aerodynamics" />
          <AeroCenterViewport />
          <AeroRightPanel />
        </div>
        <AeroBottomWorkflow />
        <VehicleGarageDataModal />
        <TiresWheelsConfigModal />
        <DrivetrainConfigModal />
        <LeftStripScrollBridge />
      </div>
    );
  }

  if (brakingMode) {
    return (
      <div
        className="flex flex-col overflow-visible bg-[#06080c] text-neutral-200"
        style={{ height: "100dvh", minHeight: "100dvh" }}
      >
        <BrakingModuleStepper />
        <div className="flex min-h-0 min-w-0 flex-1 flex-row overflow-hidden">
          <AppLeftStrip />
          <LeftSidebar variant="garage-only" garageSidebar="braking" />
          <BrakingCenterViewport />
          <BrakingRightPanel />
        </div>
        <BrakingBottomWorkflow />
        <VehicleGarageDataModal />
        <TiresWheelsConfigModal />
        <DrivetrainConfigModal />
        <LeftStripScrollBridge />
      </div>
    );
  }

  return (
    <div
      className="flex flex-col overflow-visible bg-[#06080c] text-neutral-200"
      style={{ height: "100dvh", minHeight: "100dvh" }}
    >
      <SetupAssistantStepper />
      <SuspensionManualConfigHydration />
      <div className="flex min-h-0 min-w-0 flex-1 flex-row overflow-hidden">
        <AppLeftStrip />
        <LeftSidebar />
        <CenterViewport />
        <RightPanel />
      </div>
      <BottomWorkflow />
      <CompareSetupsModal />
      <VehicleGarageDataModal />
      <TiresWheelsConfigModal />
      <DrivetrainConfigModal />
      <SuspensionWorkshopModal />
      <OemStandAlignmentModal />
      <LeftStripScrollBridge />
    </div>
  );
}
