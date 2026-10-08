import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import bmwE46SwayBarRollReference from "../assets/reference/bmw-e46-sway-bar-roll-reference.png";
import { estimateBodyRollReferenceDeg } from "../lib/antiRollBarBodyRoll";
import { useSuspensionStore } from "../store/suspensionStore";

const IMG_ASPECT = 1024 / 682;
const VB_W = 100;
const VB_H = VB_W / IMG_ASPECT;

const BODY_ROLL_GUIDE = {
  /** Linie gri: capăt stânga → capăt dreapta (= pivot). */
  grayStartX: 57.5 - 44,
  grayEndX: 57.5 + 44 * 0.55,
  grayY: 73.8 * (VB_H / 100),
  bodyLengthRight: 20,
  bodyLeftMultiplier: 1.5,
  arcRadius: 12.5,
  chassisNudgeScreenYPx: -10,
  /** Extindere capăt stânga al liniei galbene, pe direcția șasiului (px ecran). */
  chassisExtendLeftScreenPx: 90,
  /** Calibrare vizuală φ față de estimarea ARB (°). */
  rollVisualOffsetDeg: -1,
} as const;

/** Un singur element activ — nu se selectează „toate odată”. */
export type BodyRollPartId =
  | "none"
  | "ground"
  | "chassis"
  | "pivot"
  | "angleArc";

const PART_LABELS: Record<Exclude<BodyRollPartId, "none">, string> = {
  ground: "Asfalt (0°) — linie gri orizontală",
  chassis: "Șasiu — axă galbenă continuă (body roll)",
  pivot: "Pivot — capăt dreapta linie gri (vertex φ)",
  angleArc: "Unghi φ — arc mov body roll",
};

function rollArcPath(
  cx: number,
  cy: number,
  r: number,
  startDeg: number,
  endDeg: number,
): string {
  const sr = (startDeg * Math.PI) / 180;
  const er = (endDeg * Math.PI) / 180;
  const x1 = cx + r * Math.cos(sr);
  const y1 = cy + r * Math.sin(sr);
  const x2 = cx + r * Math.cos(er);
  const y2 = cy + r * Math.sin(er);
  const large = Math.abs(endDeg - startDeg) > 180 ? 1 : 0;
  const sweep = endDeg > startDeg ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${large} ${sweep} ${x2} ${y2}`;
}

type ImageLayoutRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

function viewBoxScale(layout: ImageLayoutRect): number {
  const { width, height } = layout;
  if (width <= 0 || height <= 0) return 1;
  const vbAspect = VB_W / VB_H;
  const boxAspect = width / height;
  return boxAspect > vbAspect ? height / VB_H : width / VB_W;
}

function screenPxToViewBoxLen(px: number, layout: ImageLayoutRect): number {
  const scale = viewBoxScale(layout);
  return scale > 0 ? px / scale : 0;
}

function mapViewBoxToImagePx(
  x: number,
  y: number,
  layout: ImageLayoutRect,
): { left: number; top: number } {
  const { width, height } = layout;
  if (width <= 0 || height <= 0) return { left: 0, top: 0 };
  const scale = viewBoxScale(layout);
  const vbAspect = VB_W / VB_H;
  const boxAspect = width / height;
  let offX: number;
  let offY: number;
  if (boxAspect > vbAspect) {
    offX = (width - VB_W * scale) / 2;
    offY = 0;
  } else {
    offX = 0;
    offY = (height - VB_H * scale) / 2;
  }
  return {
    left: layout.left + offX + x * scale,
    top: layout.top + offY + y * scale,
  };
}

type LineHit = {
  left: number;
  top: number;
  width: number;
  angleDeg: number;
};

function lineHitInOverlay(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  layout: ImageLayoutRect,
): LineHit {
  const a = mapViewBoxToImagePx(x1, y1, layout);
  const b = mapViewBoxToImagePx(x2, y2, layout);
  return {
    left: (a.left + b.left) / 2 - layout.left,
    top: (a.top + b.top) / 2 - layout.top,
    width: Math.hypot(b.left - a.left, b.top - a.top),
    angleDeg: (Math.atan2(b.top - a.top, b.left - a.left) * 180) / Math.PI,
  };
}

function pointHitInOverlay(x: number, y: number, layout: ImageLayoutRect) {
  const p = mapViewBoxToImagePx(x, y, layout);
  return { left: p.left - layout.left, top: p.top - layout.top };
}

/** Asfalt = braț orizontal spre stânga (180° în SVG). Șasiu = același pivot, unghi φ față de asfalt. */
const GROUND_ARM_DEG = 180;

function chassisLineGeometry(rollDeg: number, nudgeVbY = 0, chassisExtendVb = 0) {
  const { grayStartX, grayEndX, grayY, bodyLeftMultiplier, bodyLengthRight, arcRadius } =
    BODY_ROLL_GUIDE;
  /** Pivot = capătul din dreapta al segmentului gri (x2, y2 al liniei). */
  const pivot = { x: grayEndX, y: grayY + nudgeVbY };
  const groundLeft = { x: grayStartX, y: pivot.y };
  const rollRad = (rollDeg * Math.PI) / 180;
  const cos = Math.cos(rollRad);
  const sin = Math.sin(rollRad);
  const chassisLen = bodyLengthRight * bodyLeftMultiplier + chassisExtendVb;
  const chassisUx = -cos;
  const chassisUy = -sin;
  const chassisTipX = pivot.x + chassisLen * chassisUx;
  const chassisTipY = pivot.y + chassisLen * chassisUy;
  const chassisArmDeg = GROUND_ARM_DEG - rollDeg;
  return {
    chassisTipX,
    chassisTipY,
    chassisArmDeg,
    pivot,
    groundLeft,
    groundRight: pivot,
    labelX: pivot.x - arcRadius * 0.75,
    labelY: pivot.y - arcRadius * 1.05,
    arcRadius,
    arcStartDeg: GROUND_ARM_DEG,
    arcEndDeg: chassisArmDeg,
  };
}

function BodyRollGuideSvg({
  rollDeg,
  selected,
  nudgeVbY,
  chassisExtendVb,
}: {
  rollDeg: number;
  selected: BodyRollPartId;
  nudgeVbY: number;
  chassisExtendVb: number;
}) {
  const g = chassisLineGeometry(rollDeg, nudgeVbY, chassisExtendVb);
  const { pivot, arcRadius } = g;

  const stroke = (part: BodyRollPartId, base: string, active: string) =>
    selected === part ? active : base;

  return (
    <svg
      className="pointer-events-none h-full w-full"
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden
    >
      <line
        x1={g.groundLeft.x}
        y1={g.groundLeft.y}
        x2={g.pivot.x}
        y2={g.pivot.y}
        stroke={stroke("ground", "rgba(148,163,184,0.95)", "rgba(226,232,240,1)")}
        strokeWidth={selected === "ground" ? 0.9 : 0.55}
        strokeDasharray="1.8 1.4"
        strokeLinecap="round"
      />
      <text
        x={g.groundLeft.x + 1.2}
        y={g.groundLeft.y + 3.8}
        fontSize="2.35"
        fill={selected === "ground" ? "rgba(226,232,240,1)" : "rgba(148,163,184,0.9)"}
        fontFamily="ui-monospace, monospace"
      >
        asfalt (0°)
      </text>
      <line
        x1={pivot.x}
        y1={pivot.y}
        x2={g.chassisTipX}
        y2={g.chassisTipY}
        stroke={stroke("chassis", "rgba(251,191,36,0.96)", "rgba(253,224,71,1)")}
        strokeWidth={selected === "chassis" ? 1.1 : 0.75}
        strokeLinecap="round"
      />
      <circle
        cx={pivot.x}
        cy={pivot.y}
        r={selected === "pivot" ? 1.35 : 0.95}
        fill={stroke("pivot", "rgba(251,191,36,0.95)", "rgba(253,224,71,1)")}
        stroke={selected === "pivot" ? "rgba(255,255,255,0.9)" : "none"}
        strokeWidth="0.25"
      />
      {rollDeg > 0.08 ? (
        <path
          d={rollArcPath(pivot.x, pivot.y, arcRadius, g.arcStartDeg, g.arcEndDeg)}
          fill="none"
          stroke={stroke("angleArc", "rgba(192,132,252,0.92)", "rgba(216,180,254,1)")}
          strokeWidth={selected === "angleArc" ? 0.85 : 0.5}
          strokeLinecap="round"
        />
      ) : null}
      <text
        x={g.labelX}
        y={g.labelY}
        fontSize="3.1"
        fill={selected === "angleArc" ? "rgba(233,213,255,1)" : "rgba(192,132,252,0.98)"}
        fontFamily="ui-monospace, monospace"
        fontWeight="600"
      >
        {`φ ${rollDeg.toFixed(1)}°`}
      </text>
      <text
        x={g.labelX}
        y={g.labelY + 3.6}
        fontSize="2.2"
        fill={selected === "angleArc" ? "rgba(103,232,249,1)" : "rgba(34,211,238,0.88)"}
        fontFamily="ui-sans-serif, system-ui, sans-serif"
      >
        body roll
      </text>
    </svg>
  );
}

function LineHitButton({
  hit,
  active,
  label,
  title,
  tone,
  zIndex,
  onPick,
}: {
  hit: LineHit;
  active: boolean;
  label: string;
  title: string;
  tone: "slate" | "amber" | "violet";
  zIndex: number;
  onPick: () => void;
}) {
  if (hit.width < 4) return null;
  const toneClass =
    tone === "slate"
      ? active
        ? "bg-slate-300/25 ring-2 ring-slate-200/80"
        : "bg-slate-400/10 hover:bg-slate-300/15 hover:ring-1 hover:ring-slate-300/50"
      : tone === "amber"
        ? active
          ? "bg-amber-400/30 ring-2 ring-amber-300/85"
          : "bg-amber-400/10 hover:bg-amber-400/20 hover:ring-1 hover:ring-amber-400/50"
        : active
          ? "bg-violet-400/25 ring-2 ring-violet-300/80"
          : "bg-violet-400/10 hover:bg-violet-400/18 hover:ring-1 hover:ring-violet-400/45";

  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={label}
      title={title}
      className={[
        "absolute border-0 p-0 cursor-pointer touch-manipulation",
        toneClass,
      ].join(" ")}
      style={{
        left: hit.left,
        top: hit.top,
        width: hit.width,
        height: 12,
        zIndex,
        transform: `translate(-50%, -50%) rotate(${hit.angleDeg}deg)`,
      }}
      onClick={(e) => {
        e.stopPropagation();
        onPick();
      }}
    />
  );
}

function segmentBtnClass(active: boolean, tone: "slate" | "amber" | "violet") {
  const base =
    "rounded-md border px-2 py-0.5 text-[8px] font-semibold uppercase tracking-wide transition";
  if (!active) {
    return `${base} border-white/15 bg-black/40 text-neutral-400 hover:border-white/25 hover:text-neutral-200`;
  }
  const map = {
    slate: "border-slate-300/45 bg-slate-500/20 text-slate-100 ring-1 ring-slate-300/35",
    amber: "border-amber-400/55 bg-amber-500/20 text-amber-100 ring-1 ring-amber-400/35",
    violet: "border-violet-400/55 bg-violet-500/20 text-violet-100 ring-1 ring-violet-400/35",
  };
  return `${base} ${map[tone]}`;
}

export function AntiRollBarReferenceVisual() {
  const shellRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [layout, setLayout] = useState<ImageLayoutRect | null>(null);
  const [selected, setSelected] = useState<BodyRollPartId>("none");

  const frontMode = useSuspensionStore((s) => s.antiRollBarFrontMode);
  const rearMode = useSuspensionStore((s) => s.antiRollBarRearMode);
  const frontStiffness = useSuspensionStore((s) => s.antiRollBarFrontStiffness);
  const rearStiffness = useSuspensionStore((s) => s.antiRollBarRearStiffness);

  const rollDeg = useMemo(() => {
    const estimated = estimateBodyRollReferenceDeg(
      frontMode,
      rearMode,
      frontStiffness,
      rearStiffness,
    );
    return Math.max(0, estimated + BODY_ROLL_GUIDE.rollVisualOffsetDeg);
  }, [frontMode, rearMode, frontStiffness, rearStiffness]);

  const syncLayout = useCallback(() => {
    const shell = shellRef.current;
    const img = imgRef.current;
    if (!shell || !img) return;
    const sr = shell.getBoundingClientRect();
    const ir = img.getBoundingClientRect();
    if (ir.width < 2 || ir.height < 2) return;
    setLayout({
      left: ir.left - sr.left,
      top: ir.top - sr.top,
      width: ir.width,
      height: ir.height,
    });
  }, []);

  useLayoutEffect(() => {
    syncLayout();
    const shell = shellRef.current;
    const img = imgRef.current;
    if (!shell) return;
    const ro = new ResizeObserver(syncLayout);
    ro.observe(shell);
    if (img) ro.observe(img);
    window.addEventListener("resize", syncLayout);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", syncLayout);
    };
  }, [syncLayout]);

  const chassisNudgeVbY = layout
    ? (BODY_ROLL_GUIDE.chassisNudgeScreenYPx / layout.height) * VB_H
    : 0;
  const chassisExtendVb = layout
    ? screenPxToViewBoxLen(BODY_ROLL_GUIDE.chassisExtendLeftScreenPx, layout)
    : 0;

  const hits = useMemo(() => {
    if (!layout) return null;
    const g = chassisLineGeometry(rollDeg, chassisNudgeVbY, chassisExtendVb);
    const pivotPt = pointHitInOverlay(g.pivot.x, g.pivot.y, layout);
    const labelPt = pointHitInOverlay(g.labelX, g.labelY, layout);
    return {
      ground: lineHitInOverlay(
        g.groundLeft.x,
        g.groundLeft.y,
        g.pivot.x,
        g.pivot.y,
        layout,
      ),
      chassis: lineHitInOverlay(
        g.pivot.x,
        g.pivot.y,
        g.chassisTipX,
        g.chassisTipY,
        layout,
      ),
      pivot: pivotPt,
      angle: labelPt,
    };
  }, [layout, rollDeg, chassisNudgeVbY, chassisExtendVb]);

  const pick = (part: BodyRollPartId) => {
    setSelected((cur) => (cur === part ? "none" : part));
  };

  return (
    <div ref={shellRef} className="relative w-full max-w-3xl">
      <img
        ref={imgRef}
        src={bmwE46SwayBarRollReference}
        alt="BMW E46 pe pistă umedă în viraj — referință roll"
        className="pointer-events-none relative z-[1] max-h-[min(62vh,520px)] w-full rounded-md object-contain object-center shadow-lg shadow-black/40"
        decoding="async"
        onLoad={syncLayout}
      />

      {layout && hits ? (
        <div
          className="absolute z-[10]"
          style={{
            left: layout.left,
            top: layout.top,
            width: layout.width,
            height: layout.height,
          }}
          onClick={() => setSelected("none")}
        >
          <BodyRollGuideSvg
            rollDeg={rollDeg}
            selected={selected}
            nudgeVbY={chassisNudgeVbY}
            chassisExtendVb={chassisExtendVb}
          />

          <LineHitButton
            hit={hits.ground}
            active={selected === "ground"}
            label="Selectează asfalt (linie gri)"
            title="Asfalt (0°)"
            tone="slate"
            zIndex={14}
            onPick={() => pick("ground")}
          />
          <LineHitButton
            hit={hits.chassis}
            active={selected === "chassis"}
            label="Selectează axa șasiu (linie galbenă)"
            title="Șasiu — body roll"
            tone="amber"
            zIndex={16}
            onPick={() => pick("chassis")}
          />
          <button
            type="button"
            aria-pressed={selected === "pivot"}
            aria-label="Selectează pivot"
            title="Pivot rotație"
            className={[
              "absolute rounded-full border-0 p-0 cursor-pointer touch-manipulation",
              selected === "pivot"
                ? "bg-amber-400/35 ring-2 ring-amber-200/90"
                : "bg-amber-400/15 hover:bg-amber-400/25 hover:ring-1 hover:ring-amber-300/60",
            ].join(" ")}
            style={{
              left: hits.pivot.left,
              top: hits.pivot.top,
              width: 22,
              height: 22,
              zIndex: 22,
              transform: "translate(-50%, -50%)",
            }}
            onClick={(e) => {
              e.stopPropagation();
              pick("pivot");
            }}
          />
          <button
            type="button"
            aria-pressed={selected === "angleArc"}
            aria-label="Selectează unghi φ"
            title={`Unghi body roll φ ${rollDeg.toFixed(1)}°`}
            className={[
              "absolute border-0 p-0 cursor-pointer touch-manipulation rounded",
              selected === "angleArc"
                ? "bg-violet-400/25 ring-2 ring-violet-300/80"
                : "bg-violet-400/10 hover:bg-violet-400/18 hover:ring-1 hover:ring-violet-400/50",
            ].join(" ")}
            style={{
              left: hits.angle.left,
              top: hits.angle.top,
              width: 56,
              height: 28,
              zIndex: 20,
              transform: "translate(-20%, -60%)",
            }}
            onClick={(e) => {
              e.stopPropagation();
              pick("angleArc");
            }}
          />
        </div>
      ) : null}

      <div className="relative z-[20] mt-2 flex flex-wrap items-center justify-center gap-1">
        <span className="mb-0.5 w-full text-center text-[8px] uppercase tracking-wide text-neutral-600">
          Un element pe rând
        </span>
        {(
          [
            ["ground", "Asfalt", "slate"],
            ["chassis", "Șasiu", "amber"],
            ["pivot", "Pivot", "amber"],
            ["angleArc", "φ", "violet"],
          ] as const
        ).map(([id, label, tone]) => (
          <button
            key={id}
            type="button"
            className={segmentBtnClass(selected === id, tone)}
            onClick={() => pick(id)}
          >
            {label}
          </button>
        ))}
      </div>

      <p className="relative z-[20] mt-1.5 text-center text-[9px] text-neutral-500">
        {selected === "none"
          ? "Apasă un singur element de pe diagramă sau un buton de mai sus"
          : PART_LABELS[selected]}
      </p>
    </div>
  );
}
