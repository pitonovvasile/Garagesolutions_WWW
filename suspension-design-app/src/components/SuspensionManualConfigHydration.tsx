import { useHydrateSuspensionManualConfig } from "../hooks/useHydrateSuspensionManualConfig";

/** Reîncarcă rubricile + hardware din localStorage când se schimbă vehiculul / garajul. */
export function SuspensionManualConfigHydration() {
  useHydrateSuspensionManualConfig();
  return null;
}
