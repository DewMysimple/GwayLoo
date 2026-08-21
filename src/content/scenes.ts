export type DeviceKind = 'desktop' | 'mobile';
export type VideoLayer = 'base' | 'over';
export type SceneId = 1 | 2 | 3 | 4 | 5 | 6;

export interface SceneAssetManifest {
  id: SceneId;
  label: string;
  videos: Record<DeviceKind, Record<VideoLayer, string>>;
}

const assetRoot = '/wp-content/themes/davidwhyte/resources/assets/xp';

function createScene(id: SceneId): SceneAssetManifest {
  return {
    id,
    label: `场景 ${id}`,
    videos: {
      desktop: {
        base: `${assetRoot}/videos/desktop/base/${id}.mp4`,
        over: `${assetRoot}/videos/desktop/over/${id}.mp4`
      },
      mobile: {
        base: `${assetRoot}/videos/mobile/base/${id}.mp4`,
        over: `${assetRoot}/videos/mobile/over/${id}.mp4`
      }
    }
  };
}

export const sceneManifest = [
  createScene(1),
  createScene(2),
  createScene(3),
  createScene(4),
  createScene(5),
  createScene(6)
] as const satisfies readonly SceneAssetManifest[];

export const soundManifest = [
  `${assetRoot}/sounds/loop-main.mp3`,
  `${assetRoot}/sounds/loop-poem.mp3`,
  `${assetRoot}/sounds/loop-painting.mp3`,
  `${assetRoot}/sounds/over-cta-back.mp3`,
  `${assetRoot}/sounds/over-cta-painting.mp3`
] as const;
