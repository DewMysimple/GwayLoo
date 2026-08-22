import type { ComponentType } from 'react';
import type { BootState } from '../../../app/boot';
import type { ExperienceDefinition } from '../../../content/definition';

export interface ExperienceRuntimeProps {
  boot: BootState;
  definition: ExperienceDefinition;
}

/** Both migration tracks are mounted through this configuration boundary. */
export type ExperienceRuntime = ComponentType<ExperienceRuntimeProps>;
