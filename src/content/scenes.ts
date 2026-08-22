import { experienceAssetUrl } from './assets';
import { experienceTimeline } from './timeline';

export type DeviceKind = 'desktop' | 'mobile';
export type VideoLayer = 'base' | 'over';
export type SceneId = 1 | 2 | 3 | 4 | 5 | 6;

export interface SceneAssetManifest {
  id: SceneId;
  label: string;
  title: string;
  focusProgress: number;
  videos: Record<DeviceKind, Record<VideoLayer, string>>;
}

const sceneTitles = [
  'Dales with Cows',
  'Nidderdale Farm',
  'North York Moors',
  'Dales near Aysgarth',
  'Dales with Sheep',
  'Ribblehead Viaduct',
] as const;

function createScene(id: SceneId): SceneAssetManifest {
  return {
    id,
    label: `场景 ${id}`,
    title: sceneTitles[id - 1],
    focusProgress: experienceTimeline.sceneFocusProgress[id - 1],
    videos: {
      desktop: {
        base: experienceAssetUrl(`videos/desktop/base/${id}.mp4`),
        over: experienceAssetUrl(`videos/desktop/over/${id}.mp4`)
      },
      mobile: {
        base: experienceAssetUrl(`videos/mobile/base/${id}.mp4`),
        over: experienceAssetUrl(`videos/mobile/over/${id}.mp4`)
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
