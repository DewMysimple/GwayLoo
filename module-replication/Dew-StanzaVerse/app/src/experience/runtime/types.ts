import type { SceneId } from "../definition";

/**
 * Source-shaped runtime state.  The legacy WebGL branch keeps its own visual
 * phases, but this state mirrors the main project's content/runtime boundary
 * so loading, scroll selection and failure behavior are not hidden in DOM
 * callbacks or mutable view managers.
 */
export type RuntimePhase = "boot" | "loading" | "exploring" | "landscape" | "tail" | "error";
export type PerformanceTier = "low" | "medium" | "high";

export interface ExperienceRuntimeState {
  phase: RuntimePhase;
  assetProgress: number;
  assetsReady: boolean;
  scrollProgress: number;
  activePoem: 0 | 1 | 2;
  activeScene: SceneId;
  landscapeScene: SceneId | null;
  muted: boolean;
  performanceTier: PerformanceTier;
  error: string | null;
}

export type ExperienceRuntimeAction =
  | { type: "BOOT_COMPLETE" }
  | { type: "ASSET_PROGRESS"; progress: number }
  | { type: "ASSETS_READY" }
  | { type: "READY" }
  | { type: "SCROLL_TO"; progress: number }
  | { type: "ENTER_TAIL" }
  | { type: "OPEN_LANDSCAPE"; scene: SceneId }
  | { type: "CLOSE_LANDSCAPE" }
  | { type: "SET_MUTED"; muted: boolean }
  | { type: "TOGGLE_SOUND" }
  | { type: "RESTART" }
  | { type: "FAIL"; message: string };
