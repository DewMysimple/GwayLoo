import type { SceneId } from "../definition";

export interface RuntimeSelectionConfig {
  sceneStarts: readonly number[];
  poemBreakpoints: readonly [number, number];
}

export function clampRuntimeProgress(value: number): number {
  return Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
}

export function poemForProgress(
  progress: number,
  breakpoints: readonly [number, number],
): 0 | 1 | 2 {
  if (progress < breakpoints[0]) return 0;
  if (progress < breakpoints[1]) return 1;
  return 2;
}

export function sceneForProgress(
  progress: number,
  starts: readonly number[],
): SceneId {
  let scene: SceneId = 1;
  starts.forEach((start, index) => {
    if (progress >= start && index < 6) scene = (index + 1) as SceneId;
  });
  return scene;
}
