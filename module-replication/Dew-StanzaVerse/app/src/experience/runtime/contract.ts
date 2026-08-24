import type { ExperienceDefinition } from "../definition";
import type { RuntimeSelectionConfig } from "./selection";

/** Definition-derived runtime values shared by reducer, scroll and QA. */
export interface RuntimeContract extends RuntimeSelectionConfig {
  cameraTailSeconds: number;
  travelMultiplier: number;
}

export function createRuntimeContract(definition: ExperienceDefinition): RuntimeContract {
  return {
    sceneStarts: definition.scenes.map(
      (scene) => scene.focusTime / definition.world.cameraAnimationDuration,
    ),
    poemBreakpoints: definition.runtime.poemBreakpoints,
    cameraTailSeconds: definition.runtime.cameraTailSeconds,
    travelMultiplier: definition.runtime.travelMultiplier,
  };
}
