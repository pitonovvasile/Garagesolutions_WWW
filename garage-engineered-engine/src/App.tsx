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
import { GarageEngineBootScreen } from "./components/GarageEngineBootScreen";
import { LeftStripScrollBridge } from "./components/LeftStripScrollBridge";
import { LeftSidebar } from "./components/LeftSidebar";
import { PerformanceCenterViewport } from "./components/PerformanceCenterViewport";
import { PerformanceModuleStepper } from "./components/PerformanceModuleStepper";
import { PerformanceOeSpecsModal } from "./components/PerformanceOeSpecsModal";
import { PerformanceSetupAssistantPanel } from "./components/PerformanceSetupAssistantPanel";
import { PerformanceTargetModal } from "./components/PerformanceTargetModal";
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
import { useEffect, useState } from "react";
import { loadInitialGarageData } from "./lib/garageInitialLoad";
import { isAerodynamicsModule, isBrakingModule, isPerformanceModule, isTransmissionModule } from "./lib/garageModuleMode";
import { readSavedCars } from "./lib/garageStorage";
import { useSuspensionStore } from "./store/suspensionStore";

const BOOT_MIN_MS = 900;
const MODULE_WORKSPACE_CLASS = "flex h-full min-h-0 flex-col overflow-hidden bg-[#06080c] text-neutral-200";

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

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
  const [bootComplete, setBootComplete] = useState(false);
  const bootActive = !moduleOpen || !bootComplete;
  const withBoot = (children?: JSX.Element) => (
    <div data-garage-engine-root-shell className="h-[100dvh] min-h-0 overflow-hidden bg-[#06080c] text-neutral-200">
      <GarageEngineBootScreen key="engine-boot" active={bootActive} />
      {children}
    </div>
  );

  /** Ține ecranul de boot până se termină încărcarea app + sincronizarea inițială cu DB-ul. */
  useEffect(() => {
    let cancelled = false;

    (async () => {
      await Promise.all([loadInitialGarageData(), wait(BOOT_MIN_MS)]);
      if (cancelled) return;
      applyCarFromUrl();
      setBootComplete(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [performanceMode, transmissionMode, aerodynamicsMode, brakingMode]);

  if (bootActive) {
    return withBoot();
  }

  if (performanceMode) {
    return withBoot(
      <div
        key="workspace"
        className={MODULE_WORKSPACE_CLASS}
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
      </div>,
    );
  }

  if (transmissionMode) {
    return withBoot(
      <div
        key="workspace"
        className={MODULE_WORKSPACE_CLASS}
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
      </div>,
    );
  }

  if (aerodynamicsMode) {
    return withBoot(
      <div
        key="workspace"
        className={MODULE_WORKSPACE_CLASS}
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
      </div>,
    );
  }

  if (brakingMode) {
    return withBoot(
      <div
        key="workspace"
        className={MODULE_WORKSPACE_CLASS}
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
      </div>,
    );
  }

  return withBoot(
    <div
      key="workspace"
      className={MODULE_WORKSPACE_CLASS}
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
    </div>,
  );
}
