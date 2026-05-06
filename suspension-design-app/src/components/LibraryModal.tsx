import {
  DAMPERS,
  PLATES,
  SPRINGS,
  camberPlatesCompatible,
  useSuspensionStore,
} from "../store/suspensionStore";

export function LibraryModal() {
  const section = useSuspensionStore((s) => s.libraryOpen);
  const arch = useSuspensionStore((s) => s.getAxlePresetState().type);
  const springId = useSuspensionStore((s) => s.springId);
  const damperId = useSuspensionStore((s) => s.damperId);
  const plateId = useSuspensionStore((s) => s.plateId);
  const setSpring = useSuspensionStore((s) => s.setSpringId);
  const setDamper = useSuspensionStore((s) => s.setDamperId);
  const setPlate = useSuspensionStore((s) => s.setPlateId);
  const setLibraryOpen = useSuspensionStore((s) => s.setLibraryOpen);

  if (!section) return null;

  const plateOk = camberPlatesCompatible(arch);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Component library"
      onClick={() => setLibraryOpen(null)}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-hidden rounded-2xl border border-cyan-500/25 bg-[#0b0f14] shadow-glow"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <h2 className="text-sm font-semibold text-white">
            {section === "springs" && "Spring library"}
            {section === "dampers" && "Damper library"}
            {section === "plates" && "Camber plate library"}
          </h2>
          <button
            type="button"
            className="rounded-lg px-2 py-1 text-xs text-neutral-400 hover:bg-white/5 hover:text-white"
            onClick={() => setLibraryOpen(null)}
          >
            Close Esc
          </button>
        </header>
        <div className="max-h-[70vh] overflow-y-auto p-3">
          {section === "springs" && (
            <ul className="space-y-2">
              {SPRINGS.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSpring(s.id);
                      setLibraryOpen(null);
                    }}
                    className={[
                      "w-full rounded-xl border px-3 py-3 text-left transition",
                      springId === s.id
                        ? "border-cyan-400/45 bg-cyan-500/10"
                        : "border-white/10 bg-[#12181f] hover:border-white/20",
                    ].join(" ")}
                  >
                    <div className="flex justify-between gap-2">
                      <span className="font-medium text-white">
                        {s.vendor} · {s.name}
                      </span>
                      <span className="font-mono text-[11px] text-cyan-200">{s.rateNmm} N/mm</span>
                    </div>
                    <p className="mt-1 text-[11px] text-neutral-500">Stroke {s.strokeMm} mm</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {section === "dampers" && (
            <ul className="space-y-2">
              {DAMPERS.map((d) => (
                <li key={d.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setDamper(d.id);
                      setLibraryOpen(null);
                    }}
                    className={[
                      "w-full rounded-xl border px-3 py-3 text-left transition",
                      damperId === d.id
                        ? "border-cyan-400/45 bg-cyan-500/10"
                        : "border-white/10 bg-[#12181f] hover:border-white/20",
                    ].join(" ")}
                  >
                    <div className="flex justify-between gap-2">
                      <span className="font-medium text-white">
                        {d.vendor} · {d.name}
                      </span>
                      <span className="text-[11px] text-neutral-400">
                        {d.digressive ? "Digressive" : "Linear"}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-neutral-500">Stroke {d.strokeMm} mm</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {section === "plates" && (
            <>
              {!plateOk ? (
                <p className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
                  Camber plates apply to MacPherson strut and comparable layouts — not typical for double wishbone in this model.
                </p>
              ) : (
                <ul className="space-y-2">
                  {PLATES.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setPlate(p.id);
                          setLibraryOpen(null);
                        }}
                        className={[
                          "w-full rounded-xl border px-3 py-3 text-left transition",
                          plateId === p.id
                            ? "border-cyan-400/45 bg-cyan-500/10"
                            : "border-white/10 bg-[#12181f] hover:border-white/20",
                        ].join(" ")}
                      >
                        <div className="flex justify-between gap-2">
                          <span className="font-medium text-white">
                            {p.vendor} · {p.name}
                          </span>
                          <span className="font-mono text-[11px] text-cyan-200">±{p.rangeDeg}°</span>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
