import { describe, expect, it } from 'vitest';
import { experienceAssets } from './assets';
import { sceneManifest } from './scenes';

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
    expect(Object.values(experienceAssets.audio)).toHaveLength(5);
    expect(Object.values(experienceAssets.fonts)).toHaveLength(2);
    expect(experienceAssets.world.model).toMatch(/scene\.glb$/);
    expect(experienceAssets.world.groundAtlas).toMatch(/\.ktx2$/);
    expect(experienceAssets.world.dryLut).toMatch(/\.3DL$/);
    expect(experienceAssets.world.inkLut).toMatch(/\.3DL$/);
    expect(experienceAssets.world.msdfFontData).toMatch(/\.json$/);
    expect(JSON.stringify(experienceAssets)).not.toContain(['/wp', 'content/'].join('-'));
  });
});
