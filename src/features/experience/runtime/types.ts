import type { SceneId } from '../../../content/scenes';

export type ExperiencePhase = 'boot' | 'loading' | 'exploring' | 'landscape' | 'tail' | 'error';
export type PerformanceTier = 'low' | 'medium' | 'high';
export type RuntimeKind = 'legacy' | 'r3f';

export interface ExperienceRuntimeState {
  phase: ExperiencePhase;
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

export interface ExperienceRuntimeActions {
  scrollTo: (progress: number) => void;
  enterLandscape: (scene: SceneId) => void;
  leaveLandscape: () => void;
  toggleSound: () => void;
  restart: () => void;
}

export type ExperienceRuntimeAction =
  | { type: 'BOOT_COMPLETE' }
  | { type: 'ASSET_PROGRESS'; progress: number }
  | { type: 'ASSETS_READY' }
  | { type: 'READY' }
  | { type: 'SCROLL_TO'; progress: number }
  | { type: 'ENTER_TAIL' }
  | { type: 'OPEN_LANDSCAPE'; scene: SceneId }
  | { type: 'CLOSE_LANDSCAPE' }
  | { type: 'SET_MUTED'; muted: boolean }
  | { type: 'TOGGLE_SOUND' }
  | { type: 'RESTART' }
  | { type: 'FAIL'; message: string };
