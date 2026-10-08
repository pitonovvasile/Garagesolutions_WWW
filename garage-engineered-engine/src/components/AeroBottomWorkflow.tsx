import { useMemo, useState } from "react";
import { aeroRiskTone, buildAeroSummarySnapshot } from "../lib/aeroSummaryMetrics";
import { useGarageWorkspaceStore } from "../store/garageWorkspaceStore";
import { useAeroBodyPlannerStore } from "../store/aeroBodyPlannerStore";
import { useSuspensionAssistantStore } from "../store/suspensionAssistantStore";

function toneClass(tone: ReturnType<typeof aeroRiskTone>): string {
  switch (tone) {
    case "good":
      return "text-emerald-400";
    case "warn":
      return "text-amber-400";
    case "bad":
      return "text-red-400";
    default:
      return "text-neutral-300";
  }
}

function barClass(tone: ReturnType<typeof aeroRiskTone>): string {
  switch (tone) {
    case "good":
      return "bg-emerald-500";
    case "warn":
      return "bg-amber-500";
    case "bad":
      return "bg-red-500";
    default:
      return "bg-cyan-500";
  }
}

function AeroBalanceDonut({ frontPct }: { frontPct: number; rearPct: number }) {
  const r = 10;
  const c = 2 * Math.PI * r;
  const frontLen = (frontPct / 100) * c;
  return (
    <svg viewBox="0 0 28 28" className="h-7 w-7 shrink-0" aria-hidden>
      <circle cx="14" cy="14" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
      <circle
        cx="14"
        cy="14"
        r={r}
        fill="none"
        stroke="#22d3ee"
        strokeWidth="4"
        strokeDasharray={`${frontLen} ${c - frontLen}`}
        strokeLinecap="round"
        transform="rotate(-90 14 14)"
      />
      <text x="14" y="15" textAnchor="middle" className="fill-neutral-500 text-[6px] font-semibold">
        {frontPct}
      </text>
    </svg>
  );
}

function MetricColumn({
  label,
  value,
  tone = "neutral",
  barPct,
}: {
  label: string;
  value: string;
  tone?: ReturnType<typeof aeroRiskTone>;
  barPct: number;
}) {
  return (
    <div className="flex min-w-[4.5rem] flex-col gap-0.5 border-l border-white/[0.06] pl-2 first:border-l-0 first:pl-0">
      <span className="text-[7px] uppercase tracking-wide text-neutral-500">{label}</span>
      <span className={`text-[9px] font-semibold ${toneClass(tone)}`}>{value}</span>
      <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
        <div className={`h-full rounded-full ${barClass(tone)}`} style={{ width: `${Math.max(8, Math.min(100, barPct))}%` }} />
      </div>
    </div>
  );
}

function DownforceStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[7px] uppercase tracking-wide text-neutral-500">{label}</p>
      <p className="text-[10px] font-semibold tabular-nums text-white">{value}</p>
    </div>
  );
}

/** Footer Aerodynamics — aero summary dashboard. */
export function AeroBottomWorkflow() {
  const aero = useSuspensionAssistantStore((s) => s.vehicleFooterAeroManual);
  const priorities = useGarageWorkspaceStore((s) => s.optimizationPriorities);
  const saveSetup = useAeroBodyPlannerStore((s) => s.saveSetup);
  const [saveFlash, setSaveFlash] = useState(false);

  const summary = useMemo(() => buildAeroSummarySnapshot(aero, priorities), [aero, priorities]);

  function handleSave() {
    saveSetup("full");
    setSaveFlash(true);
    window.setTimeout(() => setSaveFlash(false), 2800);
    window.setTimeout(() => {
      document.getElementById("aero-center-saved")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 80);
  }

  function handleExport() {
    const payload = {
      title: "Aero Summary (Current Setup)",
      generatedAt: new Date().toISOString(),
      downforce: {
        frontN: summary.frontDownforceN,
        rearN: summary.rearDownforceN,
        totalN: summary.totalDownforceN,
        balanceFrontPct: summary.frontBalancePct,
        balanceRearPct: summary.rearBalancePct,
      },
      metrics: summary,
      source: aero,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "aero-summary-report.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <footer className="shrink-0 border-t border-white/10 bg-[#070a10]">
      <div className="flex min-h-[5.5rem] flex-col gap-1 px-2 py-1.5 lg:flex-row lg:items-stretch lg:gap-3">
        <div className="min-w-0 shrink-0 lg:w-[17rem]">
          <p className="mb-1 text-[8px] font-semibold uppercase tracking-[0.14em] text-cyan-300/90">
            Aero summary (Current setup)
          </p>
          <div className="grid grid-cols-3 gap-x-2 gap-y-1">
            <DownforceStat label="Front downforce" value={`${summary.frontDownforceN} N`} />
            <DownforceStat label="Rear downforce" value={`${summary.rearDownforceN} N`} />
            <DownforceStat label="Total downforce" value={`${summary.totalDownforceN} N`} />
          </div>
          <div className="mt-1 flex items-center gap-2">
            <AeroBalanceDonut frontPct={summary.frontBalancePct} rearPct={summary.rearBalancePct} />
            <div>
              <p className="text-[7px] uppercase tracking-wide text-neutral-500">Aero balance</p>
              <p className="text-[9px] font-semibold tabular-nums text-cyan-200/90">
                {summary.frontBalancePct}% / {summary.rearBalancePct}%
              </p>
            </div>
          </div>
        </div>

        <div className="min-w-0 flex-1 overflow-x-auto">
          <div className="flex min-w-max gap-2 py-0.5">
            <MetricColumn
              label="Drag impact"
              value={`+${summary.dragImpactPct}%`}
              tone="neutral"
              barPct={Math.min(100, summary.dragImpactPct * 8)}
            />
            <MetricColumn
              label="Cooling score"
              value={`${summary.coolingScorePct}%`}
              tone="good"
              barPct={summary.coolingScorePct}
            />
            <MetricColumn
              label="Clearance risk"
              value={summary.clearanceRisk}
              tone={aeroRiskTone(summary.clearanceRisk)}
              barPct={summary.clearanceRisk === "High" ? 85 : summary.clearanceRisk === "Medium" ? 55 : 25}
            />
            <MetricColumn
              label="Stability score"
              value={summary.stabilityScore}
              tone={aeroRiskTone(summary.stabilityScore)}
              barPct={summary.stabilityScore === "Good" ? 78 : summary.stabilityScore === "Medium" ? 52 : 35}
            />
            <MetricColumn
              label="Ride height sens."
              value={summary.rideHeightSensitivity}
              tone={aeroRiskTone(summary.rideHeightSensitivity)}
              barPct={summary.rideHeightSensitivity === "High" ? 88 : summary.rideHeightSensitivity === "Medium" ? 55 : 28}
            />
            <MetricColumn
              label="Rake sensitivity"
              value={summary.rakeSensitivity}
              tone={aeroRiskTone(summary.rakeSensitivity)}
              barPct={summary.rakeSensitivity === "High" ? 82 : summary.rakeSensitivity === "Medium" ? 50 : 24}
            />
          </div>
        </div>

        <div className="flex shrink-0 flex-col justify-center gap-1 lg:w-[9.5rem]">
          {saveFlash ? (
            <p className="text-[8px] leading-snug text-emerald-300/90">Saved — see Saved Setups tab.</p>
          ) : null}
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center justify-center gap-1 rounded-md border border-cyan-500/40 bg-cyan-500/10 px-2 py-1.5 text-[8px] font-semibold uppercase tracking-[0.1em] text-cyan-100 transition hover:bg-cyan-500/20"
          >
            <span aria-hidden>💾</span>
            Save body aero setup
          </button>
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center justify-center gap-1 rounded-md border border-white/15 bg-black/20 px-2 py-1.5 text-[8px] font-semibold uppercase tracking-[0.1em] text-neutral-200 transition hover:bg-white/[0.04]"
          >
            <span aria-hidden>↓</span>
            Export report
          </button>
        </div>
      </div>
    </footer>
  );
}
