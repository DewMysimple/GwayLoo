import { experienceTimeline } from './timeline';

export interface ExperienceAudioManifest {
  main: string;
  poem: string;
  painting: string;
  feedbackBack: string;
  feedbackLandscape: string;
}

export interface ExperienceFontManifest {
  canelaThin: string;
  roobertRegular: string;
}

export interface ExperienceWorldManifest {
  model: string;
  atlas: string;
  atlasMask: string;
  atlasSdf: string;
  groundAtlas: string;
  grassAtlas: string;
  grassGradients: string;
  grassTexture: string;
  leavesTexture: string;
  noiseTexture: string;
  greyscaleNoise: string;
  rgbNoise: string;
  compressedRgbNoise: string;
  rgbaNoise: string;
  paperTexture: string;
  paperNormal: string;
  paperMatcap: string;
  dryLut: string;
  inkLut: string;
  poemTexture: string;
  msdfFontData: string;
  msdfFontAtlas: string;
  basisTranscoderPath: string;
  basisTranscoderScript: string;
  basisTranscoderWasm: string;
  cameraAnimationDuration: number;
}

export interface ExperienceAssetManifest {
  brand: {
    favicon: string;
  };
  fonts: ExperienceFontManifest;
  audio: ExperienceAudioManifest;
  world: ExperienceWorldManifest;
}

const EXPERIENCE_ROOT = '/assets/experience';

export function experienceAssetUrl(relativePath: string): string {
  return `${EXPERIENCE_ROOT}/${relativePath.replace(/^\/+/, '')}`;
}

export const experienceAssets = {
  brand: {
    favicon: '/assets/brand/favicon-32x32.png',
  },
  fonts: {
    canelaThin: '/assets/fonts/CanelaText-Thin.woff2',
    roobertRegular: '/assets/fonts/Roobert-Regular.woff2',
  },
  audio: {
    main: experienceAssetUrl('sounds/loop-main.mp3'),
    poem: experienceAssetUrl('sounds/loop-poem.mp3'),
    painting: experienceAssetUrl('sounds/loop-painting.mp3'),
    feedbackBack: experienceAssetUrl('sounds/over-cta-back.mp3'),
    feedbackLandscape: experienceAssetUrl('sounds/over-cta-painting.mp3'),
  },
  world: {
    model: experienceAssetUrl('models/scene.glb'),
    atlas: experienceAssetUrl('textures/atlas/texture.jpg'),
    atlasMask: experienceAssetUrl('textures/atlas/texture_mask.jpg'),
    atlasSdf: experienceAssetUrl('textures/atlas/sdf.png'),
    groundAtlas: experienceAssetUrl('textures/grounds/atlas.ktx2'),
    grassAtlas: experienceAssetUrl('textures/grass/atlas.png'),
    grassGradients: experienceAssetUrl('textures/grass/color-gradients.jpg'),
    grassTexture: experienceAssetUrl('textures/grassTest.png'),
    leavesTexture: experienceAssetUrl('textures/leaves.png'),
    noiseTexture: experienceAssetUrl('textures/noise.jpeg'),
    greyscaleNoise: experienceAssetUrl('textures/noises/greyscale-fractal.png'),
    rgbNoise: experienceAssetUrl('textures/noises/rgb-fractal.png'),
    compressedRgbNoise: experienceAssetUrl('textures/noises/rgb-generated-compressed.png'),
    rgbaNoise: experienceAssetUrl('textures/noises/rgba-pixel.png'),
    paperTexture: experienceAssetUrl('textures/paper/texture.jpg'),
    paperNormal: experienceAssetUrl('textures/paper/normal.jpg'),
    paperMatcap: experienceAssetUrl('textures/paper/matcap.png'),
    dryLut: experienceAssetUrl('lut/dry.3DL'),
    inkLut: experienceAssetUrl('lut/ink.3DL'),
    poemTexture: experienceAssetUrl('poem/text.png'),
    msdfFontData: experienceAssetUrl('msdf/CanelaText-Light/CanelaText-Light.json'),
    msdfFontAtlas: experienceAssetUrl('msdf/CanelaText-Light/CanelaText-Light.png'),
    basisTranscoderPath: experienceAssetUrl('libs/basis/'),
    basisTranscoderScript: experienceAssetUrl('libs/basis/basis_transcoder.js'),
    basisTranscoderWasm: experienceAssetUrl('libs/basis/basis_transcoder.wasm'),
    cameraAnimationDuration: experienceTimeline.cameraDurationSeconds,
  },
} as const satisfies ExperienceAssetManifest;
