import type { TransmissionDrivetrainProfile } from "../../lib/transmissionDrivetrainProfile";
import { formatTransmissionDisplay } from "../../lib/transmissionDrivetrainProfile";
import type { TransmissionBadgeTone } from "../../data/transmissionCatalogStructure";
import {
  TRANSMISSION_CONFIG_FLOW,
  transmissionBadgeClass,
  transmissionBadgeLabel,
  type TransmissionNavSectionId,
} from "../../data/transmissionCatalogStructure";

export function TransmissionBadge({ tone }: { tone: TransmissionBadgeTone }) {
  return (
    <span
      className={[
        "inline-flex shrink-0 rounded border px-1.5 py-0.5 text-[7px] font-semibold uppercase tracking-[0.08em]",
        transmissionBadgeClass(tone),
      ].join(" ")}
    >
      {transmissionBadgeLabel(tone)}
    </span>
  );
}

function TransmissionTechChip({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1 rounded-md border border-cyan-500/20 bg-cyan-500/[0.06] px-2 py-1">
      <span className="shrink-0 text-[7px] font-semibold uppercase tracking-wide text-neutral-500">{label}</span>
      <span className="truncate text-[9px] font-medium text-cyan-100/90">{value}</span>
    </span>
  );
}

export function DrivetrainSummaryCompact({
  profile,
  expanded,
  onToggleExpand,
}: {
  profile: TransmissionDrivetrainProfile;
  expanded: boolean;
  onToggleExpand: () => void;
}) {
  const chips = [
    ["Vehicle", profile.vehicleLabel],
    ["Transmission", formatTransmissionDisplay(profile)],
    ["Drivetrain", profile.drivetrainType],
    ["Transfer case", profile.transferCaseStatus],
    ["Front diff", profile.frontDifferentialType],
    ["Rear diff", profile.rearDifferentialType],
    ["Center diff / coupling", profile.centerDiffOrCoupling],
    ["Fitment", profile.fitmentMode],
  ] as const;

  return (
    <div className="rounded-lg border border-cyan-500/15 bg-cyan-500/[0.03] px-2.5 py-2">
      <div className="flex flex-wrap gap-1.5">
        {chips.map(([label, value]) => (
          <TransmissionTechChip key={label} label={label} value={value} />
        ))}
      </div>
      <button
        type="button"
        onClick={onToggleExpand}
        className="mt-2 text-[8px] font-semibold uppercase tracking-wide text-violet-300/90 transition hover:text-violet-200"
        aria-expanded={expanded}
      >
        {expanded ? "Hide drivetrain details ↑" : "Expand drivetrain details ↓"}
      </button>
      {expanded ? (
        <div className="mt-2 grid gap-1.5 border-t border-white/[0.06] pt-2 sm:grid-cols-2">
          {chips.map(([label, value]) => (
            <div key={`detail-${label}`} className="rounded border border-white/[0.05] bg-black/20 px-2 py-1.5">
              <p className="text-[7px] uppercase tracking-wide text-neutral-500">{label}</p>
              <p className="mt-0.5 text-[10px] font-medium text-cyan-100/90">{value}</p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

type FlowStepStatus = "completed" | "active" | "locked";

function flowStepStatus(index: number, activeIndex: number): FlowStepStatus {
  if (index < activeIndex) return "completed";
  if (index === activeIndex) return "active";
  return "locked";
}

export function TransmissionConfigurationFlow({
  activeStepIndex,
  onStepClick,
}: {
  activeStepIndex: number;
  onStepClick: (section: TransmissionNavSectionId, stepIndex: number) => void;
}) {
  return (
    <div className="rounded-lg border border-violet-500/20 bg-violet-500/[0.04] px-2.5 py-2">
      <p className="mb-2 text-[8px] font-semibold uppercase tracking-[0.14em] text-violet-300/90">
        Configuration flow
      </p>
      <div className="flex flex-wrap items-stretch gap-1">
        {TRANSMISSION_CONFIG_FLOW.map((step, i) => {
          const status = flowStepStatus(i, activeStepIndex);
          return (
            <span key={step.id} className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onStepClick(step.section, i)}
                className={[
                  "group inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[8px] font-semibold uppercase tracking-wide transition",
                  status === "active"
                    ? "border-violet-400/45 bg-violet-500/20 text-violet-100 shadow-[0_0_12px_rgba(124,58,237,0.15)]"
                    : status === "completed"
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200/90 hover:border-emerald-400/45"
                      : "border-white/[0.08] bg-black/20 text-neutral-500 hover:border-violet-500/30 hover:text-neutral-300",
                ].join(" ")}
              >
                <span aria-hidden className="text-[9px] opacity-80">
                  {status === "completed" ? "✓" : step.icon}
                </span>
                <span className="group-hover:text-white">{step.label}</span>
              </button>
              {i < TRANSMISSION_CONFIG_FLOW.length - 1 ? (
                <span className="text-neutral-600" aria-hidden>
                  →
                </span>
              ) : null}
            </span>
          );
        })}
      </div>
    </div>
  );
}
