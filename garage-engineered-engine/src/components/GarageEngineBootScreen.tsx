import { GarageEngineeredEngineLogo } from "./GarageEngineeredEngineLogo";

export function GarageEngineBootScreen({ active }: { active: boolean }) {
  return (
    <div
      className={[
        "fixed inset-0 z-[1000] grid place-items-center overflow-hidden bg-[#06080c] p-8 text-neutral-200 transition-opacity duration-500",
        active ? "opacity-100" : "pointer-events-none opacity-0",
      ].join(" ")}
      aria-busy={active ? "true" : "false"}
      aria-hidden={active ? undefined : "true"}
      aria-live="polite"
    >
      <span className="sr-only">Se încarcă Garage Solutions Engineered Engine.</span>
      <div
        className="origin-center animate-pulse"
        style={{
          transform: "scale(1.3)",
        }}
      >
        <GarageEngineeredEngineLogo variant="full" />
      </div>
    </div>
  );
}
