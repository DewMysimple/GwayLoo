import type { PerformanceTier } from "./types";

interface NavigatorWithMemory extends Navigator {
  deviceMemory?: number;
}

/** Same coarse capability contract as the main runtime; visuals remain source-driven. */
export function detectPerformanceTier(navigatorValue: Navigator = navigator): PerformanceTier {
  const memory = (navigatorValue as NavigatorWithMemory).deviceMemory;
  const cores = navigatorValue.hardwareConcurrency || 4;
  if ((memory !== undefined && memory <= 4) || cores <= 4) return "low";
  if ((memory !== undefined && memory >= 8) && cores >= 8) return "high";
  return "medium";
}
