import { experienceDefinition } from '../content/definition';
import { ExperiencePage } from '../features/experience/ExperiencePage';
import { BootLoader } from './BootLoader';
import { useBootSequence } from './boot';

export function App() {
  const search = window.location.search;
  const boot = useBootSequence(search);

  return (
    <>
      <BootLoader brandName={experienceDefinition.copy.brandName} state={boot} />
      <ExperiencePage boot={boot} search={search} />
    </>
  );
}
