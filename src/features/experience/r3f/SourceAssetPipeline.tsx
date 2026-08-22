import { useKTX2, useTexture } from '@react-three/drei';
import { useLoader } from '@react-three/fiber';
import {
  useEffect,
  useMemo,
  type ReactNode,
} from 'react';
import {
  RepeatWrapping,
  SRGBColorSpace,
} from 'three';
import { LUT3dlLoader } from 'three/addons/loaders/LUT3dlLoader.js';
import type { ExperienceDefinition } from '../../../content/definition';
import {
  SourceAssetsContext,
  type LoadedExperienceAssets,
} from './source-assets';

class SourceCompatibleLUT3dlLoader extends LUT3dlLoader {
  override parse(input: string) {
    const grid = /^[\d ]+$/m.exec(input)?.[0];
    if (!grid) return super.parse(input);
    const points = grid.trim().split(/\s+/).map(Number);
    const step = points[1] - points[0];
    const isUniform = points.every((point, index) => index === 0 || point - points[index - 1] === step);
    if (isUniform) return super.parse(input);

    // Photoshop's 8-point export alternates 146/147 after rounding. Three
    // derives only the cube size from this row but otherwise rejects it.
    const normalizedGrid = points.map((_, index) => index * step).join(' ');
    return super.parse(input.replace(grid, normalizedGrid));
  }
}

export function SourceAssetPipeline({
  children,
  definition,
}: {
  children: ReactNode;
  definition: ExperienceDefinition;
}) {
  const { world } = definition.assets;
  const [atlas, atlasMask, atlasSdf, noise, paper] = useTexture([
    world.atlas,
    world.atlasMask,
    world.atlasSdf,
    world.noiseTexture,
    world.paperTexture,
  ]);
  const groundAtlas = useKTX2(world.groundAtlas, world.basisTranscoderPath);
  const [dryLutResult, inkLutResult] = useLoader(
    SourceCompatibleLUT3dlLoader,
    [world.dryLut, world.inkLut],
  );

  useEffect(() => {
    atlas.flipY = false;
    atlas.colorSpace = SRGBColorSpace;
    atlasMask.flipY = false;
    atlasSdf.flipY = false;
    noise.wrapS = RepeatWrapping;
    noise.wrapT = RepeatWrapping;
    paper.colorSpace = SRGBColorSpace;
    paper.wrapS = RepeatWrapping;
    paper.wrapT = RepeatWrapping;
    groundAtlas.colorSpace = SRGBColorSpace;
    [atlas, atlasMask, atlasSdf, noise, paper, groundAtlas].forEach((texture) => {
      texture.needsUpdate = true;
    });
    dryLutResult.texture3D.needsUpdate = true;
    inkLutResult.texture3D.needsUpdate = true;
  }, [atlas, atlasMask, atlasSdf, dryLutResult, groundAtlas, inkLutResult, noise, paper]);

  const value = useMemo<LoadedExperienceAssets>(() => ({
    atlas,
    atlasMask,
    atlasSdf,
    dryLut: dryLutResult.texture3D,
    groundAtlas,
    inkLut: inkLutResult.texture3D,
    noise,
    paper,
  }), [atlas, atlasMask, atlasSdf, dryLutResult, groundAtlas, inkLutResult, noise, paper]);

  return <SourceAssetsContext.Provider value={value}>{children}</SourceAssetsContext.Provider>;
}
