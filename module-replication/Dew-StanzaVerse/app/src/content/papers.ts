/**
 * Branch content boundary for the source-extracted paper manifest.
 *
 * `config/papers.ts` remains the read-only extraction/config payload. Runtime
 * code consumes this named content contract so paper ground, SDF, leaves,
 * shadow and reveal metadata can be injected through ExperienceDefinition.
 */
import {
  PAPER_REVEAL_TIMING,
  PAPERS_CONFIG,
  type PaperConfig,
  type PaperRevealProfile,
  type PaperRevealTiming,
} from "../config/papers";

export type { PaperConfig, PaperRevealProfile, PaperRevealTiming };

export const paperManifest: readonly PaperConfig[] = PAPERS_CONFIG;

export { PAPER_REVEAL_TIMING };
export { CAMERA_ANIMATION_DURATION, CAMERA_SCROLL_END, GROUND_ATLAS } from "../config/papers";
