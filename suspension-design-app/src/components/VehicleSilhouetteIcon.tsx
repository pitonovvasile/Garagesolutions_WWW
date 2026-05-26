import vehicleDataPictogram from "../assets/vehicle-data-front-silhouette.png";
import type { CSSProperties } from "react";

/** PNG linii: RGB = luminanță, alpha 0 pe fundal → mască luminanță; în afara liniilor e transparent. */
function vehiclePictogramMaskStyle(url: string): CSSProperties {
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
  };
}

export type VehicleSilhouetteIconProps = {
  className?: string;
  dimmed?: boolean;
};

/** Pictogramă față vehicul: gradient cyan doar pe linii; restul complet transparent (fundalul părinte se vede). */
export function VehicleSilhouetteIcon({ className = "h-5 w-5", dimmed }: VehicleSilhouetteIconProps) {
  return (
    <span
      className={[
        "inline-block shrink-0 bg-gradient-to-br from-cyan-200 via-cyan-400 to-sky-500",
        dimmed ? "opacity-[0.72]" : "opacity-100",
        className,
      ].join(" ")}
      style={vehiclePictogramMaskStyle(vehicleDataPictogram)}
      aria-hidden
    />
  );
}
