/**
 * Narrow source-derived contracts for the four paper responsibilities.
 *
 * `papers.ts` remains the read-only extraction adapter and keeps the complete
 * manifest for compatibility. Runtime layers consume one of these contracts
 * instead of receiving every unrelated paper flag.
 */
import { paperManifest } from "./papers";
import type { PaperConfig } from "./papers";

interface PaperLayerIdentity {
  index: number;
  name: string;
  startAt: number;
  sceneIndex: number;
}

export interface PaperGroundContract extends PaperLayerIdentity {
  hasGround: boolean;
  ground: PaperConfig["ground"];
}

export interface PaperSdfContract extends PaperLayerIdentity {
  sdf: PaperConfig["sdf"];
  revealType: PaperConfig["revealType"];
  transparency: boolean;
}

export interface PaperVegetationContract extends PaperLayerIdentity {
  hasHoverEffect: boolean;
  leaves: PaperConfig["leaves"];
}

export interface PaperShadowContract extends PaperLayerIdentity {
  castShadow: boolean;
  hasHole: boolean;
}

export interface PaperPresentationContract extends PaperLayerIdentity {
  title?: string;
  cta?: string;
}

export interface PaperLayerContracts {
  ground: readonly PaperGroundContract[];
  sdf: readonly PaperSdfContract[];
  vegetation: readonly PaperVegetationContract[];
  shadow: readonly PaperShadowContract[];
  presentation: readonly PaperPresentationContract[];
}

function identity(paper: PaperConfig, index: number): PaperLayerIdentity {
  return {
    index,
    name: paper.name,
    startAt: paper.startAt,
    sceneIndex: paper.sceneIndex,
  };
}

export const paperLayerContracts: PaperLayerContracts = Object.freeze({
  ground: Object.freeze(paperManifest.map((paper, index) => ({
    ...identity(paper, index),
    hasGround: paper.hasGround,
    ground: paper.ground,
  }))),
  sdf: Object.freeze(paperManifest.map((paper, index) => ({
    ...identity(paper, index),
    sdf: paper.sdf,
    revealType: paper.revealType,
    transparency: Boolean(paper.transparency),
  }))),
  vegetation: Object.freeze(paperManifest.map((paper, index) => ({
    ...identity(paper, index),
    hasHoverEffect: paper.hasHoverEffect,
    leaves: paper.leaves,
  }))),
  shadow: Object.freeze(paperManifest.map((paper, index) => ({
    ...identity(paper, index),
    castShadow: paper.castShadow,
    hasHole: paper.hasHole,
  }))),
  presentation: Object.freeze(paperManifest.map((paper, index) => ({
    ...identity(paper, index),
    title: paper.title,
    cta: paper.cta,
  }))),
});
