import type { ExperienceRuntimeAction, ExperienceRuntimeState, PerformanceTier } from "./types";
import type { RuntimeSelectionConfig } from "./selection";
import { clampRuntimeProgress, poemForProgress, sceneForProgress } from "./selection";

/** Narrow Definition-derived input required by the pure selection reducer. */
export type RuntimeReducerConfig = RuntimeSelectionConfig;

export function createInitialRuntimeState(
  performanceTier: PerformanceTier = "high",
): ExperienceRuntimeState {
  return {
    phase: "boot",
    assetProgress: 0,
    assetsReady: false,
    scrollProgress: 0,
    activePoem: 0,
    activeScene: 1,
    landscapeScene: null,
    muted: true,
    performanceTier,
    error: null,
  };
}

export function experienceRuntimeReducer(
  state: ExperienceRuntimeState,
  action: ExperienceRuntimeAction,
  config: RuntimeReducerConfig,
): ExperienceRuntimeState {
  switch (action.type) {
    case "BOOT_COMPLETE":
      return state.phase === "boot" ? { ...state, phase: "loading" } : state;
    case "ASSET_PROGRESS":
      return { ...state, assetProgress: Math.min(100, Math.max(0, action.progress)) };
    case "ASSETS_READY":
      return { ...state, assetProgress: 100, assetsReady: true, error: null };
    case "READY":
      return state.phase === "loading" ? { ...state, phase: "exploring" } : state;
    case "SCROLL_TO": {
      const progress = clampRuntimeProgress(action.progress);
      return {
        ...state,
        phase: state.phase === "boot" || state.phase === "loading" || state.phase === "error"
          ? state.phase
          : state.phase === "tail" && progress >= 0.999
            ? "tail"
          : state.landscapeScene ? "landscape" : "exploring",
        scrollProgress: progress,
        activePoem: poemForProgress(progress, config.poemBreakpoints),
        activeScene: sceneForProgress(progress, config.sceneStarts),
      };
    }
    case "ENTER_TAIL":
      return state.landscapeScene ? state : { ...state, phase: "tail" };
    case "OPEN_LANDSCAPE":
      return { ...state, phase: "landscape", landscapeScene: action.scene };
    case "CLOSE_LANDSCAPE":
      return { ...state, phase: "exploring", landscapeScene: null };
    case "SET_MUTED":
      return { ...state, muted: action.muted };
    case "TOGGLE_SOUND":
      return { ...state, muted: !state.muted };
    case "RESTART":
      return {
        ...createInitialRuntimeState(state.performanceTier),
        phase: "exploring",
        assetProgress: 100,
        assetsReady: true,
      };
    case "FAIL":
      return { ...state, phase: "error", error: action.message };
    default:
      return state;
  }
}
