import { lazy, Suspense } from 'react';
import type { BootState } from '../../app/boot';
import { experienceDefinition } from '../../content/definition';
import { LegacyRuntimeBridge } from './LegacyRuntimeBridge';
import { resolveRuntime } from './runtime/selection';

const R3FExperienceRuntime = lazy(async () => {
  const module = await import('./r3f/R3FExperienceRuntime');
  return { default: module.R3FExperienceRuntime };
});

interface ExperiencePageProps {
  boot: BootState;
  search?: string;
}

export function ExperiencePage({ boot, search = window.location.search }: ExperiencePageProps) {
  const runtime = resolveRuntime(search);
  if (runtime === 'r3f') {
    return (
      <Suspense fallback={null}>
        <R3FExperienceRuntime boot={boot} definition={experienceDefinition} />
      </Suspense>
    );
  }

  return <LegacyRuntimeBridge boot={boot} definition={experienceDefinition} />;
}
