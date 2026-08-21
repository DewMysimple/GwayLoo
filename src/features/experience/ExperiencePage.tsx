import { experienceCopy } from '../../content/experience';
import { LegacyRuntimeBridge } from './LegacyRuntimeBridge';

export function ExperiencePage() {
  return <LegacyRuntimeBridge copy={experienceCopy} />;
}
