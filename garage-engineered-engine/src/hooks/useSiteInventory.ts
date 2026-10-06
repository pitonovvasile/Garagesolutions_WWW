import { useCallback, useEffect, useState } from "react";
import { readCartLines, readOwnedProductIds } from "../lib/siteCart";

/** Re-render when cart / owned inventory changes (same tab). */
export function useSiteInventory() {
  const [rev, setRev] = useState(0);
  const bump = useCallback(() => setRev((n) => n + 1), []);

  useEffect(() => {
    const onCart = () => bump();
    const onOwned = () => bump();
    window.addEventListener("garage-cart-updated", onCart);
    window.addEventListener("garage-owned-updated", onOwned);
    return () => {
      window.removeEventListener("garage-cart-updated", onCart);
      window.removeEventListener("garage-owned-updated", onOwned);
    };
  }, [bump]);

  void rev;

  return {
    cartLines: readCartLines(),
    ownedIds: readOwnedProductIds(),
    refresh: bump,
  };
}
