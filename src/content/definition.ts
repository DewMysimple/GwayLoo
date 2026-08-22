import { experienceAssets } from './assets';
import { experienceCopy } from './experience';
import { sceneManifest } from './scenes';
import { tailCopy } from './tail';

export interface ExperienceDefinition {
  copy: typeof experienceCopy;
  scenes: typeof sceneManifest;
  assets: typeof experienceAssets;
  tail: typeof tailCopy;
}

export const experienceDefinition: ExperienceDefinition = {
  copy: experienceCopy,
  scenes: sceneManifest,
  assets: experienceAssets,
  tail: tailCopy,
};
