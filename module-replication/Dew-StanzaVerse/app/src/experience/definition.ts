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
import { experienceCopy } from "../content/experience";
import { fontAssets } from "../content/fonts";
import { tailCopy } from "../content/tail";
import { createVideoResources, detectWorldDevice, staticResources, worldAssets } from "../content/world";
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
  label: string;
  title: string;
  focusProgress: number;
  /** Legacy camera time derived from the source progress contract. */
  focusTime: number;
  videos: Record<DeviceKind, Record<VideoLayer, string>>;
}

export interface SoundDefinition {
  name: ExperienceThemeName | ExperienceEffectName;
  kind: "theme" | "effect";
  path: string;
}

export interface ExperienceDefinition {
  copy: typeof experienceCopy;
  fonts: typeof fontAssets;
  tail: typeof tailCopy;
  assets: {
    staticResources: readonly ResourceItem[];
    videoResources: readonly ResourceItem[];
    device: DeviceKind;
  };
  scenes: readonly SceneDefinition[];
  sounds: readonly SoundDefinition[];
  world: {
    assets: typeof worldAssets;
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
const device = detectWorldDevice();
const sceneTitles = [
  "Dales with Cows",
  "Nidderdale Farm",
  "North York Moors",
  "Dales near Aysgarth",
  "Dales with Sheep",
  "Ribblehead Viaduct",
] as const;
const sceneFocusProgress = [0.02, 0.14, 0.26, 0.34, 0.55, 0.66] as const;

function createScene(id: SceneId): SceneDefinition {
  const focusProgress = sceneFocusProgress[id - 1];
  return {
    id,
    label: `场景 ${id}`,
    title: sceneTitles[id - 1],
    focusProgress,
    focusTime: focusProgress * CAMERA_ANIMATION_DURATION,
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
  copy: experienceCopy,
  fonts: fontAssets,
  tail: tailCopy,
  assets: {
    staticResources,
    videoResources: createVideoResources(device),
    device,
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
    assets: worldAssets,
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
