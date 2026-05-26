import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { getVehicle } from "../data/vehicles";
import { useGarageCars } from "../hooks/useGarageCars";
import { formatSavedCarLabel, guessVehicleTemplateId } from "../lib/garageStorage";
import { useSuspensionAssistantStore } from "../store/suspensionAssistantStore";
import { useSuspensionStore } from "../store/suspensionStore";
import bmwE46FrontBody from "../assets/reference/bmw-e46-front-body.png";
import e46FrontSuspension from "../assets/reference/e46-front-suspension.png";
import bmwE46CamberRefLeft from "../assets/reference/bmw-e46-front-camber-ref-left.png";
import bmwE46CamberRefRight from "../assets/reference/bmw-e46-front-camber-ref-right.png";
import bmwE46RearRef from "../assets/reference/bmw-e46-rear.png";
import bmwE46M3CoupeBlueprint from "../assets/reference/bmw-e46-m3-coupe-blueprint.png";
import bmwE46SideProfileWireframe from "../assets/reference/bmw-e46-side-profile-wireframe.png";
import bmwE46FrontWheelSide from "../assets/reference/bmw-e46-front-wheel-side.png";
import bmwE46CoiloverColored from "../assets/reference/bmw-e46-coilover-colored.png";
import bmwE46TopdownWireframeWhite from "../assets/reference/bmw-e46-topdown-wireframe-white.png";
import bmwX5E53Front from "../assets/reference/bmw-x5-e53-front.png";
import bmwX5E53Generic from "../assets/reference/bmw-x5-e53-generic.png";
import bmwX5E53ThreeQuarter from "../assets/reference/bmw-x5-e53-three-quarter.png";
import bmwX5E53WheelsThreeQuarter from "../assets/reference/bmw-x5-e53-wheels-three-quarter.png";
import { isBmwX5E53GarageCar } from "../lib/bmwGaragePlatform";
import { AntiRollBarReferenceVisual } from "./AntiRollBarReferenceVisual";
/** Side-view schematic: clamp so huge sim values don’t break the glyph (values in ° remain exact in text). */
const CAMBER_GLYPH_CLAMP_DEG = 12;

function formatCamberDeg(deg: number) {
  if (!Number.isFinite(deg)) return "—";
  return `${deg.toFixed(2)}°`;
}

/** Minimal side-view wheel + vertical reference; rotation 1:1 with camber within clamp. */
function FrontCamberPlanGauge({ camberDeg }: { camberDeg: number }) {
  const clamped = Math.max(-CAMBER_GLYPH_CLAMP_DEG, Math.min(CAMBER_GLYPH_CLAMP_DEG, camberDeg));
  const glyphClamped = Math.abs(camberDeg - clamped) > 0.05;

  return (
    <div className="flex w-[4.75rem] shrink-0 flex-col items-center gap-1.5 rounded-md border border-white/10 bg-black/40 px-1.5 py-2 shadow-sm backdrop-blur-sm">
      <p className="text-center text-[8px] font-semibold uppercase leading-tight tracking-wide text-neutral-500">
        Camber (model 2D)
      </p>
      <svg
        width="52"
        height="88"
        viewBox="0 0 52 88"
        className="text-slate-200"
        aria-hidden
      >
        <title>Unghi camber (vedere laterală simbolică)</title>
        <line x1="26" y1="10" x2="26" y2="78" stroke="currentColor" strokeWidth="0.75" strokeOpacity="0.35" />
        <line x1="6" y1="78" x2="46" y2="78" stroke="currentColor" strokeWidth="0.75" strokeOpacity="0.45" />
        <g transform={`rotate(${-clamped} 26 78)`}>
          <ellipse cx="26" cy="58" rx="15" ry="20" fill="none" stroke="currentColor" strokeWidth="1.75" />
          <line x1="26" y1="38" x2="26" y2="78" stroke="currentColor" strokeWidth="1" strokeOpacity="0.35" />
        </g>
      </svg>
      <p className="font-mono text-[11px] tabular-nums leading-none text-cyan-200">{formatCamberDeg(camberDeg)}</p>
      <p className="text-center text-[7px] leading-tight text-neutral-500">
        {glyphClamped
          ? `Schemă limitată la ±${CAMBER_GLYPH_CLAMP_DEG}°; numărul de mai sus e din modelul 2D.`
          : "Unghi schematic din schița 2D (nu e măsurătoare la banc)."}
      </p>
    </div>
  );
}

/** Referință foto camber E46 — ~20% zoom out față de min(33.6vh, 266px). */
const E46_CAMBER_IMG_MAX = "max-h-[min(26.88vh,213px)]";
/** Înălțime CSS max. pentru `E46_CAMBER_IMG_MAX` (pentru conversie px ecran → SVG). */
const E46_CAMBER_REF_DISPLAY_H_PX = 213;
/** Dimensiuni naturale asset — fallback pentru overlay SVG înainte de `onLoad`. */
const E46_CAMBER_REF_NATURAL = {
  left: { w: 248, h: 444 },
  right: { w: 273, h: 455 },
} as const;

function e46CamberNaturalFallbackForSrc(src: string): { w: number; h: number } {
  if (src === bmwE46CamberRefLeft) return E46_CAMBER_REF_NATURAL.left;
  if (src === bmwE46CamberRefRight) return E46_CAMBER_REF_NATURAL.right;
  return E46_CAMBER_REF_NATURAL.right;
}

/**
 * Legat de același travelMm ca modelul 2D (Kinematics). Pentru banda de sus, straturile PNG sunt aliniate
 * astfel încât poziția **+50 mm** pe slider = translație vizuală 0 (caroserie la „ride” de referință față
 * de suspensie); restul intervalului −50…+50 se scalează față de această bază.
 */
const CHASSIS_BUMP_VIS_FRAC_PER_50MM = 0.032;

/** Coborâre strat suspensie/roți față de chenar (px). */
const E46_STRIP_SUSPENSION_OFFSET_Y_PX = 34;

/**
 * Wireframe caroserie (față de același chenar ca suspensia):
 * - `E46_STRIP_BODY_BASE_OFFSET_Y_PX`: la travel neutru, coborâre față de reper (mai mare = mai jos).
 * - `E46_STRIP_BODY_DELTA_X_PX`: negativ = spre stânga în vedere față (corectează wireframe prea la dreapta față de roți).
 * - `E46_STRIP_BODY_VERTICAL_NUDGE_PX`: ajustare fină verticală siluetă (negativ = mai sus pe ecran).
 */
const E46_STRIP_BODY_BASE_OFFSET_Y_PX = 18;
const E46_STRIP_BODY_DELTA_X_PX = -16;
const E46_STRIP_BODY_VERTICAL_NUDGE_PX = -15;

/** Orizontal suspensie în chenar (px); 0 = centrat pe lățimea stratului. */
const E46_STRIP_SUSPENSION_OFFSET_X_PX = 0;

/** Distanță fixă între clonele camber L/R în Chenar 1 (spacer în px — vizibil indiferent de Tailwind/build). */
const E46_STRIP_CAMBER_CLONE_GAP_PX = 140;

/** Chenar interior în banda Chenar 1 — stânga / dreapta separate. */
const E46_STRIP_INNER_PANEL =
  "flex min-h-0 min-w-0 flex-1 flex-col rounded-md border border-violet-500/40 bg-[#0a0e14] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]";

function E46StripInnerPanel({
  title,
  subtitle,
  children,
  contentClassName,
  panelOverflowVisible = false,
  showHeader = true,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  contentClassName?: string;
  /** true = nu taie translateX pe siluetă (Ride height). */
  panelOverflowVisible?: boolean;
  showHeader?: boolean;
}) {
  return (
    <div
      className={[
        E46_STRIP_INNER_PANEL,
        panelOverflowVisible ? "overflow-visible" : "overflow-hidden",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {showHeader ? (
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 px-2 py-1">
          <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-cyan-400/80">{title}</p>
          {subtitle ? <span className="text-[9px] font-medium text-neutral-500">{subtitle}</span> : null}
        </div>
      ) : null}
      <div
        className={[
          "flex min-h-0 flex-1 items-center justify-center overflow-y-visible p-2",
          contentClassName ?? "overflow-x-hidden",
        ].join(" ")}
      >
        {children}
      </div>
    </div>
  );
}

/** La acest travelMm din store, caroseria nu e translată vizual față de suspensie (aliniază asset-urile). */
const CHASSIS_VIS_NEUTRAL_TRAVEL_MM = 50;

function formatE46RideHeightDeltaMm(rideDeltaMm: number): string {
  if (Math.abs(rideDeltaMm) < 0.05) return "0 mm · referință";
  return `${rideDeltaMm >= 0 ? "+" : ""}${rideDeltaMm.toFixed(1)} mm`;
}

/** Cote ride height: muchie aripă (siluetă) vs reper roată (suspensie fixă), la travel ref. +50 mm. */
const E46_RIDE_HEIGHT_FENDER_REF_Y_PERCENT = 34;
const E46_RIDE_HEIGHT_SUSPENSION_REF_Y_PERCENT = 78;
const E46_RIDE_HEIGHT_COTE_X_PERCENT = 56;
/** Chenar Ride height: X siluetă = OEM + finețe locală (+ = dreapta). */
const E46_RIDE_HEIGHT_BODY_FINE_X_PX = 17;
const E46_RIDE_HEIGHT_BODY_TRANSLATE_X_PX =
  E46_STRIP_SUSPENSION_OFFSET_X_PX + E46_STRIP_BODY_DELTA_X_PX + E46_RIDE_HEIGHT_BODY_FINE_X_PX;

/** Chenar 1 dreapta: suspensie fixă + siluetă = ride height (bump+ / droop− față de travel +50 mm). */
function E46RideHeightReferenceCell({
  stripImgMax,
  chassisTranslatePx,
  travelMm,
  rideHeightVisActive,
}: {
  stripImgMax: string;
  chassisTranslatePx: number;
  travelMm: number;
  rideHeightVisActive: boolean;
}) {
  const stackRef = useRef<HTMLDivElement | null>(null);
  const [stackH, setStackH] = useState(0);
  const rideDeltaMm = travelMm - CHASSIS_VIS_NEUTRAL_TRAVEL_MM;
  const bodyTranslateY =
    chassisTranslatePx + E46_STRIP_BODY_BASE_OFFSET_Y_PX + E46_STRIP_BODY_VERTICAL_NUDGE_PX;

  useLayoutEffect(() => {
    const el = stackRef.current;
    if (!el) return;
    const sync = () => {
      const h = el.getBoundingClientRect().height;
      if (h > 0) setStackH(h);
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const hForCote = Math.max(stackH, 1);
  const fenderDeltaYPercent = (chassisTranslatePx / hForCote) * 100;
  const fenderRefY = E46_RIDE_HEIGHT_FENDER_REF_Y_PERCENT;
  const fenderCurY = fenderRefY + fenderDeltaYPercent;
  const hubY = E46_RIDE_HEIGHT_SUSPENSION_REF_Y_PERCENT;
  const coteX = E46_RIDE_HEIGHT_COTE_X_PERCENT;
  const coteY1 = Math.min(fenderRefY, fenderCurY);
  const coteY2 = Math.max(fenderRefY, fenderCurY);
  const showCote = rideHeightVisActive && Math.abs(fenderDeltaYPercent) > 0.15;
  /** Poziție pe scala SVG (4…96): 0 mm Δ = centru, +50 mm = sus, −50 mm = jos. */
  const scaleMarkerY =
    rideHeightVisActive && Number.isFinite(rideDeltaMm) ? 50 - (rideDeltaMm / 50) * 46 : 50;

  return (
    <div
      className="relative flex min-h-[72px] min-w-0 flex-1 basis-0 items-center justify-center overflow-visible"
      aria-label="Ride height — referință vizuală bump și droop"
    >
      <div className="relative mx-auto flex w-full justify-center overflow-visible px-2">
        <div ref={stackRef} className="relative inline-block overflow-visible px-3 leading-none">
          <img
            src={e46FrontSuspension}
            alt="BMW E46 față: suspensie și roți — reper fix pentru ride height"
            className={`relative z-0 block h-auto w-full max-w-full object-contain object-center brightness-110 contrast-105 ${stripImgMax}`}
            style={{
              transform: `translate(${E46_STRIP_SUSPENSION_OFFSET_X_PX}px, ${E46_STRIP_SUSPENSION_OFFSET_Y_PX}px)`,
            }}
            decoding="async"
          />
          <img
            src={bmwE46FrontBody}
            alt=""
            className={`pointer-events-none absolute inset-0 z-[1] h-full w-full object-contain object-center opacity-90 ${stripImgMax}`}
            style={{
              transformOrigin: "50% 55%",
              transform: `translate(${E46_RIDE_HEIGHT_BODY_TRANSLATE_X_PX}px, ${bodyTranslateY}px)`,
            }}
            data-sd-ride-height-body-x={E46_RIDE_HEIGHT_BODY_TRANSLATE_X_PX}
            decoding="async"
            aria-hidden
          />
          <svg
            className="pointer-events-none absolute inset-0 z-[2] h-full w-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden
          >
            <title>Cote ride height: siluetă față de suspensie</title>
            <line
              x1={8}
              y1={hubY}
              x2={92}
              y2={hubY}
              stroke="rgba(248,250,252,0.45)"
              strokeWidth={0.35}
              strokeDasharray="1.2 1.2"
            />
            <text x={6} y={hubY - 1.2} fontSize={3.2} fill="rgba(248,250,252,0.5)">
              susp.
            </text>
            <line
              x1={10}
              y1={fenderRefY}
              x2={88}
              y2={fenderRefY}
              stroke="rgba(251,191,36,0.92)"
              strokeWidth={0.45}
              strokeDasharray="2 1.5"
            />
            {showCote ? (
              <line
                x1={10}
                y1={fenderCurY}
                x2={88}
                y2={fenderCurY}
                stroke="rgba(34,211,238,0.95)"
                strokeWidth={0.5}
              />
            ) : null}
            {showCote ? (
              <g>
                <line
                  x1={coteX}
                  y1={coteY1}
                  x2={coteX}
                  y2={coteY2}
                  stroke="rgba(34,211,238,0.85)"
                  strokeWidth={0.45}
                />
                <line
                  x1={coteX - 1.8}
                  y1={coteY1}
                  x2={coteX + 1.8}
                  y2={coteY1}
                  stroke="rgba(251,191,36,0.9)"
                  strokeWidth={0.4}
                />
                <line
                  x1={coteX - 1.8}
                  y1={coteY2}
                  x2={coteX + 1.8}
                  y2={coteY2}
                  stroke="rgba(34,211,238,0.95)"
                  strokeWidth={0.4}
                />
                <text
                  x={coteX + 2.5}
                  y={(coteY1 + coteY2) / 2 + 1}
                  fontSize={3.8}
                  fill="rgba(34,211,238,0.95)"
                >
                  {formatE46RideHeightDeltaMm(rideDeltaMm)}
                </text>
              </g>
            ) : null}
          </svg>
        </div>
        <div className="pointer-events-none absolute inset-0 z-[3]">
          <div className="absolute left-1.5 top-1.5 max-w-[9.5rem] rounded border border-white/10 bg-black/55 px-2 py-1.5 shadow-sm backdrop-blur-sm">
            <p className="text-[8px] font-semibold uppercase tracking-[0.14em] text-cyan-400/90">
              Ride height
            </p>
            <p className="mt-0.5 font-mono text-[13px] tabular-nums leading-none text-cyan-100">
              {rideHeightVisActive ? formatE46RideHeightDeltaMm(rideDeltaMm) : "—"}
            </p>
            <p className="mt-1 text-[8px] leading-snug text-neutral-500">
              Travel {travelMm.toFixed(1)} mm · ref. {CHASSIS_VIS_NEUTRAL_TRAVEL_MM} mm
            </p>
            <p className="text-[7px] leading-snug text-neutral-600">
              Galben = aripă ref. · cyan = aripă curentă · linie albă = reper susp.
            </p>
          </div>
          <svg
            className="absolute right-1 top-3 bottom-3 w-9 text-neutral-500"
            viewBox="0 0 36 100"
            preserveAspectRatio="none"
            aria-hidden
          >
            <title>Scară ride height față de referință</title>
            <line x1={28} y1={4} x2={28} y2={96} stroke="currentColor" strokeOpacity={0.35} strokeWidth={0.8} />
            <line
              x1={20}
              y1={50}
              x2={32}
              y2={50}
              stroke="rgba(251,191,36,0.9)"
              strokeWidth={1}
              strokeDasharray="2 2"
            />
            {rideHeightVisActive ? (
              <g>
                <line x1={20} y1={scaleMarkerY} x2={32} y2={scaleMarkerY} stroke="rgba(34,211,238,0.95)" strokeWidth={1.2} />
                <circle cx={28} cy={scaleMarkerY} r={2.2} fill="rgba(34,211,238,0.95)" />
              </g>
            ) : null}
            <text x={34} y={8} fontSize={5} fill="currentColor" fillOpacity={0.55} textAnchor="start">
              +50
            </text>
            <text x={34} y={54} fontSize={5} fill="rgba(251,191,36,0.9)" textAnchor="start">
              0
            </text>
            <text x={34} y={98} fontSize={5} fill="currentColor" fillOpacity={0.55} textAnchor="start">
              −50
            </text>
          </svg>
        </div>
      </div>
    </div>
  );
}

/** ′ toe (slider) → grade pe diagramă (segment mov). */
const TOE_REF_MIN_TO_SEGMENT_DEG = 0.25;
/** ′ toe → rotateY pe foto (mai amplu ca diagrama — altfel convergența nu se vede pe PNG plat). */
const TOE_REF_MIN_TO_PHOTO_ROTATE_Y_DEG = 2.2;

/**
 * rotateY pe foto = convergență / divergență (nu rotate 2D în planul ecranului).
 * ′ negativ = convergență mărită (toe-in); ′ pozitiv = divergență (toe-out).
 * Oglindit L/R prin camberTravelSign (stânga / dreapta).
 */
function e46ToeConvergenceRotateYDeg(camberTravelSign: 1 | -1, toeRefGuideTravelMin: number): number {
  return camberTravelSign * toeRefGuideTravelMin * TOE_REF_MIN_TO_PHOTO_ROTATE_Y_DEG;
}

const E46_REF_TOE_PIVOT = { x: 52, y: 80 };
/** Pivot inferior axă kingpin / strut (vedere 3D față). */
const E46_REF_CASTER_PIVOT = { x: 43, y: 68 };
/** Lungime segmente caster față de lățimea imaginii (spre montaj superior). */
const E46_CASTER_GUIDE_SEG_LEN_FRAC = 0.34;

/** Lungime segmente toe față de lățimea imaginii (+120% față de baza 0.2). */
const E46_TOE_GUIDE_SEG_LEN_FRAC = 0.2 * 1.2;
/** Coborâre segment galben (referință 0°), px pe ecran — convertit în viewBox SVG. */
const E46_TOE_REF_YELLOW_SCREEN_OFFSET_PX = 20;
/** Mutare orizontală segment galben (px ecran): dreapta +15 spre dreapta. */
const E46_TOE_REF_YELLOW_RIGHT_SCREEN_OFFSET_X_PX = 15;
/** Stânga: pivot % mai la stânga (~15px la scară tipică) — translate X singur nu se vede bine după rotația ~90°. */
const E46_TOE_REF_YELLOW_LEFT_PIVOT_X_PERCENT = 40;

function toeGuideScreenPxToSvg(screenPx: number, naturalDim: number, displayDim: number): number {
  if (displayDim <= 0 || naturalDim <= 0) return screenPx;
  return screenPx * (naturalDim / displayDim);
}

function e46ToeYellowPivotX(
  camberTravelSign: 1 | -1,
  naturalW: number,
  naturalH: number,
  displayWidthPx: number,
  displayHeightPx: number,
): number {
  const displayW =
    displayWidthPx > 0
      ? displayWidthPx
      : displayHeightPx > 0 && naturalH > 0
        ? (naturalW / naturalH) * displayHeightPx
        : naturalW;
  const basePct = E46_REF_TOE_PIVOT.x;
  const pivotPct = camberTravelSign === -1 ? E46_TOE_REF_YELLOW_LEFT_PIVOT_X_PERCENT : basePct;
  let pivX = (pivotPct / 100) * naturalW;
  if (camberTravelSign === 1) {
    pivX += toeGuideScreenPxToSvg(
      E46_TOE_REF_YELLOW_RIGHT_SCREEN_OFFSET_X_PX,
      naturalW,
      displayW,
    );
  }
  return pivX;
}

/** Rotație suplimentară referință galben față de axa longitudinală (+90° / −90° oglindit L/R). */
const E46_TOE_REF_YELLOW_ROTATE_DEG = 90;
/** +20° spre stânga (oglindit: stânga +20°, dreapta −20° față de referința anterioară). */
const E46_TOE_REF_YELLOW_ROTATE_LEFT_DEG = 20;

/** Direcție 0° toe (segment galben) — bază + rotații oglindite L/R. */
function e46ToeZeroReferenceDeg(camberTravelSign: 1 | -1): number {
  const forwardDeg = camberTravelSign === -1 ? 208 : 332;
  return (
    forwardDeg +
    camberTravelSign * E46_TOE_REF_YELLOW_ROTATE_DEG -
    camberTravelSign * E46_TOE_REF_YELLOW_ROTATE_LEFT_DEG
  );
}

/** Grade toe față de referința 0° (din ′ slider). */
function toeRefMinutesToSegmentDeg(toeRefGuideTravelMin: number): number {
  return toeRefGuideTravelMin * TOE_REF_MIN_TO_SEGMENT_DEG;
}

/**
 * Galben = referință 0′ (neutru); mov = unghi plan față de galben (convergență/divergență în diagramă).
 * La 0′ se suprapun. ′ negativ → mov spre convergență (oglindit L/R).
 */
function E46ToeReferenceGuideSegments({
  dims,
  camberTravelSign,
  toeRefGuideTravelMin,
  displayHeightPx,
  displayWidthPx,
  yellowExtraOffsetYPx = 0,
}: {
  dims: { w: number; h: number };
  camberTravelSign: 1 | -1;
  toeRefGuideTravelMin: number;
  /** Dimensiuni randate ale `<img>` (px CSS) — pentru offset vizual corect. */
  displayHeightPx: number;
  displayWidthPx: number;
  /** Coborâre suplimentară doar segment galben (px ecran). */
  yellowExtraOffsetYPx?: number;
}) {
  const w = dims.w;
  const h = dims.h;
  const pivX = e46ToeYellowPivotX(camberTravelSign, w, h, displayWidthPx, displayHeightPx);
  const pivY = (E46_REF_TOE_PIVOT.y / 100) * h;
  const yellowOffsetSvgY =
    toeGuideScreenPxToSvg(E46_TOE_REF_YELLOW_SCREEN_OFFSET_PX, h, displayHeightPx) +
    (yellowExtraOffsetYPx !== 0
      ? toeGuideScreenPxToSvg(yellowExtraOffsetYPx, h, displayHeightPx)
      : 0);
  const segLen = E46_TOE_GUIDE_SEG_LEN_FRAC * w;
  const strokeW = Math.max(1, 0.014 * w);
  const refDeg = e46ToeZeroReferenceDeg(camberTravelSign);
  const toeDeg = camberTravelSign * toeRefMinutesToSegmentDeg(toeRefGuideTravelMin);
  const measuredDeg = refDeg + toeDeg;

  const segment = (
    angleDeg: number,
    stroke: string,
    key: string,
    pivotOffsetXSvg = 0,
    pivotOffsetYSvg = 0,
  ) => (
    <g
      key={key}
      transform={`translate(${pivX + pivotOffsetXSvg},${pivY + pivotOffsetYSvg}) rotate(${angleDeg})`}
    >
      <line
        x1={0}
        y1={0}
        x2={segLen}
        y2={0}
        stroke={stroke}
        strokeWidth={strokeW}
        strokeLinecap="round"
      />
    </g>
  );

  return (
    <>
      {segment(refDeg, "rgba(251,191,36,0.95)", "toe-ref-0", 0, yellowOffsetSvgY)}
      {segment(measuredDeg, "rgba(192,132,252,0.95)", "toe-angle")}
    </>
  );
}

/**
 * Galben = axă caster OEM (paralelă strutului); mov = offset ° față de OEM.
 * Desenat de la pivot inferior spre montaj superior — foto rămâne fixă.
 */
function E46CasterReferenceGuideSegments({
  dims,
  camberTravelSign,
  casterRefGuideTravelDeg,
  coiloverAngleDeg,
  casterPivot,
}: {
  dims: { w: number; h: number };
  camberTravelSign: 1 | -1;
  casterRefGuideTravelDeg: number;
  coiloverAngleDeg: number;
  casterPivot: { x: number; y: number };
}) {
  const w = dims.w;
  const h = dims.h;
  const pivX = (casterPivot.x / 100) * w;
  const pivY = (casterPivot.y / 100) * h;
  const segLen = E46_CASTER_GUIDE_SEG_LEN_FRAC * w;
  const strokeW = Math.max(1, 0.014 * w);
  const refDeg = coiloverAngleDeg;
  const measuredDeg = refDeg - camberTravelSign * casterRefGuideTravelDeg;

  const segment = (angleDeg: number, stroke: string, key: string) => (
    <g key={key} transform={`translate(${pivX},${pivY}) rotate(${angleDeg})`}>
      <line
        x1={0}
        y1={0}
        x2={-segLen}
        y2={0}
        stroke={stroke}
        strokeWidth={strokeW}
        strokeLinecap="round"
      />
    </g>
  );

  return (
    <>
      {segment(refDeg, "rgba(251,191,36,0.95)", "caster-ref")}
      {Math.abs(casterRefGuideTravelDeg) > 0.02
        ? segment(measuredDeg, "rgba(192,132,252,0.95)", "caster-angle")
        : null}
    </>
  );
}

/**
 * Calibrare SVG (viewBox 0–100) pentru `bmw-e46-side-profile-wireframe.png` —
 * profil lateral, față spre stânga.
 * Caster = unghiul între verticală și linia pivot inferior → pivot superior (upright).
 */
const E46_CASTER_SIDE_PROFILE_GUIDE = {
  /** Scară comună șasiu + roată + ghiduri (1 = 100%). */
  stackScale: 1.2,
  /** Pivot inferior (roată / articulație jos). */
  kingpinLower: { x: 20.5, y: 56.2 },
  /** Pivot superior (montaj sus strut). Pozitiv caster = sus ușor spre spate (dreapta). */
  kingpinUpper: { x: 23.2, y: 31.8 },
  /** Verticală de referință (prin pivotul inferior). */
  verticalRefX: 20.5,
  /** Caster OEM documentat (° față de verticală) — pentru etichetă. */
  oemCasterDegMid: 6.2,
  /** Raza arcului unghi caster lângă pivotul inferior. */
  arcRadiusVb: 4.5,
  /** Nudge ghiduri caster (px ecran). */
  guideOffsetScreenXPx: -115,
  guideOffsetScreenYPx: 8,
  /** Roată față (profil lateral) — centru + diametru în viewBox 0–100. */
  frontWheel: {
    cx: 19.8,
    cy: 55.5,
    sizeVb: 28.04,
    /** Nudge fin px ecran (convertit în % la randare). */
    offsetScreenXPx: 50,
    offsetScreenYPx: 12,
  },
  /** Roată spate — aceeași reprezentare, centrată pe pasajul puntei spate. */
  rearWheel: {
    cx: 76.2,
    cy: 55.5,
    sizeVb: 28.04,
    offsetScreenXPx: -50,
    offsetScreenYPx: 12,
  },
  /**
   * Coilover roșu (siluetă completă) — față, în pasajul roții.
   * Aspect sursă 80×97.
   */
  frontCoilover: {
    cx: 24.5,
    cy: 40,
    widthVb: 15.2,
    heightVb: 18.4,
    rotateDeg: -6,
    offsetScreenXPx: 32,
    offsetScreenYPx: 29,
    transformOrigin: "50% 88%",
  },
} as const;

type E46CasterLayerPlacement = {
  cx: number;
  cy: number;
  offsetScreenXPx: number;
  offsetScreenYPx: number;
};

type E46CasterWheelPlacement = E46CasterLayerPlacement & {
  sizeVb: number;
};

function e46CasterOffsetVb(
  placement: E46CasterLayerPlacement,
  shellSize: { w: number; h: number },
): { x: number; y: number } {
  return {
    x: (placement.offsetScreenXPx / shellSize.w) * 100,
    y: (placement.offsetScreenYPx / shellSize.h) * 100,
  };
}

function e46CasterWheelLayerStyle(
  wheel: E46CasterWheelPlacement,
  shellSize: { w: number; h: number },
): { left: string; top: string; width: string; height: string } {
  const off = e46CasterOffsetVb(wheel, shellSize);
  return {
    left: `${wheel.cx - wheel.sizeVb / 2 + off.x}%`,
    top: `${wheel.cy - wheel.sizeVb / 2 + off.y}%`,
    width: `${wheel.sizeVb}%`,
    height: `${wheel.sizeVb}%`,
  };
}

function e46CasterCoiloverLayerStyle(
  coilover: (typeof E46_CASTER_SIDE_PROFILE_GUIDE)["frontCoilover"],
  shellSize: { w: number; h: number },
): { left: string; top: string; width: string; height: string; transform: string; transformOrigin: string } {
  const off = e46CasterOffsetVb(coilover, shellSize);
  return {
    left: `${coilover.cx - coilover.widthVb / 2 + off.x}%`,
    top: `${coilover.cy - coilover.heightVb / 2 + off.y}%`,
    width: `${coilover.widthVb}%`,
    height: `${coilover.heightVb}%`,
    transform: `scaleX(-1) rotate(${coilover.rotateDeg}deg)`,
    transformOrigin: coilover.transformOrigin,
  };
}

function e46RotatePointAroundPivot(
  px: number,
  py: number,
  pivotX: number,
  pivotY: number,
  deltaDeg: number,
): { x: number; y: number } {
  const rad = (deltaDeg * Math.PI) / 180;
  const dx = px - pivotX;
  const dy = py - pivotY;
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  return { x: pivotX + dx * c - dy * s, y: pivotY + dx * s + dy * c };
}

function e46CasterAxisAngleDeg(
  lower: { x: number; y: number },
  upper: { x: number; y: number },
): number {
  return (Math.atan2(upper.y - lower.y, upper.x - lower.x) * 180) / Math.PI;
}

/** Unghi caster (°): între verticală (sus) și axa pivot inferior → superior. */
function e46CasterDegFromVertical(axisDeg: number): number {
  return axisDeg - -90;
}

function e46CasterSvgArcPath(
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

/** Ghid caster: verticală, linie pivot jos→sus, arc unghi față de verticală. */
function E46CasterSideGuideOverlay({
  kingpinLower,
  kingpinUpper,
  verticalRefX,
  arcRadiusVb,
  oemCasterDegMid,
  casterOffsetDeg,
  offsetXVb,
  offsetYVb,
}: {
  kingpinLower: { x: number; y: number };
  kingpinUpper: { x: number; y: number };
  verticalRefX: number;
  arcRadiusVb: number;
  oemCasterDegMid: number;
  casterOffsetDeg: number;
  offsetXVb: number;
  offsetYVb: number;
}) {
  const shift = (x: number, y: number) => ({ x: x + offsetXVb, y: y + offsetYVb });
  const lower = shift(kingpinLower.x, kingpinLower.y);
  const upper = shift(kingpinUpper.x, kingpinUpper.y);
  const vertX = verticalRefX + offsetXVb;
  /**
   * Convenție UI: ⊥ punctat = neutru · galben punctat = axa neutră (OEM) · mov = deviere.
   * Slider +: mov spre stânga față de galben · −: spre dreapta (SVG y↓ → rotatie = −offset).
   */
  const casterDeltaDeg = -casterOffsetDeg;
  const adjustedUpperRaw = e46RotatePointAroundPivot(
    kingpinUpper.x,
    kingpinUpper.y,
    kingpinLower.x,
    kingpinLower.y,
    casterDeltaDeg,
  );
  const adjustedUpper = shift(adjustedUpperRaw.x, adjustedUpperRaw.y);
  const oemAxisDeg = e46CasterAxisAngleDeg(kingpinLower, kingpinUpper);
  const adjAxisDeg = e46CasterAxisAngleDeg(
    { x: kingpinLower.x, y: kingpinLower.y },
    { x: adjustedUpperRaw.x, y: adjustedUpperRaw.y },
  );
  const verticalAxisDeg = -90;
  const oemCasterFromVert = e46CasterDegFromVertical(oemAxisDeg);
  const showAdjusted = Math.abs(casterOffsetDeg) > 0.04;
  const verticalTopY = Math.min(upper.y, adjustedUpper.y) - 2.5;
  const verticalBottomY = lower.y + 1.5;
  const arcLabelX = lower.x + arcRadiusVb * 0.95;
  const arcLabelY = lower.y - arcRadiusVb * 1.15;

  return (
    <>
      <title>
        Caster: ⊥ punctat = neutru vertical · galben punctat = axa neutră · mov = + stânga / − dreapta
      </title>
      <line
        x1={vertX}
        y1={verticalBottomY}
        x2={vertX}
        y2={verticalTopY}
        stroke="rgba(248,250,252,0.5)"
        strokeWidth="0.38"
        strokeDasharray="1.6 1.3"
        strokeLinecap="round"
      />
      <text x={vertX - 2.8} y={verticalTopY - 1.2} fontSize="2.6" fill="rgba(248,250,252,0.55)">
        ⊥
      </text>
      <line
        x1={lower.x}
        y1={lower.y}
        x2={upper.x}
        y2={upper.y}
        stroke="rgba(251,191,36,0.95)"
        strokeWidth="0.58"
        strokeDasharray="2 1.4"
        strokeLinecap="round"
      />
      {showAdjusted ? (
        <line
          x1={lower.x}
          y1={lower.y}
          x2={adjustedUpper.x}
          y2={adjustedUpper.y}
          stroke="rgba(192,132,252,0.95)"
          strokeWidth="0.6"
          strokeLinecap="round"
        />
      ) : null}
      <path
        d={e46CasterSvgArcPath(lower.x, lower.y, arcRadiusVb, verticalAxisDeg, oemAxisDeg)}
        fill="none"
        stroke="rgba(251,191,36,0.75)"
        strokeWidth="0.42"
      />
      {showAdjusted ? (
        <path
          d={e46CasterSvgArcPath(lower.x, lower.y, arcRadiusVb + 0.9, oemAxisDeg, adjAxisDeg)}
          fill="none"
          stroke="rgba(192,132,252,0.8)"
          strokeWidth="0.42"
        />
      ) : null}
      <circle
        cx={lower.x}
        cy={lower.y}
        r="1.05"
        fill="rgba(56,189,248,0.4)"
        stroke="rgba(56,189,248,0.85)"
        strokeWidth="0.28"
      />
      <circle
        cx={upper.x}
        cy={upper.y}
        r="0.85"
        fill="rgba(251,191,36,0.35)"
        stroke="rgba(251,191,36,0.9)"
        strokeWidth="0.24"
      />
      {showAdjusted ? (
        <circle
          cx={adjustedUpper.x}
          cy={adjustedUpper.y}
          r="0.85"
          fill="rgba(192,132,252,0.35)"
          stroke="rgba(192,132,252,0.95)"
          strokeWidth="0.24"
        />
      ) : null}
      <text x={arcLabelX} y={arcLabelY} fontSize="2.85" fill="rgba(251,191,36,0.95)">
        {oemCasterFromVert.toFixed(1)}° OEM
      </text>
      {showAdjusted ? (
        <text x={arcLabelX + 0.5} y={arcLabelY + 3.2} fontSize="2.85" fill="rgba(192,132,252,0.95)">
          {casterOffsetDeg >= 0 ? "+" : ""}
          {casterOffsetDeg.toFixed(1)}°
          {casterOffsetDeg > 0.04 ? " ←" : casterOffsetDeg < -0.04 ? " →" : ""}
        </text>
      ) : null}
      <text x="50" y="7" textAnchor="middle" fill="rgba(148,163,184,0.85)" fontSize="3">
        Caster · neutru galben · +° = mov spre stânga · față ←
      </text>
      <text x="50" y="94" textAnchor="middle" fill="rgba(148,163,184,0.75)" fontSize="2.8">
        {showAdjusted
          ? `Offset ${casterOffsetDeg >= 0 ? "+" : ""}${casterOffsetDeg.toFixed(1)}° față de neutru (OEM ≈ ${oemCasterDegMid.toFixed(1)}° față de ⊥)`
          : `Axă neutră (galben) · ⊥ = verticală de referință`}
      </text>
    </>
  );
}

/** Vedere laterală: șasiu wireframe + roți față/spate + axă caster (galben OEM / mov offset). */
function E46CasterSideReferenceCell({
  casterRefGuideTravelDeg,
  casterVisActive,
  imgMaxClassName,
}: {
  casterRefGuideTravelDeg: number;
  casterVisActive: boolean;
  imgMaxClassName: string;
}) {
  const {
    stackScale,
    kingpinLower,
    kingpinUpper,
    verticalRefX,
    arcRadiusVb,
    oemCasterDegMid,
    guideOffsetScreenXPx,
    guideOffsetScreenYPx,
    frontWheel,
    rearWheel,
    frontCoilover,
  } = E46_CASTER_SIDE_PROFILE_GUIDE;
  const showGuides = casterVisActive;
  const shellRef = useRef<HTMLDivElement | null>(null);
  const [shellSize, setShellSize] = useState({ w: 400, h: 267 });

  useLayoutEffect(() => {
    const el = shellRef.current;
    if (!el) return;
    const sync = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) setShellSize({ w: rect.width, h: rect.height });
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const frontWheelStyle = e46CasterWheelLayerStyle(frontWheel, shellSize);
  const rearWheelStyle = e46CasterWheelLayerStyle(rearWheel, shellSize);
  const frontCoiloverStyle = e46CasterCoiloverLayerStyle(frontCoilover, shellSize);
  const guideOffset = e46CasterOffsetVb(
    { cx: 0, cy: 0, offsetScreenXPx: guideOffsetScreenXPx, offsetScreenYPx: guideOffsetScreenYPx },
    shellSize,
  );
  /** Același unghi ca segmentul mov: +° = spre stânga (SVG y↓). */
  const casterDeltaDeg = -casterRefGuideTravelDeg;
  const frontWheelOffset = e46CasterOffsetVb(frontWheel, shellSize);
  /** Rotație ansamblu roată + coilover în jurul axei roții (centrul hub). */
  const wheelAxisOrigin = `${frontWheel.cx + frontWheelOffset.x}% ${frontWheel.cy + frontWheelOffset.y}%`;
  const frontAssemblyRotate =
    showGuides && Math.abs(casterRefGuideTravelDeg) > 0.001
      ? `rotate(${casterDeltaDeg}deg)`
      : undefined;

  return (
    <div className="relative mx-auto w-full max-w-[min(100%,640px)]">
      <div
        ref={shellRef}
        className={`relative mx-auto aspect-[1024/682] w-full overflow-visible ${imgMaxClassName}`}
      >
        <div
          className="absolute inset-0 origin-center"
          style={{ transform: `scale(${stackScale})` }}
        >
          <img
            src={bmwE46SideProfileWireframe}
            alt="BMW E46 M3 — profil lateral wireframe (referință șasiu caster)"
            className="absolute inset-0 z-0 h-full w-full object-contain"
            draggable={false}
            decoding="async"
          />
          <img
            src={bmwE46FrontWheelSide}
            alt="Roată spate — profil lateral (referință caster)"
            className="pointer-events-none absolute z-[1] object-contain"
            style={rearWheelStyle}
            draggable={false}
            decoding="async"
          />
          <div
            className="pointer-events-none absolute inset-0 z-[1]"
            style={{
              transformOrigin: wheelAxisOrigin,
              transform: frontAssemblyRotate,
              willChange: frontAssemblyRotate ? "transform" : undefined,
            }}
          >
            <img
              src={bmwE46FrontWheelSide}
              alt="Roată față — profil lateral (referință caster)"
              className="pointer-events-none absolute object-contain"
              style={frontWheelStyle}
              draggable={false}
              decoding="async"
            />
            <img
              src={bmwE46CoiloverColored}
              alt="Coilover față — reprezentare roșie"
              className="pointer-events-none absolute z-[1] object-contain"
              style={frontCoiloverStyle}
              draggable={false}
              decoding="async"
            />
          </div>
          {showGuides ? (
            <svg
              className="pointer-events-none absolute inset-0 z-[3] h-full w-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="xMidYMid meet"
            aria-hidden
          >
            <E46CasterSideGuideOverlay
              kingpinLower={kingpinLower}
              kingpinUpper={kingpinUpper}
              verticalRefX={verticalRefX}
              arcRadiusVb={arcRadiusVb}
              oemCasterDegMid={oemCasterDegMid}
              casterOffsetDeg={casterRefGuideTravelDeg}
              offsetXVb={guideOffset.x}
              offsetYVb={guideOffset.y}
            />
          </svg>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/**
 * Calibrare SVG (viewBox 0–100) pentru `bmw-e46-topdown-wireframe-white.png` —
 * față spre dreapta; ecartament pe axa Y.
 */
const E46_TOE_WIREFRAME_GUIDE = {
  frontLeft: { cx: 77.2, cy: 70.7 },
  frontRight: { cx: 75.4, cy: 19.1 },
  axleX: 76.3,
  wheelHalfLen: 7.5,
  /** Nudge ghidaje toe (px ecran) — aliniere fină pe wireframe. */
  offsetScreenXPx: 30,
  /** Wireframe PNG separat de ghidaje (px ecran). */
  imageOffsetScreenXPx: 10,
  /** Segment mov: prelungire spre dreapta (față mașinii) în px ecran. */
  purpleExtendRightScreenPx: 75,
} as const;

/** Roți față — vedere de sus (′ total → unghi schematic per roată). */
function E46ToePlanReferenceCell({
  toeRefGuideTravelMin,
  toeVisActive,
  imgMaxClassName,
}: {
  toeRefGuideTravelMin: number;
  toeVisActive: boolean;
  imgMaxClassName: string;
}) {
  const {
    frontLeft,
    frontRight,
    axleX,
    wheelHalfLen,
    offsetScreenXPx,
    imageOffsetScreenXPx,
    purpleExtendRightScreenPx,
  } = E46_TOE_WIREFRAME_GUIDE;
  const toeDeg = toeVisActive ? toeRefMinutesToSegmentDeg(toeRefGuideTravelMin) : 0;
  const shellRef = useRef<HTMLDivElement | null>(null);
  const [overlayWidthPx, setOverlayWidthPx] = useState(400);

  useLayoutEffect(() => {
    const el = shellRef.current;
    if (!el) return;
    const sync = () => {
      const w = el.getBoundingClientRect().width;
      if (w > 0) setOverlayWidthPx(w);
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const purpleExtendRightVb = (purpleExtendRightScreenPx / overlayWidthPx) * 100;

  /** Galben = referință 0′ (vertical / ecartament); mov = toe curent (orizontal, rotație ′). */
  const wheelToeLine = (
    cx: number,
    cy: number,
    sign: 1 | -1,
    key: string,
  ) => {
    const deg = sign * toeDeg;
    const y1 = cy - wheelHalfLen;
    const y2 = cy + wheelHalfLen;
    const x1 = cx - wheelHalfLen;
    const x2 = cx + wheelHalfLen + purpleExtendRightVb;
    return (
      <g key={key}>
        <line
          x1={cx}
          y1={y1}
          x2={cx}
          y2={y2}
          stroke="rgba(251,191,36,0.92)"
          strokeWidth="0.42"
          strokeLinecap="round"
        />
        <g transform={`rotate(${deg} ${cx} ${cy})`}>
          <line
            x1={x1}
            y1={cy}
            x2={x2}
            y2={cy}
            stroke="rgba(192,132,252,0.95)"
            strokeWidth="0.48"
            strokeLinecap="round"
          />
        </g>
        <circle
          cx={cx}
          cy={cy}
          r="1.1"
          fill="rgba(56,189,248,0.35)"
          stroke="rgba(56,189,248,0.7)"
          strokeWidth="0.2"
        />
      </g>
    );
  };

  return (
    <div className="relative mx-auto w-full max-w-[min(100%,520px)]">
      <div ref={shellRef} className={`relative mx-auto aspect-[1024/644] w-full ${imgMaxClassName}`}>
        <img
          src={bmwE46TopdownWireframeWhite}
          alt="BMW E46 — wireframe vedere de sus, referință toe față"
          className="absolute inset-0 h-full w-full object-contain"
          style={{ transform: `translateX(${imageOffsetScreenXPx}px)` }}
          draggable={false}
          decoding="async"
        />
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="xMidYMid meet"
          aria-hidden
        >
          <title>Toe față: galben = 0′ pe ecartament, mov = convergență/divergență totală</title>
          <g style={{ transform: `translateX(${offsetScreenXPx}px)` }}>
            <line
              x1={axleX}
              y1={frontRight.cy}
              x2={axleX}
              y2={frontLeft.cy}
              stroke="rgba(56,189,248,0.4)"
              strokeWidth="0.32"
              strokeDasharray="1.2 1"
            />
            {wheelToeLine(frontLeft.cx, frontLeft.cy, 1, "toe-fl")}
            {wheelToeLine(frontRight.cx, frontRight.cy, -1, "toe-fr")}
          </g>
          <text x="50" y="6" textAnchor="middle" fill="rgba(148,163,184,0.8)" fontSize="3">
            Toe total față · față →
          </text>
          {toeVisActive ? (
            <text x="50" y="93" textAnchor="middle" fill="rgba(192,132,252,0.9)" fontSize="3.2">
              {toeRefGuideTravelMin >= 0 ? "+" : ""}
              {toeRefGuideTravelMin.toFixed(1)}′
            </text>
          ) : null}
        </svg>
      </div>
    </div>
  );
}

/** Panoul de travel din viewport — ~30% mai compact pe înălțime. */
const VIEWPORT_TRAVEL_FOOTER_SHELL =
  "border-t border-white/10 bg-[#0b0f14]/95 px-3 py-1.5 backdrop-blur-md transition-shadow";
const VIEWPORT_TRAVEL_FOOTER_STACK = "flex flex-col gap-1.5";

const E46_REF_VIS_BTN_ON =
  "border-cyan-400/55 bg-cyan-500/15 text-cyan-100 shadow-[0_0_12px_rgba(34,211,238,0.2)]";
const E46_REF_VIS_BTN_OFF =
  "border-white/12 bg-white/[0.04] text-neutral-500 hover:border-white/20 hover:text-neutral-300";

function E46RefGuideTravelBar({
  label,
  value,
  min,
  max,
  step,
  formatValue,
  minLabel,
  maxLabel,
  title,
  onChange,
  refVisActive,
  onRefVisActiveChange,
  refVisTitle,
  refVisButtonLabel = "Chenar",
  refVisButtonUppercase = true,
  onRefRepresentFocus,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  formatValue: (v: number) => string;
  minLabel: string;
  maxLabel: string;
  title: string;
  onChange: (v: number) => void;
  refVisActive?: boolean;
  onRefVisActiveChange?: (active: boolean) => void;
  refVisTitle?: string;
  refVisButtonLabel?: string;
  /** false = păstrează capitalizarea din `refVisButtonLabel` (ex. „Ride height”). */
  refVisButtonUppercase?: boolean;
  /** La activare: slide carusel + overlay pentru setarea reprezentată. */
  onRefRepresentFocus?: () => void;
}) {
  const showRefVisToggle = onRefVisActiveChange != null && refVisActive != null;

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center justify-between gap-2 leading-none">
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          {showRefVisToggle ? (
            <button
              type="button"
              className={[
                "shrink-0 rounded border px-2 py-0.5 text-[8px] font-semibold tracking-wide transition",
                refVisButtonUppercase ? "uppercase" : "normal-case",
                refVisActive ? E46_REF_VIS_BTN_ON : E46_REF_VIS_BTN_OFF,
              ].join(" ")}
              aria-pressed={refVisActive}
              title={
                refVisTitle ??
                (refVisActive
                  ? "Reprezentarea acestei setări este afișată în carusel."
                  : "Click pentru a afișa poza din carusel care reprezintă această setare.")
              }
              onClick={() => {
                if (onRefVisActiveChange != null && refVisActive != null) {
                  const next = !refVisActive;
                  onRefVisActiveChange(next);
                  if (next && onRefRepresentFocus) onRefRepresentFocus();
                  return;
                }
                if (onRefRepresentFocus) {
                  onRefRepresentFocus();
                  return;
                }
                onRefVisActiveChange(true);
              }}
            >
              {refVisButtonLabel}
            </button>
          ) : null}
          <span className="truncate text-[10px] font-medium uppercase tracking-wide text-neutral-400">
            {label}
          </span>
        </div>
        <span className="shrink-0 font-mono text-[11px] tabular-nums text-cyan-200/90">{formatValue(value)}</span>
      </div>
      <input
        type="range"
        className="sd-rail h-1.5 w-full cursor-pointer"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        title={title}
      />
      <div className="flex justify-between font-mono text-[9px] leading-none text-neutral-500">
        <span>{minLabel}</span>
        <span>0</span>
        <span>{maxLabel}</span>
      </div>
    </div>
  );
}

/** Segment cyan paralel cu strutul (se rotește cu foto); liniile verticale punctate rămân fixe în chenarul figurii. */
function E46CamberRefWithVerticalGuides({
  src,
  alt,
  caption,
  coiloverAngleDeg,
  coiloverPivot,
  verticalGuideXPercent,
  camberRefGuideTravelDeg,
  casterRefGuideTravelDeg = 0,
  toeRefGuideTravelMin = 0,
  /** Pivot inferior axă kingpin; implicit aliniat cu `coiloverPivot.x`. */
  casterPivot,
  /** Stânga: −1, dreapta: +1 — același unghi din store pe poze oglindă. */
  camberTravelSign,
  /** În banda de sus: aceeași scală ca `stripImgMax` (aliniază cu suspensia din dreapta). */
  imgMaxClassName,
  hideCaption,
  figureClassName,
  /** Nudge vizual în chenar (ex. banda de sus); nu rotește pivotul. */
  visualOffsetXPx,
  visualOffsetYPx,
  /** Coborâre doar a PNG-ului (px), fără ghidurile fixe din chenar. */
  imageOffsetYPx,
  /** Coborâre suplimentară segment galben (px ecran). */
  yellowExtraOffsetYPx,
  /** Coborâre strat toe+imagine (px ecran CSS) — vizibil indiferent de rotația segmentelor. */
  contentOffsetYPx,
  /** false = fără rotateY / segmente toe pe foto 3D (toe are chenar dedicat plan). */
  enableToeOverlay = true,
  /**
   * true = caster pe axe galben/mov (foto fixă); false = rotație 2D legacy a întregii poze.
   * Slide-ul dedicat Caster folosește ghiduri, nu rotația foto.
   */
  casterGuideOverlayOnly = false,
}: {
  src: string;
  alt: string;
  caption: string;
  /** Rotație în ° (SVG: sens pozitiv ≈ ceasornic); segmentul e orizontal înainte de rotate. */
  coiloverAngleDeg: number;
  /** Pivot în coordonate normalizate față de lățimea / înălțimea imaginii (0–100). */
  coiloverPivot: { x: number; y: number };
  verticalGuideXPercent: [number, number];
  /** „Travel” rotativ: offset în °; convenție: negativ = capăt superior spre interior (spre axa longitudinală). */
  camberRefGuideTravelDeg: number;
  casterRefGuideTravelDeg?: number;
  toeRefGuideTravelMin?: number;
  casterPivot?: { x: number; y: number };
  camberTravelSign: 1 | -1;
  imgMaxClassName?: string;
  hideCaption?: boolean;
  figureClassName?: string;
  visualOffsetXPx?: number;
  visualOffsetYPx?: number;
  imageOffsetYPx?: number;
  yellowExtraOffsetYPx?: number;
  contentOffsetYPx?: number;
  enableToeOverlay?: boolean;
  casterGuideOverlayOnly?: boolean;
}) {
  const naturalFallback = e46CamberNaturalFallbackForSrc(src);
  const [dims, setDims] = useState<{ w: number; h: number }>(() => naturalFallback);
  const [renderedImgH, setRenderedImgH] = useState(E46_CAMBER_REF_DISPLAY_H_PX);
  const [renderedImgW, setRenderedImgW] = useState(120);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const imgMax = imgMaxClassName ?? E46_CAMBER_IMG_MAX;
  const imgShellClass = `block h-auto ${imgMax} w-auto max-w-full`;

  const readDimsFromImg = (el: HTMLImageElement | null) => {
    if (el && el.naturalWidth > 0 && el.naturalHeight > 0) {
      setDims({ w: el.naturalWidth, h: el.naturalHeight });
    }
    if (el) {
      const rect = el.getBoundingClientRect();
      if (rect.height > 0) setRenderedImgH(rect.height);
      if (rect.width > 0) setRenderedImgW(rect.width);
    }
  };

  useLayoutEffect(() => {
    setDims(naturalFallback);
    const el = imgRef.current;
    if (!el) return;
    const sync = () => readDimsFromImg(el);
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, [src, naturalFallback.w, naturalFallback.h]);

  const ox = visualOffsetXPx ?? 0;
  const oy = visualOffsetYPx ?? 0;
  const imgOy = imageOffsetYPx ?? 0;
  const stackOy = contentOffsetYPx ?? 0;
  const figureNudgeStyle = ox !== 0 || oy !== 0 ? ({ transform: `translate(${ox}px, ${oy}px)` } as const) : undefined;
  const imgOffsetStyle =
    stackOy === 0 && imgOy !== 0 ? ({ transform: `translateY(${imgOy}px)` } as const) : undefined;
  const contentStackStyle =
    stackOy !== 0 ? ({ transform: `translateY(${stackOy}px)` } as const) : undefined;

  const sign = camberTravelSign;
  const resolvedCasterPivot =
    casterPivot ?? { x: coiloverPivot.x, y: E46_REF_CASTER_PIVOT.y };
  const toeConvergenceRotateYDeg = e46ToeConvergenceRotateYDeg(sign, toeRefGuideTravelMin);
  const toePivotOrigin = `${E46_REF_TOE_PIVOT.x}% ${E46_REF_TOE_PIVOT.y}%` as const;
  const casterPivotOrigin = `${resolvedCasterPivot.x}% ${resolvedCasterPivot.y}%` as const;
  const casterRotateDeg = casterGuideOverlayOnly ? 0 : -sign * casterRefGuideTravelDeg;
  const camberRotateDeg = sign * camberRefGuideTravelDeg;
  const showCasterAxisGuides = casterGuideOverlayOnly;

  return (
    <figure
      className={
        figureClassName ?? "flex min-w-0 flex-1 flex-col items-center gap-1"
      }
      style={figureNudgeStyle}
    >
      <div className={`relative mx-auto inline-block max-w-full overflow-visible ${imgMax}`}>
        <div
          className="relative inline-block max-w-full overflow-visible"
          style={{
            perspective: enableToeOverlay ? "420px" : undefined,
            perspectiveOrigin: enableToeOverlay ? toePivotOrigin : undefined,
            transformStyle: enableToeOverlay ? "preserve-3d" : undefined,
          }}
        >
          <div
            className="relative inline-block max-w-full"
            style={{ ...contentStackStyle, transformStyle: "preserve-3d" }}
          >
            {enableToeOverlay ? (
              <svg
                className="pointer-events-none absolute inset-0 z-[5] h-full w-full"
                viewBox={`0 0 ${dims.w} ${dims.h}`}
                preserveAspectRatio="xMidYMid meet"
                aria-hidden
              >
                <title>Toe: galben = 0° referință, mov = unghi curent (grade)</title>
                <E46ToeReferenceGuideSegments
                  dims={dims}
                  camberTravelSign={camberTravelSign}
                  toeRefGuideTravelMin={toeRefGuideTravelMin}
                  displayHeightPx={renderedImgH}
                  displayWidthPx={renderedImgW}
                  yellowExtraOffsetYPx={yellowExtraOffsetYPx}
                />
              </svg>
            ) : null}
            <div
              className="relative inline-block max-w-full"
              style={{
                transformOrigin: enableToeOverlay ? toePivotOrigin : undefined,
                transformStyle: "preserve-3d",
                transform: enableToeOverlay ? `rotateY(${toeConvergenceRotateYDeg}deg)` : undefined,
                willChange: enableToeOverlay ? "transform" : undefined,
              }}
            >
              <div
                className="relative inline-block max-w-full"
                style={{
                  transformOrigin: casterPivotOrigin,
                  transformStyle: "preserve-3d",
                  transform:
                    casterRotateDeg !== 0 ? `rotate(${casterRotateDeg}deg)` : undefined,
                }}
              >
                <div
                  className="relative inline-block max-w-full"
                  style={{
                    transformOrigin: `${coiloverPivot.x}% ${coiloverPivot.y}%`,
                    transformStyle: "preserve-3d",
                    transform: `rotate(${camberRotateDeg}deg)`,
                  }}
                >
                <img
                  ref={imgRef}
                  src={src}
                  alt={alt}
                  className={`relative z-0 ${imgShellClass}`}
                  style={imgOffsetStyle}
                  decoding="async"
                  onLoad={(e) => readDimsFromImg(e.currentTarget)}
                />
                <svg
                  className="pointer-events-none absolute inset-0 z-10 h-full w-full"
                  viewBox={`0 0 ${dims.w} ${dims.h}`}
                  preserveAspectRatio="xMidYMid meet"
                  aria-hidden
                >
                  {(() => {
                      const w = dims.w;
                      const h = dims.h;
                      const pivX = (coiloverPivot.x / 100) * w;
                      const pivY = (coiloverPivot.y / 100) * h;
                      const guideAngleDeg = coiloverAngleDeg;
                      const halfLen = 0.44 * w;
                      const cyanW = Math.max(1.1, 0.016 * w);
                      return (
                        <g transform={`translate(${pivX},${pivY}) rotate(${guideAngleDeg})`}>
                          <line
                            x1={-halfLen}
                            y1={0}
                            x2={halfLen}
                            y2={0}
                            stroke="rgba(34,211,238,0.9)"
                            strokeWidth={cyanW}
                            strokeLinecap="round"
                          />
                        </g>
                      );
                    })()}
                </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
        {showCasterAxisGuides ? (
          <svg
            className="pointer-events-none absolute inset-0 z-[8] h-full w-full"
            viewBox={`0 0 ${dims.w} ${dims.h}`}
            preserveAspectRatio="xMidYMid meet"
            aria-hidden
          >
            <title>Caster: galben = OEM, mov = offset ° pe axa kingpin</title>
            <E46CasterReferenceGuideSegments
              dims={dims}
              camberTravelSign={camberTravelSign}
              casterRefGuideTravelDeg={casterRefGuideTravelDeg}
              coiloverAngleDeg={coiloverAngleDeg}
              casterPivot={resolvedCasterPivot}
            />
          </svg>
        ) : null}
        <svg
          className="pointer-events-none absolute inset-0 z-20 h-full w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden
        >
          <line
            x1={verticalGuideXPercent[0]}
            y1={0}
            x2={verticalGuideXPercent[0]}
            y2={100}
            stroke="rgba(248,250,252,0.55)"
            strokeWidth="0.55"
            strokeDasharray="2.5 2.5"
            vectorEffect="non-scaling-stroke"
          />
          <line
            x1={verticalGuideXPercent[1]}
            y1={0}
            x2={verticalGuideXPercent[1]}
            y2={100}
            stroke="rgba(248,250,252,0.55)"
            strokeWidth="0.55"
            strokeDasharray="2.5 2.5"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>
      {hideCaption ? null : (
        <figcaption className="text-[9px] text-neutral-500">
          {casterGuideOverlayOnly
            ? `${caption} · galben OEM · mov offset caster`
            : caption}
        </figcaption>
      )}
    </figure>
  );
}

/** Suspensie (jos) + siluetă caroserie (deasupra). Stânga: fără PNG suspensie roșie — strat foto camber L/R + siluetă deasupra. */
function E46FrontLayeredReferenceCell({
  stripImgMax,
  chassisTranslatePx,
  shellClassName,
  ariaHidden,
  showSuspensionLayer = true,
  camberRefGuideTravelDeg = 0,
  casterRefGuideTravelDeg = 0,
  toeRefGuideTravelMin = 0,
  /** Înălțime max. implicită clone camber (bază bandă); folosit dacă L/R nu au override. */
  camberCloneImgMax,
  /** Înălțime max. doar pentru clona camber stânga (implicit = `camberCloneImgMax`). */
  camberCloneLeftImgMax,
  /** Înălțime max. doar pentru clona camber dreapta (implicit = aceeași ca stânga). */
  camberCloneRightImgMax,
  /** Doar compozit stânga: factor de scară pentru PNG caroserie (clonele camber rămân la `camberCloneImgMax`). */
  bodySilhouetteScale = 1,
}: {
  stripImgMax: string;
  chassisTranslatePx: number;
  shellClassName?: string;
  /** Duplicat vizual — ascuns pentru cititoare de ecran. */
  ariaHidden?: boolean;
  /** Dacă e false: strat camber (stânga+dreapta) + siluetă; fără `e46-front-suspension`. */
  showSuspensionLayer?: boolean;
  /** Folosit când `showSuspensionLayer` e false (același slider ca în viewport). */
  camberRefGuideTravelDeg?: number;
  casterRefGuideTravelDeg?: number;
  toeRefGuideTravelMin?: number;
  camberCloneImgMax?: string;
  camberCloneLeftImgMax?: string;
  camberCloneRightImgMax?: string;
  bodySilhouetteScale?: number;
}) {
  const bodyTransform = `translate(${E46_STRIP_SUSPENSION_OFFSET_X_PX + E46_STRIP_BODY_DELTA_X_PX}px, ${
    chassisTranslatePx + E46_STRIP_BODY_BASE_OFFSET_Y_PX + E46_STRIP_BODY_VERTICAL_NUDGE_PX
  }px)`;

  /** `shrink-0` — altfel `flex-1` umple jumătate de rând fiecare și `gap` nu separă imaginile. */
  const stripCamberFigureClass =
    "m-0 flex shrink-0 flex-col items-center justify-end gap-0 min-h-[min(13.2vh,120px)]";

  const cloneImgMax = camberCloneImgMax ?? stripImgMax;
  const cloneLeftImgMax = camberCloneLeftImgMax ?? cloneImgMax;
  const cloneRightImgMax = camberCloneRightImgMax ?? cloneImgMax;
  const silScale = bodySilhouetteScale ?? 1;
  const silhouetteOverflows = !showSuspensionLayer && silScale > 1;
  const bodyImgStyleSilhouetteOnly:
    | { transform: string }
    | { transform: string; transformOrigin: string } =
    silScale === 1
      ? { transform: bodyTransform }
      : {
          transform: `${bodyTransform} scale(${silScale})`,
          transformOrigin: "50% 58%",
        };

  return (
    <div
      aria-hidden={ariaHidden}
      className={[
        "relative flex min-h-[72px] min-w-0 flex-1 basis-0 items-center justify-center",
        silhouetteOverflows ? "overflow-visible" : "overflow-hidden",
        shellClassName ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div
        className={[
          "relative mx-auto w-full max-w-full px-0 sm:px-2 sm:pr-10",
          silhouetteOverflows ? "overflow-visible" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {showSuspensionLayer ? (
          <>
            <img
              src={e46FrontSuspension}
              alt="Referință BMW E46 (axă față): suspensie și roți — strat fix"
              className={`relative z-0 mx-auto block h-auto w-full object-contain object-center brightness-110 contrast-105 ${stripImgMax}`}
              style={{
                transform: `translate(${E46_STRIP_SUSPENSION_OFFSET_X_PX}px, ${E46_STRIP_SUSPENSION_OFFSET_Y_PX}px)`,
              }}
              decoding="async"
            />
            <div
              className="pointer-events-none absolute inset-0 z-[1] flex items-center justify-center overflow-hidden"
              aria-hidden
            >
              <img
                src={bmwE46FrontBody}
                alt=""
                className={`relative z-[1] mx-auto h-full w-full object-contain object-center opacity-90 ${stripImgMax}`}
                style={{ transform: bodyTransform }}
              />
            </div>
          </>
        ) : (
          <>
            <div className="relative z-0 flex w-full flex-row items-end justify-center">
              <E46CamberRefWithVerticalGuides
                src={bmwE46CamberRefLeft}
                alt="BMW E46 față: suspensie și roată — referință vedere stânga (camber)"
                caption="Referință 3D — față stânga"
                coiloverAngleDeg={-80.46}
                coiloverPivot={{ x: 43, y: 38 }}
                verticalGuideXPercent={[36, 64]}
                camberRefGuideTravelDeg={camberRefGuideTravelDeg}
                casterRefGuideTravelDeg={casterRefGuideTravelDeg}
                toeRefGuideTravelMin={toeRefGuideTravelMin}
                camberTravelSign={-1}
                imgMaxClassName={cloneLeftImgMax}
                hideCaption
                figureClassName={stripCamberFigureClass}
                visualOffsetYPx={30}
              />
              <div
                className="shrink-0"
                style={{ width: E46_STRIP_CAMBER_CLONE_GAP_PX, minWidth: E46_STRIP_CAMBER_CLONE_GAP_PX }}
                aria-hidden
              />
              <E46CamberRefWithVerticalGuides
                src={bmwE46CamberRefRight}
                alt="BMW E46 față: suspensie și roată — referință vedere dreapta (camber)"
                caption="Referință 3D — față dreapta"
                coiloverAngleDeg={80.46}
                coiloverPivot={{ x: 57, y: 38 }}
                verticalGuideXPercent={[36, 64]}
                camberRefGuideTravelDeg={camberRefGuideTravelDeg}
                casterRefGuideTravelDeg={casterRefGuideTravelDeg}
                toeRefGuideTravelMin={toeRefGuideTravelMin}
                camberTravelSign={1}
                imgMaxClassName={cloneRightImgMax}
                hideCaption
                figureClassName={stripCamberFigureClass}
                visualOffsetYPx={30}
              />
            </div>
            <div
              className={[
                "pointer-events-none absolute inset-0 z-[2] flex items-center justify-center",
                silhouetteOverflows ? "overflow-visible" : "overflow-hidden",
              ]
                .filter(Boolean)
                .join(" ")}
              aria-hidden
            >
              <img
                src={bmwE46FrontBody}
                alt=""
                className={`relative z-[2] mx-auto h-full w-full max-w-full object-contain object-center opacity-90 ${stripImgMax}`}
                style={bodyImgStyleSilhouetteOnly}
                decoding="async"
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const X5_REFERENCE_CAROUSEL_SLIDES = [
  {
    key: "side",
    title: "BMW X5 E53 · profil",
    subtitle: "Siluetă laterală · referință generică",
    src: bmwX5E53Generic,
    alt: "BMW X5 E53 — profil lateral, referință suspensie",
  },
  {
    key: "three-quarter",
    title: "BMW X5 E53 · 3/4 față",
    subtitle: "Ride height · fără roți",
    src: bmwX5E53ThreeQuarter,
    alt: "BMW X5 E53 — vedere 3/4 față, referință ride height",
  },
  {
    key: "front",
    title: "BMW X5 E53 · față",
    subtitle: "Vedere frontală · wireframe",
    src: bmwX5E53Front,
    alt: "BMW X5 E53 — vedere frontală, referință suspensie",
  },
] as const;

/** 3/4 ride height: strat 1 = șasiu fără roți (travel bump+/droop−), strat 2 = roți fixe deasupra. */
function X5ThreeQuarterLayeredVisual({
  imgMax,
  travelMm,
  rideHeightVisActive,
}: {
  imgMax: string;
  travelMm: number;
  rideHeightVisActive: boolean;
}) {
  const stackRef = useRef<HTMLDivElement | null>(null);
  const [stackH, setStackH] = useState(0);
  const rideDeltaMm = travelMm - CHASSIS_VIS_NEUTRAL_TRAVEL_MM;
  const bumpTravelMm = rideHeightVisActive ? travelMm : CHASSIS_VIS_NEUTRAL_TRAVEL_MM;
  const visTravelMm = bumpTravelMm - CHASSIS_VIS_NEUTRAL_TRAVEL_MM;
  const hForBody = Math.max(stackH, 1);
  const bodyTranslateY = -(visTravelMm / 50) * hForBody * CHASSIS_BUMP_VIS_FRAC_PER_50MM;

  useLayoutEffect(() => {
    const el = stackRef.current;
    if (!el) return;
    const sync = () => {
      const h = el.getBoundingClientRect().height;
      if (h > 0) setStackH(h);
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const layerFit = `h-full w-full object-contain object-center ${imgMax}`;

  return (
    <div
      className="relative flex min-h-[72px] min-w-0 flex-1 items-center justify-center overflow-visible"
      aria-label="BMW X5 E53 3/4 — ride height"
    >
      <div
        ref={stackRef}
        className={`relative w-full max-w-3xl ${imgMax}`}
        style={{ aspectRatio: "1024 / 682" }}
      >
        <img
          src={bmwX5E53ThreeQuarter}
          alt="BMW X5 E53 — vedere 3/4 față, șasiu ride height"
          className={`absolute inset-0 z-0 block ${layerFit}`}
          style={{
            transform: `translateY(${bodyTranslateY}px)`,
            transformOrigin: "50% 62%",
            willChange: rideHeightVisActive ? "transform" : undefined,
          }}
          decoding="async"
        />
        <img
          src={bmwX5E53WheelsThreeQuarter}
          alt=""
          className={`pointer-events-none absolute inset-0 z-[1] block ${layerFit}`}
          decoding="async"
          aria-hidden
        />
      </div>
      {rideHeightVisActive ? (
        <div className="pointer-events-none absolute left-2 top-2 rounded border border-white/10 bg-black/55 px-2 py-1 text-[8px] text-neutral-400 backdrop-blur-sm">
          <span className="font-semibold text-cyan-400/90">Ride height</span>
          <span className="ml-1.5 font-mono text-cyan-100">{formatE46RideHeightDeltaMm(rideDeltaMm)}</span>
          <span className="ml-1.5 text-neutral-500">
            · travel {travelMm.toFixed(1)} mm
          </span>
        </div>
      ) : null}
    </div>
  );
}

type RefAlignmentFocusMode = "ride-height" | "front-camber" | "caster" | "toe";

const REF_ALIGNMENT_VIS_BY_MODE = {
  "ride-height": {
    refTravelVisBump: true,
    refTravelVisCamber: false,
    refTravelVisCaster: false,
    refTravelVisToe: false,
  },
  "front-camber": {
    refTravelVisBump: false,
    refTravelVisCamber: true,
    refTravelVisCaster: false,
    refTravelVisToe: false,
  },
  caster: {
    refTravelVisBump: false,
    refTravelVisCamber: false,
    refTravelVisCaster: true,
    refTravelVisToe: false,
  },
  toe: {
    refTravelVisBump: false,
    refTravelVisCamber: false,
    refTravelVisCaster: false,
    refTravelVisToe: true,
  },
} as const;

function BmwX5E53ReferenceCarousel({
  slideIndex,
  onSlideIndexChange,
  travelMm,
  rideHeightVisActive,
}: {
  slideIndex: number;
  onSlideIndexChange: (index: number) => void;
  travelMm: number;
  rideHeightVisActive: boolean;
}) {
  const slideCount = X5_REFERENCE_CAROUSEL_SLIDES.length;
  const activeSlide = X5_REFERENCE_CAROUSEL_SLIDES[slideIndex]!;

  const goPrev = useCallback(() => {
    onSlideIndexChange((slideIndex - 1 + slideCount) % slideCount);
  }, [slideCount, slideIndex, onSlideIndexChange]);
  const goNext = useCallback(() => {
    onSlideIndexChange((slideIndex + 1) % slideCount);
  }, [slideCount, slideIndex, onSlideIndexChange]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goPrev, goNext]);

  const imgMax = "max-h-[min(58vh,480px)]";

  return (
    <div
      className="mx-auto flex h-full min-h-0 w-full max-w-4xl flex-col gap-1"
      aria-roledescription="carousel"
      aria-label="Referință BMW X5 E53 — carusel"
    >
      <div className="flex shrink-0 items-center gap-2 border-b border-white/10 px-1 py-1.5">
        <button
          type="button"
          onClick={goPrev}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-white/15 bg-black/40 text-lg leading-none text-cyan-200/90 transition hover:border-cyan-500/40 hover:bg-cyan-500/10"
          aria-label="Imaginea anterioară"
        >
          ‹
        </button>
        <div className="min-w-0 flex-1 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-cyan-400/90">
            {activeSlide.title}
          </p>
          <p className="text-[9px] font-medium text-neutral-500">{activeSlide.subtitle}</p>
        </div>
        <span className="shrink-0 font-mono text-[10px] tabular-nums text-neutral-500">
          {slideIndex + 1}/{slideCount}
        </span>
        <button
          type="button"
          onClick={goNext}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-white/15 bg-black/40 text-lg leading-none text-cyan-200/90 transition hover:border-cyan-500/40 hover:bg-cyan-500/10"
          aria-label="Imaginea următoare"
        >
          ›
        </button>
      </div>
      <div className="flex shrink-0 justify-center gap-1.5 py-0.5" role="tablist" aria-label="Slide-uri X5 E53">
        {X5_REFERENCE_CAROUSEL_SLIDES.map((slide, i) => (
          <button
            key={slide.key}
            type="button"
            role="tab"
            aria-selected={i === slideIndex}
            aria-label={slide.title}
            onClick={() => onSlideIndexChange(i)}
            className={[
              "h-1.5 rounded-full transition-all",
              i === slideIndex ? "w-5 bg-cyan-400/90" : "w-1.5 bg-white/25 hover:bg-white/40",
            ].join(" ")}
          />
        ))}
      </div>
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <div className="flex h-full w-full items-center justify-center overflow-visible px-2 py-2">
          {activeSlide.key === "three-quarter" ? (
            <X5ThreeQuarterLayeredVisual
              imgMax={imgMax}
              travelMm={travelMm}
              rideHeightVisActive={rideHeightVisActive}
            />
          ) : (
            <img
              key={activeSlide.key}
              src={activeSlide.src}
              alt={activeSlide.alt}
              className={`w-full max-w-3xl object-contain object-center transition-opacity duration-200 ${imgMax}`}
              decoding="async"
            />
          )}
        </div>
      </div>
    </div>
  );
}

const E46_REFERENCE_CAROUSEL_SLIDES = [
  { key: "overview", title: "E46 M3 · blueprint", subtitle: "Wireframe coupe · referință caroserie" },
  { key: "silhouette", title: "Camber 3D · siluetă", subtitle: "Clone L/R + caroserie" },
  { key: "ride-height", title: "Ride height", subtitle: "Bump+ / droop− · suspensie fixă" },
  { key: "camber-lr", title: "Caster față", subtitle: "Pivot jos→sus vs verticală · galben OEM / mov offset" },
  { key: "toe-plan", title: "Toe · plan", subtitle: "Stand aliniere · convergență / divergență" },
] as const;

function BmwE46FrontReferenceCarousel() {
  const camberDeg = useSuspensionStore((s) => s.getAnalysisForAxle("front").camberDeg);
  const travelMm = useSuspensionStore((s) => s.travelMm);
  const refTravelVisBump = useSuspensionStore((s) => s.refTravelVisBump);
  const refTravelVisCamber = useSuspensionStore((s) => s.refTravelVisCamber);
  const refTravelVisCaster = useSuspensionStore((s) => s.refTravelVisCaster);
  const refTravelVisToe = useSuspensionStore((s) => s.refTravelVisToe);
  const camberRefGuideTravelDeg = useSuspensionStore((s) => s.camberRefGuideTravelDeg);
  const casterRefGuideTravelDeg = useSuspensionStore((s) => s.casterRefGuideTravelDeg);
  const toeRefGuideTravelMin = useSuspensionStore((s) => s.toeRefGuideTravelMin);
  const engineeringDebug = useSuspensionAssistantStore((s) => s.engineeringDebugMode);
  const slideIndex = useSuspensionStore((s) => s.e46RefCarouselSlide);
  const setSlideIndex = useSuspensionStore((s) => s.setE46RefCarouselSlide);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const [stripH, setStripH] = useState(0);
  const slideCount = E46_REFERENCE_CAROUSEL_SLIDES.length;
  const activeSlide = E46_REFERENCE_CAROUSEL_SLIDES[slideIndex]!;

  const goPrev = useCallback(() => {
    setSlideIndex((slideIndex - 1 + slideCount) % slideCount);
  }, [slideCount, slideIndex, setSlideIndex]);
  const goNext = useCallback(() => {
    setSlideIndex((slideIndex + 1) % slideCount);
  }, [slideCount, slideIndex, setSlideIndex]);

  useLayoutEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;
    const ro = new ResizeObserver((entries) => {
      const h = entries[0]?.contentRect.height ?? 0;
      if (h > 0) setStripH(h);
    });
    ro.observe(shell);
    setStripH(shell.getBoundingClientRect().height);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goPrev, goNext]);

  const hForChassis = Math.max(stripH, 1);
  const bumpTravelMm = refTravelVisBump ? travelMm : CHASSIS_VIS_NEUTRAL_TRAVEL_MM;
  const visTravelMm = bumpTravelMm - CHASSIS_VIS_NEUTRAL_TRAVEL_MM;
  const chassisTranslatePx =
    -(visTravelMm / 50) * hForChassis * CHASSIS_BUMP_VIS_FRAC_PER_50MM;
  const stripCamberRefDeg = refTravelVisCamber ? camberRefGuideTravelDeg : 0;
  const stripCasterRefDeg = refTravelVisCaster ? casterRefGuideTravelDeg : 0;
  const stripToeRefMin = refTravelVisToe ? toeRefGuideTravelMin : 0;
  const refCasterDeg = refTravelVisCaster ? casterRefGuideTravelDeg : 0;

  const stripImgMax = "max-h-[min(22vh,200px)]";
  const stripCamberCloneImgMax = "max-h-[min(11vh,100px)]";
  const stripCamberCloneEnlargedImgMax = "max-h-[min(13.2vh,120px)]";
  const carouselCamberImgMax = "max-h-[min(32vh,280px)]";

  return (
    <div
      className="mx-auto flex h-full min-h-0 w-full max-w-6xl flex-col gap-1 px-0.5"
      aria-roledescription="carousel"
      aria-label="Referință BMW E46 — carusel"
    >

      <div className="flex shrink-0 items-center gap-2 border-b border-white/10 px-1 py-1.5">
        <button
          type="button"
          onClick={goPrev}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-white/15 bg-black/40 text-lg leading-none text-cyan-200/90 transition hover:border-cyan-500/40 hover:bg-cyan-500/10"
          aria-label="Reprezentarea anterioară"
        >
          ‹
        </button>
        <div className="min-w-0 flex-1 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-cyan-400/90">
            {activeSlide.title}
          </p>
          <p className="text-[9px] font-medium text-neutral-500">{activeSlide.subtitle}</p>
        </div>
        <span className="shrink-0 font-mono text-[10px] tabular-nums text-neutral-500">
          {slideIndex + 1}/{slideCount}
        </span>
        <button
          type="button"
          onClick={goNext}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-white/15 bg-black/40 text-lg leading-none text-cyan-200/90 transition hover:border-cyan-500/40 hover:bg-cyan-500/10"
          aria-label="Reprezentarea următoare"
        >
          ›
        </button>
      </div>
      <div className="flex shrink-0 justify-center gap-1.5 py-0.5" role="tablist" aria-label="Slide-uri referință">
        {E46_REFERENCE_CAROUSEL_SLIDES.map((slide, i) => (
          <button
            key={slide.key}
            type="button"
            role="tab"
            aria-selected={i === slideIndex}
            aria-label={slide.title}
            onClick={() => setSlideIndex(i)}
            className={[
              "h-1.5 rounded-full transition-all",
              i === slideIndex ? "w-5 bg-cyan-400/90" : "w-1.5 bg-white/25 hover:bg-white/40",
            ].join(" ")}
          />
        ))}
      </div>
      <div ref={shellRef} className="relative min-h-0 flex-1 overflow-hidden">
        <div
          className="flex h-full transition-transform duration-300 ease-out"
          style={{ transform: `translateX(-${slideIndex * 100}%)` }}
        >
          <div className="flex h-full min-w-full shrink-0 flex-col px-0.5">
            <E46StripInnerPanel title="E46 M3 coupe" subtitle="Blueprint wireframe" showHeader={false}>
              <img
                src={bmwE46M3CoupeBlueprint}
                alt="BMW E46 M3 coupe — blueprint wireframe (referință caroserie)"
                className={`mx-auto block h-auto w-full max-w-full object-contain object-center ${carouselCamberImgMax}`}
                decoding="async"
              />
            </E46StripInnerPanel>
          </div>
          <div className="flex h-full min-w-full shrink-0 flex-col px-0.5">
            <E46StripInnerPanel title="Stânga" subtitle="Camber 3D · siluetă" showHeader={false}>
              <E46FrontLayeredReferenceCell
                stripImgMax={stripImgMax}
                chassisTranslatePx={0}
                showSuspensionLayer={false}
                camberRefGuideTravelDeg={stripCamberRefDeg}
                casterRefGuideTravelDeg={stripCasterRefDeg}
                toeRefGuideTravelMin={stripToeRefMin}
                camberCloneImgMax={stripCamberCloneImgMax}
                camberCloneLeftImgMax={stripCamberCloneEnlargedImgMax}
                camberCloneRightImgMax={stripCamberCloneEnlargedImgMax}
                bodySilhouetteScale={1.8}
              />
            </E46StripInnerPanel>
          </div>
          <div className="flex h-full min-w-full shrink-0 flex-col px-0.5">
            <E46StripInnerPanel
              title="Ride height"
              subtitle="Bump+ / droop− · suspensie fixă"
              showHeader={false}
              panelOverflowVisible
              contentClassName="overflow-visible"
            >
              <E46RideHeightReferenceCell
                stripImgMax={stripImgMax}
                chassisTranslatePx={chassisTranslatePx}
                travelMm={travelMm}
                rideHeightVisActive={refTravelVisBump}
              />
            </E46StripInnerPanel>
          </div>
          <div className="flex h-full min-w-full shrink-0 flex-col px-0.5">
            <E46StripInnerPanel title="Caster față" subtitle="Șasiu + roți față/spate · profil lateral" showHeader={false}>
              <E46CasterSideReferenceCell
                casterRefGuideTravelDeg={refCasterDeg}
                casterVisActive={refTravelVisCaster}
                imgMaxClassName={carouselCamberImgMax}
              />
            </E46StripInnerPanel>
          </div>
          <div className="flex h-full min-w-full shrink-0 flex-col px-0.5">
            <E46StripInnerPanel title="Toe față" subtitle="Stand · vedere de sus" showHeader={false}>
              <E46ToePlanReferenceCell
                toeRefGuideTravelMin={toeRefGuideTravelMin}
                toeVisActive={refTravelVisToe}
                imgMaxClassName={carouselCamberImgMax}
              />
            </E46StripInnerPanel>
          </div>
        </div>
      </div>
      {engineeringDebug ? (
        <div className="flex w-full justify-center pt-1">
          <FrontCamberPlanGauge camberDeg={camberDeg} />
        </div>
      ) : null}
    </div>
  );

}

export function CenterViewport() {
  const garageCars = useGarageCars();
  const travelMm = useSuspensionStore((s) => s.travelMm);
  const setTravel = useSuspensionStore((s) => s.setTravelMm);
  const camberRefGuideTravelDeg = useSuspensionStore((s) => s.camberRefGuideTravelDeg);
  const setCamberRefGuideTravelDeg = useSuspensionStore((s) => s.setCamberRefGuideTravelDeg);
  const casterRefGuideTravelDeg = useSuspensionStore((s) => s.casterRefGuideTravelDeg);
  const setCasterRefGuideTravelDeg = useSuspensionStore((s) => s.setCasterRefGuideTravelDeg);
  const toeRefGuideTravelMin = useSuspensionStore((s) => s.toeRefGuideTravelMin);
  const setToeRefGuideTravelMin = useSuspensionStore((s) => s.setToeRefGuideTravelMin);
  const refTravelVisBump = useSuspensionStore((s) => s.refTravelVisBump);
  const refTravelVisCamber = useSuspensionStore((s) => s.refTravelVisCamber);
  const refTravelVisCaster = useSuspensionStore((s) => s.refTravelVisCaster);
  const refTravelVisToe = useSuspensionStore((s) => s.refTravelVisToe);
  const setRefTravelVisBump = useSuspensionStore((s) => s.setRefTravelVisBump);
  const setRefTravelVisCamber = useSuspensionStore((s) => s.setRefTravelVisCamber);
  const setRefTravelVisCaster = useSuspensionStore((s) => s.setRefTravelVisCaster);
  const setRefTravelVisToe = useSuspensionStore((s) => s.setRefTravelVisToe);
  const focusE46RefRepresentation = useSuspensionStore((s) => s.focusE46RefRepresentation);
  const workflow = useSuspensionStore((s) => s.workflow);
  const vehicleId = useSuspensionStore((s) => s.vehicleId);
  const garageCarIndex = useSuspensionStore((s) => s.garageCarIndex);
  const axle = useSuspensionStore((s) => s.axle);

  const sim = workflow === "simulate";
  const vLabel = getVehicle(vehicleId).label;
  const linkedGarageCar =
    garageCarIndex !== null &&
    garageCarIndex >= 0 &&
    garageCarIndex < garageCars.length
      ? garageCars[garageCarIndex]!
      : null;
  const garageInfersE46 = linkedGarageCar != null && guessVehicleTemplateId(linkedGarageCar) === "bmw-e46";
  const showX5E53GenericVisual = linkedGarageCar != null && isBmwX5E53GarageCar(linkedGarageCar);
  /** Photo / reference strip pack: preset E46 or linked garage row we map to E46 (no second «confirm» in dropdown). */
  const showE46ReferenceVisuals =
    !showX5E53GenericVisual && (vehicleId === "bmw-e46" || garageInfersE46);
  const showE46FrontRefPanels = showE46ReferenceVisuals && axle === "front";
  const showX5FrontRefPanels = showX5E53GenericVisual && axle === "front";
  /** Ride height + camber / caster / toe — aceleași controale, poze diferite (E46 vs X5). */
  const showRefAlignmentFooter = showE46FrontRefPanels || showX5FrontRefPanels;
  const [x5RefCarouselSlide, setX5RefCarouselSlide] = useState(0);

  useEffect(() => {
    if (!showX5FrontRefPanels || !refTravelVisBump) return;
    setX5RefCarouselSlide(1);
  }, [showX5FrontRefPanels, refTravelVisBump]);

  const focusRefRepresentation = useCallback(
    (mode: RefAlignmentFocusMode) => {
      if (showE46FrontRefPanels) {
        focusE46RefRepresentation(mode);
        return;
      }
      if (!showX5FrontRefPanels) return;
      const slideByMode: Record<RefAlignmentFocusMode, number> = {
        "ride-height": 1,
        "front-camber": 0,
        caster: 0,
        toe: 2,
      };
      setX5RefCarouselSlide(slideByMode[mode]);
      const vis = REF_ALIGNMENT_VIS_BY_MODE[mode];
      setRefTravelVisBump(vis.refTravelVisBump);
      setRefTravelVisCamber(vis.refTravelVisCamber);
      setRefTravelVisCaster(vis.refTravelVisCaster);
      setRefTravelVisToe(vis.refTravelVisToe);
    },
    [
      showE46FrontRefPanels,
      showX5FrontRefPanels,
      focusE46RefRepresentation,
      setRefTravelVisBump,
      setRefTravelVisCamber,
      setRefTravelVisCaster,
      setRefTravelVisToe,
    ],
  );

  const garageSubtitle = linkedGarageCar
    ? `Garaj: ${formatSavedCarLabel(linkedGarageCar, garageCarIndex!)}`
    : null;

  const leftStripActiveModule = useSuspensionAssistantStore((s) => s.leftStripActiveModule);
  const antiRollBarRubrikActive = useSuspensionAssistantStore((s) => s.antiRollBarRubrikActive);

  return (
    <div
      id="sd-viewport-simulation"
      className={[
        "relative flex min-h-0 min-w-0 flex-1 flex-col bg-[#070a10]",
        leftStripActiveModule === "suspension" ? "shadow-[inset_0_0_0_2px_rgba(34,211,238,0.28)]" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <header className="flex items-center justify-between border-b border-white/10 px-4 py-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-400/80">
            Simulation
          </p>
          <h1 className="text-sm font-semibold text-white">
            {workflow === "design" && "Geometry & layout"}
            {workflow === "simulate" && "Ride & bump travel"}
            {workflow === "analyze" && "Live readouts & curves"}
            {workflow === "optimize" && "Iteration targets"}
            {workflow === "save" && "Session & export"}
          </h1>
        </div>
        <span
          className="max-w-[min(440px,55vw)] rounded border border-white/10 bg-black/40 px-2 py-1 text-right font-mono text-[11px] text-cyan-200/90 leading-snug"
          title={garageSubtitle ?? undefined}
        >
          {vLabel} · {axle}
          {garageSubtitle ? (
            <>
              <span className="text-neutral-500"> · </span>
              <span className="text-neutral-400">{garageSubtitle}</span>
            </>
          ) : null}
          <span className="text-neutral-500"> · side</span>
        </span>
      </header>

      <div className="relative flex min-h-0 flex-1 flex-col basis-0 gap-2 p-2" style={{ minHeight: 0 }}>
        {antiRollBarRubrikActive ? (
          <section
            className="relative flex min-h-0 flex-1 flex-col items-stretch justify-center overflow-auto rounded-lg border border-violet-500/30 bg-[#06080c] p-3 sm:items-center sm:justify-center"
            aria-label="Referință bară stabilizatoare — roll în viraj"
          >
            <div className="mb-2 shrink-0 border-b border-white/10 pb-2 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-400/85">
                Anti-roll bar · referință
              </p>
              <p className="mt-1 text-[9px] leading-snug text-neutral-500">
                Roll în viraj — segmentul φ arată unghiul schematic al șasiului față de asfalt; barele
                stabilizatoare îl reduc (valoarea se actualizează cu setările față/spate).
              </p>
            </div>
            <div className="flex min-h-0 flex-1 items-center justify-center">
              <AntiRollBarReferenceVisual />
            </div>
          </section>
        ) : showE46ReferenceVisuals && axle === "front" ? (
          <>
            <section
              className="flex min-h-0 flex-[2] flex-col overflow-x-visible overflow-y-hidden rounded-lg border border-violet-500/30 bg-[#0d1117] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
              aria-label="Referință BMW E46 — carusel"
            >
              <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 px-3 py-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-400/85">
                  Referință BMW E46
                </p>
                <span className="text-[10px] font-medium text-neutral-400">Carusel · 5 vederi</span>
              </div>
              <div className="flex min-h-0 flex-1 flex-col overflow-x-visible overflow-y-hidden px-2 py-2">
                <BmwE46FrontReferenceCarousel />
              </div>
            </section>
          </>
        ) : showE46ReferenceVisuals ? (
          <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-violet-500/30 bg-[#0d1117]">
            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 px-3 py-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-400/85">
                Referință BMW E46
              </p>
              <span className="text-[10px] font-medium text-neutral-400">Suspensie spate</span>
            </div>
            <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden px-3 py-2">
              <img
                src={bmwE46RearRef}
                alt="Schemă suspensie spate BMW E46 (multi-link)"
                className="max-h-full w-full max-w-3xl object-contain object-center"
                decoding="async"
              />
            </div>
          </section>
        ) : showX5E53GenericVisual ? (
          <section
            className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-violet-500/30 bg-[#0d1117] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
            aria-label="Referință generică BMW X5 E53"
          >
            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 px-3 py-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-400/85">
                BMW X5 (E53) · referință generică
              </p>
              <span className="text-[10px] font-medium text-neutral-400">
                Carusel · {X5_REFERENCE_CAROUSEL_SLIDES.length} vederi · {vLabel}
              </span>
            </div>
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-2 py-2">
              <BmwX5E53ReferenceCarousel
                slideIndex={x5RefCarouselSlide}
                onSlideIndexChange={setX5RefCarouselSlide}
                travelMm={travelMm}
                rideHeightVisActive={refTravelVisBump}
              />
            </div>
          </section>
        ) : (
        <div className="relative flex min-h-0 flex-1 flex-col" style={{ minHeight: 0 }}>
          {workflow === "optimize" && (
            <div className="absolute left-3 top-3 z-10 max-w-md rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-100/95 backdrop-blur-sm">
              <strong className="font-semibold">Optimize</strong> — future targets for camber gain; roll
              center is <span className="font-medium">not computed</span> in this build. Solver / GA later.
            </div>
          )}
          {workflow === "save" && (
            <div className="absolute left-3 top-3 z-10 max-w-md rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100/95 backdrop-blur-sm">
              Use <span className="font-medium">Export</span> in the sidebar or finalize naming for cloud
              saves.
            </div>
          )}
          <div
            className="relative flex min-h-0 flex-1 flex-col items-stretch justify-center overflow-auto rounded-lg border border-violet-500/30 bg-[#06080c] p-3 sm:items-center sm:justify-center"
            style={{ minHeight: 0 }}
          >
            <div className="max-w-md space-y-2 px-2 text-center text-[10px] leading-relaxed text-neutral-500">
              <p>
                Selectează șablonul <span className="font-medium text-neutral-300">BMW E46</span> (sau o mașină
                E46 din garaj) și axa față pentru cele două chenare de referință foto.
              </p>
              <p className="text-neutral-600">
                Geometria 2D folosește acum{" "}
                <span className="font-medium text-neutral-300">{getVehicle(vehicleId).label}</span>.
              </p>
            </div>
          </div>
        </div>
        )}
      </div>

      <div
        className={`${VIEWPORT_TRAVEL_FOOTER_SHELL} ${
          sim ? "shadow-[0_0_0_1px_rgba(34,211,238,0.25)]" : ""
        }`}
      >
        <div className={VIEWPORT_TRAVEL_FOOTER_STACK}>
          <E46RefGuideTravelBar
            label="Travel (bump + / droop −)"
            value={travelMm}
            min={-50}
            max={50}
            step={0.5}
            formatValue={(v) => `${v.toFixed(1)} mm`}
            minLabel="−50 mm"
            maxLabel="+50 mm"
            title="Model 2D: bump+ / droop− (același travelMm). Chenar 1: la +50 mm caroseria e ne-translatată (0 vizual); sub +50 coboară, peste +50 urcă."
            onChange={setTravel}
            refVisActive={showRefAlignmentFooter ? refTravelVisBump : undefined}
            onRefVisActiveChange={showRefAlignmentFooter ? setRefTravelVisBump : undefined}
            onRefRepresentFocus={
              showRefAlignmentFooter ? () => focusRefRepresentation("ride-height") : undefined
            }
            refVisButtonLabel="Ride height"
            refVisButtonUppercase={false}
            refVisTitle="Ride height: slide carusel + siluetă față de suspensie fixă (bump+ / droop−)."
          />
        {showRefAlignmentFooter ? (
          <>
            <E46RefGuideTravelBar
              label="Travel ghid camber (referință foto)"
              value={camberRefGuideTravelDeg}
              min={-25}
              max={25}
              step={0.1}
              formatValue={(v) => `${v >= 0 ? "+" : ""}${v.toFixed(1)}°`}
              minLabel="−25° (spre centru)"
              maxLabel="+25°"
              title="Rotație camber pe pozele de referință. Negativ: capătul superior al ghidului spre interior."
              onChange={setCamberRefGuideTravelDeg}
              refVisActive={refTravelVisCamber}
              onRefVisActiveChange={setRefTravelVisCamber}
              onRefRepresentFocus={() => focusRefRepresentation("front-camber")}
              refVisButtonLabel="Front camber"
              refVisButtonUppercase={false}
              refVisTitle={
                showX5FrontRefPanels
                  ? "Front camber: profil lateral X5 — setare standard (overlay E46 la preset E46)."
                  : "Front camber: siluetă + clone L/R — rotație camber pe referințele foto."
              }
            />
            <E46RefGuideTravelBar
              label="Travel caster (referință foto)"
              value={casterRefGuideTravelDeg}
              min={-5}
              max={5}
              step={0.1}
              formatValue={(v) => `${v >= 0 ? "+" : ""}${v.toFixed(1)}°`}
              minLabel="−5° →"
              maxLabel="+5° ←"
              title="Offset față de axa neutră (galben): +° = segment mov spre stânga, −° = spre dreapta."
              onChange={setCasterRefGuideTravelDeg}
              refVisActive={refTravelVisCaster}
              onRefVisActiveChange={setRefTravelVisCaster}
              onRefRepresentFocus={() => focusRefRepresentation("caster")}
              refVisButtonLabel="Caster"
              refVisButtonUppercase={false}
              refVisTitle={
                showX5FrontRefPanels
                  ? "Caster: profil lateral X5 — setare standard."
                  : "Caster: galben punctat = neutru · mov: +° spre stânga, −° spre dreapta față de neutru."
              }
            />
            <E46RefGuideTravelBar
              label="Travel toe total (referință foto)"
              value={toeRefGuideTravelMin}
              min={-20}
              max={20}
              step={0.5}
              formatValue={(v) => `${v >= 0 ? "+" : ""}${v.toFixed(1)}′`}
              minLabel="−20′ convergență"
              maxLabel="+20′ divergență"
              title="′ negativ = convergență (toe-in), pozitiv = divergență (toe-out). Foto: rotateY; mov: diagramă plan."
              onChange={setToeRefGuideTravelMin}
              refVisActive={refTravelVisToe}
              onRefVisActiveChange={setRefTravelVisToe}
              onRefRepresentFocus={() => focusRefRepresentation("toe")}
              refVisButtonLabel="Toe"
              refVisButtonUppercase={false}
              refVisTitle={
                showX5FrontRefPanels
                  ? "Toe: vedere frontală X5 — convergență / divergență totală față."
                  : "Toe: stand aliniere vedere de sus — convergență / divergență totală față."
              }
            />
          </>
        ) : null}
        </div>
      </div>
    </div>
  );
}
