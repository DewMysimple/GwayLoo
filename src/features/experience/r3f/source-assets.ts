import { createContext, useContext } from 'react';
import type { Data3DTexture, Texture } from 'three';

export interface LoadedExperienceAssets {
  atlas: Texture;
  atlasMask: Texture;
  atlasSdf: Texture;
  dryLut: Data3DTexture;
  groundAtlas: Texture;
  inkLut: Data3DTexture;
  noise: Texture;
  paper: Texture;
}

export const SourceAssetsContext = createContext<LoadedExperienceAssets | null>(null);

export function useSourceAssets(): LoadedExperienceAssets {
  const assets = useContext(SourceAssetsContext);
  if (!assets) throw new Error('水彩世界必须挂载在 SourceAssetPipeline 内。');
  return assets;
}
