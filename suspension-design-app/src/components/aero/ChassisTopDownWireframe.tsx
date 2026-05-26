import type { ReactNode } from "react";
import bmwE46TopdownWireframeWhite from "../../assets/reference/bmw-e46-topdown-wireframe-white.png";

/** Default axle Y positions (viewBox 0–100), față = sus — used by stand alignment diagram. */
export const CHASSIS_TOPDOWN_FRONT_Y = 19.75;
export const CHASSIS_TOPDOWN_REAR_Y = 78;

export function ChassisTopDownWireframeShell({
  children,
  compact,
  borderTone = "neutral",
  fitFullFrame = false,
}: {
  children?: ReactNode;
  compact?: boolean;
  borderTone?: "neutral" | "violet";
  /** When true, scale down so the entire chassis is visible (sidebar / small panels). */
  fitFullFrame?: boolean;
}) {
  const border =
    borderTone === "violet" ? "border-violet-500/35" : "border-white/10";

  const imgTransform = fitFullFrame
    ? "translate(-50%, -50%) rotate(-90deg)"
    : "translate(calc(-50% + 20px), -50%) rotate(-90deg) scale(1.336)";

  return (
    <div
      className={[
        "relative mx-auto w-full overflow-hidden rounded-lg border bg-[#05070a]",
        border,
        !compact ? "max-w-[min(100%,420px)]" : "",
      ].join(" ")}
    >
      <div className="relative aspect-[644/1024] w-full overflow-hidden">
        <img
          src={bmwE46TopdownWireframeWhite}
          alt="Șasiu — vedere de sus"
          className="pointer-events-none absolute left-1/2 top-1/2 select-none object-contain"
          style={{
            maxHeight: fitFullFrame ? "94%" : "100%",
            maxWidth: fitFullFrame ? "94%" : undefined,
            width: fitFullFrame ? "auto" : undefined,
            height: fitFullFrame ? "auto" : "100%",
            transform: imgTransform,
          }}
          draggable={false}
          decoding="async"
        />
        {children}
      </div>
    </div>
  );
}

/** Sidebar weight section: wireframe only, full chassis in frame. */
export function ChassisTopDownWeightBalanceView() {
  return (
    <ChassisTopDownWireframeShell compact borderTone="neutral" fitFullFrame />
  );
}
