import { useTransmissionDrivetrainProfile } from "../hooks/useTransmissionDrivetrainProfile";
import { formatTransmissionDisplay } from "../lib/transmissionDrivetrainProfile";
import { useSuspensionAssistantStore } from "../store/suspensionAssistantStore";
import { GarageWorkspaceSidebarStack } from "./GarageWorkspaceSidebarStack";
import { PerformanceSummaryCard, PerformanceSummaryCardRows } from "./PerformanceSummaryCard";

export function TransmissionSidebarPanels() {
  const { profile, linkedCar } = useTransmissionDrivetrainProfile();
  const setDrivetrainModalOpen = useSuspensionAssistantStore((s) => s.setDrivetrainModalOpen);

  const oeRows = [
    { label: "Transmission", value: formatTransmissionDisplay(profile) },
    { label: "Drivetrain", value: profile.drivetrainType },
    { label: "Transfer case", value: profile.transferCaseStatus },
    { label: "Front diff", value: profile.frontDifferentialType },
    { label: "Rear diff", value: profile.rearDifferentialType },
    { label: "Center / coupling", value: profile.centerDiffOrCoupling },
  ];

  return (
    <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col gap-2 overflow-hidden">
      <GarageWorkspaceSidebarStack
        hint={
          !linkedCar ? (
            <p className="shrink-0 rounded-md border border-violet-500/20 bg-violet-500/[0.06] px-2 py-1.5 text-[9px] leading-relaxed text-neutral-400">
              Alege o mașină din selectorul Garaj pentru a detecta transmisia, drivetrain-ul AWD/4x4 și fitment-ul.
            </p>
          ) : null
        }
      >
        <PerformanceSummaryCard
          title="OE Drivetrain (Factory)"
          actionLabel="View drivetrain data"
          compact
          onAction={() => {
            document.getElementById("tx-center-drivetrain-data")?.scrollIntoView({ behavior: "smooth" });
          }}
        >
          <PerformanceSummaryCardRows rows={oeRows} compact />
        </PerformanceSummaryCard>
      </GarageWorkspaceSidebarStack>

      <button
        type="button"
        onClick={() => setDrivetrainModalOpen(true)}
        className="mx-1.5 shrink-0 rounded-md border border-cyan-500/25 bg-cyan-500/[0.06] px-2 py-1.5 text-[9px] font-semibold uppercase tracking-wide text-cyan-200/90 transition hover:bg-cyan-500/10"
      >
        View drivetrain diagram
      </button>
    </div>
  );
}
