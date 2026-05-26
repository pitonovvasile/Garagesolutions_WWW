export type GarageModuleMode = "suspension" | "performance" | "transmission" | "aerodynamics" | "braking";

/** Detect which garage module page loaded the shared React bundle. */
export function getGarageModuleMode(): GarageModuleMode {
  if (typeof window === "undefined") return "suspension";
  const path = window.location.pathname.replace(/\\/g, "/").toLowerCase();
  if (path.includes("performance.html") || path.endsWith("/performance")) {
    return "performance";
  }
  if (path.includes("transmission.html") || path.endsWith("/transmission")) {
    return "transmission";
  }
  if (path.includes("aerodynamics") || path.includes("aero-body")) {
    return "aerodynamics";
  }
  if (path.includes("braking")) {
    return "braking";
  }
  return "suspension";
}

export function isPerformanceModule(): boolean {
  return getGarageModuleMode() === "performance";
}

export function isTransmissionModule(): boolean {
  return getGarageModuleMode() === "transmission";
}

export function isAerodynamicsModule(): boolean {
  return getGarageModuleMode() === "aerodynamics";
}

export function isBrakingModule(): boolean {
  return getGarageModuleMode() === "braking";
}
