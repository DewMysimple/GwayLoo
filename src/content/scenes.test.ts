import { describe, expect, it } from 'vitest';
import { fontAssets, sceneManifest, soundManifest, worldAssets } from './scenes';

describe('experience asset manifests', () => {
  it('keeps the six source scenes ordered and fully mapped for both devices', () => {
    expect(sceneManifest).toHaveLength(6);
    expect(sceneManifest.map((scene) => scene.id)).toEqual([1, 2, 3, 4, 5, 6]);

    for (const scene of sceneManifest) {
      expect(scene.videos.desktop.base).toMatch(new RegExp(`/base/${scene.id}\\.mp4$`));
      expect(scene.videos.desktop.over).toMatch(new RegExp(`/over/${scene.id}\\.mp4$`));
      expect(scene.videos.mobile.base).toMatch(new RegExp(`/base/${scene.id}\\.mp4$`));
      expect(scene.videos.mobile.over).toMatch(new RegExp(`/over/${scene.id}\\.mp4$`));
    }
  });

  it('declares source audio, fonts, model, shader textures, KTX2 and LUT assets', () => {
    expect(soundManifest).toHaveLength(5);
    expect(Object.values(fontAssets)).toHaveLength(2);
    expect(worldAssets.model).toMatch(/scene\.glb$/);
    expect(worldAssets.groundAtlas).toMatch(/\.ktx2$/);
    expect(worldAssets.dryLut).toMatch(/\.3DL$/);
    expect(worldAssets.inkLut).toMatch(/\.3DL$/);
    expect(worldAssets.msdfFontData).toMatch(/\.json$/);
  });
});
