import { lazy, Suspense } from 'react';
import { experienceDefinition } from '../../content/definition';
import { LegacyRuntimeBridge } from './LegacyRuntimeBridge';
import { resolveRuntime } from './runtime/selection';

const R3FExperienceRuntime = lazy(async () => {
  const module = await import('./r3f/R3FExperienceRuntime');
  return { default: module.R3FExperienceRuntime };
});

export function ExperiencePage() {
  const runtime = resolveRuntime(window.location.search);
  if (runtime === 'r3f') {
    return (
      <Suspense fallback={null}>
        <R3FExperienceRuntime definition={experienceDefinition} />
      </Suspense>
    );
  }

  return <LegacyRuntimeBridge definition={experienceDefinition} />;
}
