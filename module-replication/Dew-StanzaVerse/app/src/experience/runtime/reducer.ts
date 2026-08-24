import type { SceneId } from "../definition";
import type { ExperienceRuntimeAction, ExperienceRuntimeState, PerformanceTier } from "./types";

export interface RuntimeReducerConfig {
  sceneStarts: readonly number[];
  poemBreakpoints: readonly [number, number];
}

const DEFAULT_CONFIG: RuntimeReducerConfig = {
  sceneStarts: [0, 8.25 / 59.7666666667, 15.5 / 59.7666666667, 20 / 59.7666666667, 33 / 59.7666666667, 39.5 / 59.7666666667],
  poemBreakpoints: [0.32, 0.62],
};

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
}

function poemForProgress(progress: number, breakpoints: readonly [number, number]): 0 | 1 | 2 {
  if (progress < breakpoints[0]) return 0;
  if (progress < breakpoints[1]) return 1;
  return 2;
}

function sceneForProgress(progress: number, starts: readonly number[]): SceneId {
  let scene: SceneId = 1;
  starts.forEach((start, index) => {
    if (progress >= start && index < 6) scene = (index + 1) as SceneId;
  });
  return scene;
}

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
  config: RuntimeReducerConfig = DEFAULT_CONFIG,
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
      const progress = clamp01(action.progress);
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
