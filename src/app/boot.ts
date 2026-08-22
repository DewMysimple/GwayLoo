import { useEffect, useState } from 'react';

export interface BootState {
  complete: boolean;
  progress: number;
  skipped: boolean;
}

const BOOT_DELAY_MS = 1_200;
const BOOT_DURATION_MS = 3_000;

function initialBootState(search: string): BootState {
  const params = new URLSearchParams(search);
  const skipped = params.has('skip') || params.has('skipRegister');
  return {
    complete: skipped,
    progress: skipped ? 100 : 0,
    skipped,
  };
}

export function useBootSequence(search: string): BootState {
  const [state, setState] = useState<BootState>(() => initialBootState(search));

  useEffect(() => {
    const initial = initialBootState(search);
    setState(initial);
    if (initial.skipped) return;

    let animationFrame = 0;
    let startedAt = 0;
    const update = (timestamp: number) => {
      if (startedAt === 0) startedAt = timestamp;
      const progress = Math.min(100, ((timestamp - startedAt) / BOOT_DURATION_MS) * 100);
      setState({ complete: progress >= 100, progress, skipped: false });
      if (progress < 100) animationFrame = window.requestAnimationFrame(update);
    };

    const delay = window.setTimeout(() => {
      animationFrame = window.requestAnimationFrame(update);
    }, BOOT_DELAY_MS);

    return () => {
      window.clearTimeout(delay);
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
    };
  }, [search]);

  return state;
}
