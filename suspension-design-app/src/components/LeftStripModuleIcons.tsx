import type { CSSProperties, ReactNode } from "react";
import type { LeftStripModuleId } from "../lib/leftStripModule";
import { LEFT_STRIP_NAV_CHIP_CLASS, LEFT_STRIP_NAV_CHIP_LABEL_CLASS } from "./leftStripNavChipClass";
import aeroDynamicsSidebarIcon from "../../../assets/aero-dynamics-sidebar-icon.png";
import anvelopeSidebarIcon from "../../../assets/anvelope-sidebar-icon.png";
import antrenarePunteCategoryIcon from "../../../assets/antrenare-punte-icon-alpha.png";
import suspensieCategoryIcon from "../../../assets/suspensie-icon-alpha.png";

/** Aceeași dimensiune ca `VehicleSilhouetteIcon` din butonul Vehicul. */
const moduleIconBoxClass = "h-16 w-16 shrink-0 sm:h-[4.5rem] sm:w-[4.5rem]";

const glyphClass = `${moduleIconBoxClass} text-neutral-400 transition group-hover:text-cyan-200/90`;

const categoryImgClass = `${moduleIconBoxClass} object-contain opacity-85 transition group-hover:opacity-100 group-hover:drop-shadow-[0_0_8px_rgba(34,211,238,0.25)]`;

/** Alb din PNG → gradient temă; umbră subtilă pe siluetă. */
function tireThemedMaskStyle(url: string): CSSProperties {
  return {
    WebkitMaskImage: `url(${url})`,
    WebkitMaskSize: "contain",
    WebkitMaskRepeat: "no-repeat",
    WebkitMaskPosition: "center",
    maskImage: `url(${url})`,
    maskSize: "contain",
    maskRepeat: "no-repeat",
    maskPosition: "center",
    maskMode: "luminance",
    filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.42)) drop-shadow(0 0 14px rgba(34,211,238,0.22))",
  };
}

/** Aceeași imagine ca pe `categorii/suspensie.html` (categoria Suspensie). */
function IconSuspension() {
  return (
    <img
      src={suspensieCategoryIcon}
      alt=""
      width={200}
      height={200}
      draggable={false}
      decoding="async"
      className={categoryImgClass}
      aria-hidden
    />
  );
}

/** Aceeași imagine ca pe `categorii/antrenare-punte.html` (categoria Antrenare punte). */
function IconDrivetrain() {
  return (
    <img
      src={antrenarePunteCategoryIcon}
      alt=""
      width={200}
      height={200}
      draggable={false}
      decoding="async"
      className={categoryImgClass}
      aria-hidden
    />
  );
}

/** Anvelope: zone albe → gradient cyan/sky (mască luminanță) + umbră subtilă. */
function IconTire() {
  return (
    <span
      className={`relative isolate overflow-hidden rounded-sm opacity-85 transition group-hover:opacity-100 ${moduleIconBoxClass}`}
      data-sidebar-module="tires"
      aria-hidden
    >
      <span
        className="absolute inset-0 origin-center bg-gradient-to-br from-sky-400 via-cyan-400 to-sky-600 transition group-hover:from-sky-300 group-hover:via-cyan-300 group-hover:to-sky-500"
        style={tireThemedMaskStyle(anvelopeSidebarIcon)}
      />
    </span>
  );
}

/** Mașină + flux aer — aceeași celulă ca pictograma vehicul. */
function IconAero() {
  return (
    <span
      className={`relative isolate overflow-hidden rounded-sm opacity-85 transition group-hover:opacity-100 group-hover:drop-shadow-[0_0_8px_rgba(34,211,238,0.25)] ${moduleIconBoxClass}`}
      data-sidebar-module="aero"
      aria-hidden
    >
      <img
        src={aeroDynamicsSidebarIcon}
        alt=""
        width={1024}
        height={682}
        draggable={false}
        decoding="async"
        className="absolute inset-0 h-full w-full object-contain"
      />
    </span>
  );
}

function IconAnalysis() {
  return (
    <svg
      className={glyphClass}
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.15"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M6 25h20M6 25V8" />
      <path d="M9 21l4-6 4 3 5-9 5 5" />
      <path d="M25 12.5l2.5 2.5-3 1" />
    </svg>
  );
}

export const LEFT_STRIP_MODULES: { id: LeftStripModuleId; label: string; icon: ReactNode }[] = [
  { id: "suspension", label: "Suspensie", icon: <IconSuspension /> },
  { id: "drivetrain", label: "Drivetrain", icon: <IconDrivetrain /> },
  { id: "tires", label: "Anvelope", icon: <IconTire /> },
  { id: "aero", label: "Aero", icon: <IconAero /> },
  { id: "analysis", label: "Analiză", icon: <IconAnalysis /> },
];

type LeftStripModuleIconsProps = {
  onModulePress?: (id: LeftStripModuleId) => void;
  /** Evidențiere pentru ultimul modul selectat (scroll către panoul potrivit). */
  activeModule?: LeftStripModuleId | null;
  /** Fereastra „Anvelope” e deschisă — evidențiere buton fără `leftStripActiveModule === "tires"`. */
  tiresModalOpen?: boolean;
  /** Fereastra „Drivetrain” e deschisă. */
  drivetrainModalOpen?: boolean;
  /** Fereastra „Suspensie” (workshop) e deschisă. */
  suspensionWorkshopModalOpen?: boolean;
};

/**
 * Coloană de pictograme outline (referință: nav verticală modul), sub controlul vehicul.
 */
export function LeftStripModuleIcons({
  onModulePress,
  activeModule,
  tiresModalOpen = false,
  drivetrainModalOpen = false,
  suspensionWorkshopModalOpen = false,
}: LeftStripModuleIconsProps) {
  return (
    <nav className="flex shrink-0 flex-col items-center gap-2 border-t border-white/[0.06] px-0.5 pb-1 pt-2.5" aria-label="Module setup">
      {LEFT_STRIP_MODULES.map(({ id, label, icon }) => {
        const pressed =
          activeModule === id ||
          (id === "tires" && tiresModalOpen) ||
          (id === "drivetrain" && drivetrainModalOpen) ||
          (id === "suspension" && suspensionWorkshopModalOpen);
        return (
        <button
          key={id}
          type="button"
          className={[
            LEFT_STRIP_NAV_CHIP_CLASS,
            pressed ? "bg-cyan-950/25 ring-1 ring-cyan-400/35" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          onClick={() => onModulePress?.(id)}
          aria-label={label}
          aria-pressed={pressed}
          title={
            id === "suspension"
              ? `${label} — fereastră setup (OEM + hardware), cu salvare config`
              : id === "analysis"
                ? `${label} — panou dreapta (setup / sinteză)`
                : id === "tires"
                  ? `${label} — fereastră editabilă (aceleași câmpuri ca footer)`
                  : id === "drivetrain"
                    ? `${label} — fereastră editabilă (aceleași câmpuri ca footer)`
                    : `${label} — panou footer (jos)`
          }
        >
          {icon}
          <span className={LEFT_STRIP_NAV_CHIP_LABEL_CLASS}>{label}</span>
        </button>
      );
      })}
    </nav>
  );
}
