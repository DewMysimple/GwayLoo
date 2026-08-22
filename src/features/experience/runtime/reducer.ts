import type { SceneId } from '../../../content/scenes';
import type { ExperienceRuntimeAction, ExperienceRuntimeState, PerformanceTier } from './types';

const poemForProgress = (progress: number): 0 | 1 | 2 => {
  if (progress < 0.32) return 0;
  if (progress < 0.62) return 1;
  return 2;
};

const sceneForProgress = (progress: number): SceneId => {
  const starts = [0, 8.25 / 59.7666666667, 15.5 / 59.7666666667, 20 / 59.7666666667, 33 / 59.7666666667, 39.5 / 59.7666666667];
  let scene: SceneId = 1;
  starts.forEach((start, index) => {
    if (progress >= start) scene = (index + 1) as SceneId;
  });
  return scene;
};

export function createInitialRuntimeState(performanceTier: PerformanceTier = 'high'): ExperienceRuntimeState {
  return {
    phase: 'boot',
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
): ExperienceRuntimeState {
  switch (action.type) {
    case 'BOOT_COMPLETE':
      return state.phase === 'boot' ? { ...state, phase: 'loading' } : state;
    case 'ASSET_PROGRESS':
      return { ...state, assetProgress: Math.min(100, Math.max(0, action.progress)) };
    case 'ASSETS_READY':
      return { ...state, assetProgress: 100, assetsReady: true, error: null };
    case 'READY':
      return state.phase === 'loading' ? { ...state, phase: 'exploring' } : state;
    case 'SCROLL_TO': {
      const progress = Math.min(1, Math.max(0, action.progress));
      return {
        ...state,
        phase: state.phase === 'boot' || state.phase === 'loading'
          ? state.phase
          : state.landscapeScene ? 'landscape' : 'exploring',
        scrollProgress: progress,
        activePoem: poemForProgress(progress),
        activeScene: sceneForProgress(progress),
      };
    }
    case 'ENTER_TAIL':
      return state.landscapeScene ? state : { ...state, phase: 'tail' };
    case 'OPEN_LANDSCAPE':
      return { ...state, phase: 'landscape', landscapeScene: action.scene };
    case 'CLOSE_LANDSCAPE':
      return { ...state, phase: 'exploring', landscapeScene: null };
    case 'SET_MUTED':
      return { ...state, muted: action.muted };
    case 'TOGGLE_SOUND':
      return { ...state, muted: !state.muted };
    case 'RESTART':
      return { ...createInitialRuntimeState(state.performanceTier), phase: 'exploring', assetProgress: 100 };
    case 'FAIL':
      return { ...state, phase: 'error', error: action.message };
    default:
      return state;
  }
}
