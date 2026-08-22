import type { ComponentType } from 'react';
import type { ExperienceDefinition } from '../../../content/definition';

export interface ExperienceRuntimeProps {
  definition: ExperienceDefinition;
}

/** Both migration tracks are mounted through this configuration boundary. */
export type ExperienceRuntime = ComponentType<ExperienceRuntimeProps>;
