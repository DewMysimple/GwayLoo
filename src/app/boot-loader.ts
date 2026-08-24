import { resolveRuntime } from '../features/experience/runtime/selection';

declare global {
  interface Window {
    loaderProgress?: number;
    loaderTimeout?: number;
  }
}

const BOOT_COMPLETE_EVENT = 'gwayloo:boot-complete';

export function startBootLoader(): void {
  const loader = document.getElementById('loader');
  const progress = loader?.querySelector<HTMLElement>('.loader-bar-animated');
  if (!loader || !progress) return;

  const params = new URLSearchParams(window.location.search);
  if (params.has('skipRegister')) document.body.style.opacity = '0';

  const complete = () => {
    document.documentElement.dataset.bootComplete = 'true';
    window.dispatchEvent(new CustomEvent(BOOT_COMPLETE_EVENT));
    if (resolveRuntime(window.location.search) === 'r3f') loader.style.display = 'none';
  };

  if (params.has('skip') || params.has('skipRegister')) {
    loader.style.display = 'none';
    window.loaderProgress = 100;
    queueMicrotask(complete);
    return;
  }

  window.loaderProgress = 0;
  window.setTimeout(() => {
    const update = () => {
      window.loaderProgress = Math.min(100, (window.loaderProgress ?? 0) + 1);
      progress.style.transform = `scaleX(${window.loaderProgress}%)`;
      if (window.loaderProgress < 100) {
        window.loaderTimeout = window.setTimeout(update, 30);
      } else {
        complete();
      }
    };
    window.setTimeout(update, 200);
  }, 1000);
}

export function onBootComplete(callback: () => void): () => void {
  if (document.documentElement.dataset.bootComplete === 'true') {
    queueMicrotask(callback);
    return () => undefined;
  }
  window.addEventListener(BOOT_COMPLETE_EVENT, callback, { once: true });
  return () => window.removeEventListener(BOOT_COMPLETE_EVENT, callback);
}
