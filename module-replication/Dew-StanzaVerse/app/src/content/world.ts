import type { ResourceItem } from "../core/Resources";

export type WorldDevice = "desktop" | "mobile";

const assetRoot = "/xp";

export const worldAssets = {
  model: `${assetRoot}/models/scene.glb`,
  atlas: `${assetRoot}/textures/atlas/texture.jpg`,
  atlasMask: `${assetRoot}/textures/atlas/texture_mask.jpg`,
  atlasSdf: `${assetRoot}/textures/atlas/sdf.png`,
  groundAtlas: `${assetRoot}/textures/grounds/atlas.ktx2`,
  grassAtlas: `${assetRoot}/textures/grass/atlas.png`,
  grassGradients: `${assetRoot}/textures/grass/color-gradients.jpg`,
  grassTexture: `${assetRoot}/textures/grassTest.png`,
  leavesTexture: `${assetRoot}/textures/leaves.png`,
  noiseTexture: `${assetRoot}/textures/noise.jpeg`,
  greyscaleNoise: `${assetRoot}/textures/noises/greyscale-fractal.png`,
  rgbNoise: `${assetRoot}/textures/noises/rgb-fractal.png`,
  compressedRgbNoise: `${assetRoot}/textures/noises/rgb-generated-compressed.png`,
  rgbaNoise: `${assetRoot}/textures/noises/rgba-pixel.png`,
  paperTexture: `${assetRoot}/textures/paper/texture.jpg`,
  paperNormal: `${assetRoot}/textures/paper/normal.jpg`,
  paperMatcap: `${assetRoot}/textures/paper/matcap.png`,
  dryLut: `${assetRoot}/lut/dry.3DL`,
  inkLut: `${assetRoot}/lut/ink.3DL`,
  poemTexture: `${assetRoot}/poem/text.png`,
  msdfFontData: `${assetRoot}/msdf/CanelaText-Light/CanelaText-Light.json`,
  msdfFontAtlas: `${assetRoot}/msdf/CanelaText-Light/CanelaText-Light.png`,
  basisTranscoderPath: `${assetRoot}/libs/basis/`,
  basisTranscoderScript: `${assetRoot}/libs/basis/basis_transcoder.js`,
  basisTranscoderWasm: `${assetRoot}/libs/basis/basis_transcoder.wasm`,
  cameraAnimationDuration: 59.766666666666666,
} as const;

export const staticResources: readonly ResourceItem[] = [
  { type: "gltf", path: worldAssets.model, name: "watercolor/scene" },
  { type: "texture", path: worldAssets.atlasSdf, name: "atlas/sdf" },
  { type: "texture", path: worldAssets.atlas, name: "atlas/texture" },
  { type: "texture", path: worldAssets.atlasMask, name: "atlas/texture_mask" },
  { type: "3dl", path: worldAssets.inkLut, name: "lut/ink" },
  { type: "3dl", path: worldAssets.dryLut, name: "lut/dry" },
  { type: "texture", path: worldAssets.paperNormal, name: "watercolor/paper/normal" },
  { type: "texture", path: worldAssets.paperMatcap, name: "watercolor/paper/matcap" },
  { type: "texture", path: worldAssets.paperTexture, name: "watercolor/paper/texture" },
  { type: "texture", path: worldAssets.noiseTexture, name: "grass/noise" },
  { type: "texture", path: worldAssets.leavesTexture, name: "leave/texture" },
  { type: "texture", path: worldAssets.rgbNoise, name: "noise/rgb-fractal" },
  { type: "texture", path: worldAssets.greyscaleNoise, name: "noise/greyscale-fractal" },
  { type: "texture", path: worldAssets.compressedRgbNoise, name: "noise/rgb-generated" },
  { type: "ktx", path: worldAssets.groundAtlas, name: "watercolor/ground" },
  { type: "texture", path: worldAssets.grassAtlas, name: "grass/blade-atlas" },
  { type: "texture", path: worldAssets.grassGradients, name: "grass/color-gradients" },
  { type: "texture", path: worldAssets.poemTexture, name: "poem/texture" },
  { type: "json", path: worldAssets.msdfFontData, name: "canela/font" },
  { type: "texture", path: worldAssets.msdfFontAtlas, name: "canela/atlas" },
];

export function detectWorldDevice(): WorldDevice {
  return "ontouchstart" in window || navigator.maxTouchPoints > 0 || window.innerWidth < 768
    ? "mobile"
    : "desktop";
}
export function createVideoResources(device: WorldDevice): readonly ResourceItem[] {
  const items: ResourceItem[] = [];
  for (let id = 1; id <= 6; id++) {
    items.push(
      { type: "video", path: `${assetRoot}/videos/${device}/base/${id}.mp4`, name: `video/base/${id}` },
      { type: "video", path: `${assetRoot}/videos/${device}/over/${id}.mp4`, name: `video/over/${id}` },
    );
  }
  return items;
}
