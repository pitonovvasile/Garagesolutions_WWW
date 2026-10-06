import garageSolutionsLogo from "../../../assets/garage-solutions-logo.png";
import { GarageCategoryDropdown } from "./GarageCategoryDropdown";
import { VehicleSilhouetteIcon } from "./VehicleSilhouetteIcon";

const STEPS = [
  "Vehicul",
  "Motor",
  "ECU",
  "Evacuare",
  "Răcire",
  "Save / buy",
] as const;

const HEADER_LOGO_DISPLAY_PX = 120;
const HEADER_BAR_CLASS = "h-10 sm:h-11";
const HEADER_TOP_PAD_PX = 10;

export function PerformanceModuleStepper() {
  return (
    <div
      className="relative z-40 w-full shrink-0 bg-[#06080c]"
      style={{ paddingTop: HEADER_TOP_PAD_PX }}
    >
      <header
        className={`relative flex w-full items-stretch overflow-visible border-b border-white/10 bg-[#060910] ${HEADER_BAR_CLASS}`}
      >
        <a
          href="../index.html"
          className="relative flex h-full min-w-[10rem] shrink-0 items-stretch overflow-visible pl-2 pr-2 transition hover:bg-white/[0.04] sm:min-w-[11rem] sm:pl-3 sm:pr-3"
          aria-label="Garage Solutions — acasă"
        >
          <img
            src={garageSolutionsLogo}
            alt="Garage Solutions"
            width={333}
            height={222}
            decoding="async"
            draggable={false}
            className="pointer-events-none absolute left-2 top-1/2 w-auto max-w-none -translate-y-1/2 select-none object-contain object-left sm:left-3"
            style={{ height: HEADER_LOGO_DISPLAY_PX, width: "auto" }}
          />
        </a>
        <div className="relative z-40 flex min-h-0 min-w-0 flex-1 flex-wrap items-center justify-end gap-1 bg-[#060910] px-2 py-0.5 sm:px-4 sm:py-1">
          <span className="mr-2 shrink-0 text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-400/85">
            Performance workflow
          </span>
          {STEPS.map((label, i) => {
            const active = i === 0;
            return (
              <div key={label} className="flex items-center gap-1">
                <button
                  type="button"
                  disabled
                  aria-current={active ? "step" : undefined}
                  aria-label={`Pasul ${i + 1}: ${label}`}
                  className={[
                    "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide transition",
                    i === 0 ? "inline-flex items-center gap-1.5 pr-2.5" : "",
                    active
                      ? "bg-amber-500/20 text-amber-100 ring-1 ring-amber-400/35"
                      : "cursor-default text-neutral-500",
                  ].join(" ")}
                >
                  {i === 0 ? (
                    <>
                      <VehicleSilhouetteIcon className="h-5 w-5" dimmed={!active} />
                      <span>
                        {i + 1}. {label}
                      </span>
                    </>
                  ) : (
                    <>
                      {i + 1}. {label}
                    </>
                  )}
                </button>
                {i < STEPS.length - 1 ? (
                  <span className="hidden text-neutral-600 sm:inline" aria-hidden>
                    ·
                  </span>
                ) : null}
              </div>
            );
          })}
          <div className="ml-1 shrink-0 border-white/10 pl-2 sm:ml-2 sm:border-l">
            <GarageCategoryDropdown activeId="performance" />
          </div>
        </div>
      </header>
    </div>
  );
}
