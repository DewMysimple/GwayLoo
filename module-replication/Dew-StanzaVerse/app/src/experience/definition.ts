/**
 * Branch-side equivalent of the main project's ExperienceDefinition.
 *
 * The Branch keeps its source-extracted Three.js configuration and local
 * `/assets` paths, but exposes one injected definition so runtime modules do
 * not have to reconstruct scenes, sounds, and world timing independently.
 * Values here intentionally reference the existing config objects; this is a
 * wiring boundary, not a visual-parameter rewrite.
 */
import type { ResourceItem } from "../core/Resources";
import { IS_MOBILE, STATIC_RESOURCES, VIDEO_RESOURCES } from "../config/assets";
import {
  CAMERA_ANIMATION_DURATION,
  CAMERA_SCROLL_END,
  GROUND_ATLAS,
  PAPER_REVEAL_TIMING,
  PAPERS_CONFIG,
  type PaperConfig,
  type PaperRevealTiming,
} from "../config/papers";

export type DeviceKind = "desktop" | "mobile";
export type VideoLayer = "base" | "over";
export type SceneId = 1 | 2 | 3 | 4 | 5 | 6;
export type ExperienceThemeName = "loop-main" | "loop-poem" | "loop-painting";
export type ExperienceEffectName = "over-cta-back" | "over-cta-painting";

export interface SceneDefinition {
  id: SceneId;
  title: string;
  focusTime: number;
  videos: Record<DeviceKind, Record<VideoLayer, string>>;
}

export interface SoundDefinition {
  name: ExperienceThemeName | ExperienceEffectName;
  kind: "theme" | "effect";
  path: string;
}

export interface ExperienceDefinition {
  assets: {
    staticResources: readonly ResourceItem[];
    videoResources: readonly ResourceItem[];
    device: DeviceKind;
  };
  scenes: readonly SceneDefinition[];
  sounds: readonly SoundDefinition[];
  world: {
    papers: readonly PaperConfig[];
    groundAtlas: typeof GROUND_ATLAS;
    revealTiming: PaperRevealTiming;
    cameraAnimationDuration: number;
    cameraScrollEnd: number;
  };
  runtime: {
    cameraTailSeconds: number;
    travelMultiplier: number;
    poemBreakpoints: readonly [number, number];
  };
}

const assetRoot = "/assets/xp";
const sceneIds: readonly SceneId[] = [1, 2, 3, 4, 5, 6];

function createScene(id: SceneId): SceneDefinition {
  const titlePaper = PAPERS_CONFIG.find((paper) => paper.sceneIndex === id && paper.title);
  return {
    id,
    title: titlePaper?.title ?? `Scene ${id}`,
    focusTime: titlePaper?.startAt ?? 0,
    videos: {
      desktop: {
        base: `${assetRoot}/videos/desktop/base/${id}.mp4`,
        over: `${assetRoot}/videos/desktop/over/${id}.mp4`,
      },
      mobile: {
        base: `${assetRoot}/videos/mobile/base/${id}.mp4`,
        over: `${assetRoot}/videos/mobile/over/${id}.mp4`,
      },
    },
  };
}

export const experienceDefinition: ExperienceDefinition = {
  assets: {
    staticResources: STATIC_RESOURCES,
    videoResources: VIDEO_RESOURCES,
    device: IS_MOBILE ? "mobile" : "desktop",
  },
  scenes: sceneIds.map(createScene),
  sounds: [
    { name: "loop-main", kind: "theme", path: `${assetRoot}/sounds/loop-main.mp3` },
    { name: "loop-poem", kind: "theme", path: `${assetRoot}/sounds/loop-poem.mp3` },
    { name: "loop-painting", kind: "theme", path: `${assetRoot}/sounds/loop-painting.mp3` },
    { name: "over-cta-back", kind: "effect", path: `${assetRoot}/sounds/over-cta-back.mp3` },
    { name: "over-cta-painting", kind: "effect", path: `${assetRoot}/sounds/over-cta-painting.mp3` },
  ],
  world: {
    papers: PAPERS_CONFIG,
    groundAtlas: GROUND_ATLAS,
    revealTiming: PAPER_REVEAL_TIMING,
    cameraAnimationDuration: CAMERA_ANIMATION_DURATION,
    cameraScrollEnd: CAMERA_SCROLL_END,
  },
  runtime: {
    cameraTailSeconds: CAMERA_ANIMATION_DURATION - CAMERA_SCROLL_END,
    travelMultiplier: 7.5,
    poemBreakpoints: [0.32, 0.62],
  },
};
