/**
 * Source-derived atlas metadata for the legacy watercolor renderer.
 *
 * The JSON files remain the read-only extraction payload. This module is the
 * content boundary that gives the runtime named, typed data instead of
 * letting WatercolorView import config payloads directly.
 */
import atlasSdfJson from "../config/atlas-sdf.json";
import atlasTextureJson from "../config/atlas-texture.json";
import { PAPERS_CONFIG } from "../config/papers";

export interface AtlasSdfEntry {
  pixelSize: { x: number; y: number };
  scale: { x: number; y: number };
  planeSize: { x: number; y: number };
  originSize: { x: number; y: number };
  atlasRemap: { x: number; y: number; z: number; w: number };
}

export interface AtlasTextureEntry {
  atlasRemap: { x: number; y: number; z: number; w: number };
}

type AtlasEntries<T> = readonly (readonly [string, T])[];

const sdfEntries = atlasSdfJson as unknown as AtlasEntries<AtlasSdfEntry>;
const textureEntries = atlasTextureJson as unknown as AtlasEntries<AtlasTextureEntry>;

/**
 * The source keeps these timings beside atlas metadata. Keep the legacy
 * PaperConfig startAt as a compatibility field, but expose one definition
 * for consumers that need the source schedule.
 */
export const watercolorLayerSchedule: Readonly<Record<string, number>> = Object.freeze(
  Object.fromEntries(PAPERS_CONFIG.map((paper) => [paper.name, paper.startAt])),
);

export const watercolorAtlas = {
  sdfEntries,
  textureEntries,
  layerSchedule: watercolorLayerSchedule,
} as const;
