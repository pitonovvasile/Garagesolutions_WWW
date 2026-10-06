/**
 * Stil comun butoane „chip” în coloana din stânga (Vehicul + pictograme module).
 * Păstrat într-un singur loc ca să rămână vizual identic.
 */
export const LEFT_STRIP_NAV_CHIP_CLASS = [
  "group mx-auto flex w-fit max-w-full shrink-0 flex-col items-center justify-center",
  "gap-[0.1rem] rounded-[0.4rem] border border-white/10 bg-transparent px-[0.2rem] py-[0.3rem]",
  "shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_0_0_1px_rgba(34,211,238,0.1)]",
  "transition hover:border-cyan-400/40 hover:bg-white/[0.06]",
  "hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_16px_rgba(34,211,238,0.14)]",
].join(" ");

export const LEFT_STRIP_NAV_CHIP_LABEL_CLASS =
  "max-w-full whitespace-nowrap text-center text-[8px] font-semibold leading-tight tracking-normal text-white/90 sm:text-[9px]";
