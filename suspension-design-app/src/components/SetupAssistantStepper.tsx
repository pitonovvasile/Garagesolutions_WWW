import garageSolutionsLogo from "../../../assets/garage-solutions-logo.png";
import type { AssistantStepId } from "../store/suspensionAssistantStore";
import { useSuspensionAssistantStore } from "../store/suspensionAssistantStore";
import { GarageCategoryDropdown } from "./GarageCategoryDropdown";
import { VehicleSilhouetteIcon } from "./VehicleSilhouetteIcon";

const STEPS: { id: AssistantStepId; label: string }[] = [
  { id: "car", label: "Vehicul" },
  { id: "goal", label: "Goal" },
  { id: "mode", label: "Preset / custom" },
  { id: "parts", label: "Parts" },
  { id: "validate", label: "Validate" },
  { id: "save", label: "Save / buy" },
];

/** Înălțime afișare logo (px) — constantă, NU depinde de înălțimea headerului / casetă / % din rând. */
const HEADER_LOGO_DISPLAY_PX = 120;

/** Înălțimea benzii colorate (workflow); separată de dimensiunea logo-ului. */
const HEADER_BAR_CLASS = "h-10 sm:h-11";

/** Padding deasupra benzii header (px) — pe wrapper cu fundal paginii (#06080c). */
const HEADER_TOP_PAD_PX = 10;

export function SetupAssistantStepper() {
  const step = useSuspensionAssistantStore((s) => s.step);
  const setStep = useSuspensionAssistantStore((s) => s.setStep);

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
          <span className="mr-2 shrink-0 text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-400/85">
            Setup workflow
          </span>
          {STEPS.map((s, i) => {
            const active = step === s.id;
            return (
              <div key={s.id} className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setStep(s.id)}
                  aria-label={s.id === "car" ? `Pasul ${i + 1}: date vehicul` : `Pasul ${i + 1}: ${s.label}`}
                  className={[
                    "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide transition",
                    s.id === "car" ? "inline-flex items-center gap-1.5 pr-2.5" : "",
                    active
                      ? "bg-cyan-500/20 text-cyan-100 ring-1 ring-cyan-400/35"
                      : "text-neutral-500 hover:bg-white/5 hover:text-neutral-300",
                  ].join(" ")}
                >
                  {s.id === "car" ? (
                    <>
                      <VehicleSilhouetteIcon className="h-5 w-5" dimmed={!active} />
                      <span>
                        {i + 1}. {s.label}
                      </span>
                    </>
                  ) : (
                    <>
                      {i + 1}. {s.label}
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
            <GarageCategoryDropdown activeId="suspension" />
          </div>
        </div>
      </header>
    </div>
  );
}
