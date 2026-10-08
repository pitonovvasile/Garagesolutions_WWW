import aeroCarbonFiberTexture from "../../assets/reference/aero-carbon-fiber-texture.png";
import aeroForgedCarbonTexture from "../../assets/reference/aero-forged-carbon-texture.png";
import aeroFiberglassTexture from "../../assets/reference/aero-fiberglass-texture.png";
import { AERO_BODY_MATERIALS, type AeroBodyMaterialId } from "../../data/aeroBodyComponents";

export const AERO_BODY_MATERIAL_TEXTURES: Partial<Record<AeroBodyMaterialId, string>> = {
  carbon: aeroCarbonFiberTexture,
  "forged-carbon": aeroForgedCarbonTexture,
  fiberglass: aeroFiberglassTexture,
};

const swatchBase = "shrink-0 rounded-full border border-white/10 shadow-inner";

export function MaterialSwatch({
  materialId,
  size = "sm",
  className = "",
}: {
  materialId: AeroBodyMaterialId;
  size?: "sm" | "md";
  className?: string;
}) {
  const mat = AERO_BODY_MATERIALS.find((m) => m.id === materialId) ?? AERO_BODY_MATERIALS.find((m) => m.id === "none")!;
  const texture = AERO_BODY_MATERIAL_TEXTURES[materialId];
  const sizeClass = size === "sm" ? "h-4 w-4" : "h-6 w-6";

  if (texture) {
    return (
      <span
        className={[swatchBase, sizeClass, "bg-cover bg-center", className].join(" ")}
        style={{ backgroundImage: `url(${texture})` }}
        aria-hidden
      />
    );
  }

  return (
    <span
      className={[swatchBase, sizeClass, `bg-gradient-to-br ${mat.swatch}`, className].join(" ")}
      aria-hidden
    />
  );
}

export function materialHasTexture(materialId: AeroBodyMaterialId): boolean {
  return materialId in AERO_BODY_MATERIAL_TEXTURES;
}
