import type { BootState } from '../../app/boot';

const legacyScriptId = 'verminoble-legacy-runtime';
const legacyStyles = [
  { id: 'verminoble-legacy-style', href: '/wp-content/themes/davidwhyte/style.css' },
  { id: 'verminoble-legacy-loader-style', href: '/wp-content/themes/davidwhyte/loader.css' },
] as const;

declare global {
  interface Window {
    ADMIN_AJAX_URL?: string;
    loaderProgress?: number;
    __verminobleLegacyRuntime?: Promise<void>;
  }
}

function loadLegacyStyles(): Promise<void[]> {
  return Promise.all(legacyStyles.map(({ href, id }) => new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(id) as HTMLLinkElement | null;
    if (existing) {
      if (existing.dataset.loaded === 'true') resolve();
      else {
        existing.addEventListener('load', () => resolve(), { once: true });
        existing.addEventListener('error', () => reject(new Error(`旧样式加载失败：${href}`)), { once: true });
      }
      return;
    }

    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = href;
    link.addEventListener('load', () => {
      link.dataset.loaded = 'true';
      resolve();
    }, { once: true });
    link.addEventListener('error', () => reject(new Error(`旧样式加载失败：${href}`)), { once: true });
    document.head.append(link);
  })));
}

export function loadLegacyRuntime(): Promise<void> {
  if (window.__verminobleLegacyRuntime) return window.__verminobleLegacyRuntime;

  window.ADMIN_AJAX_URL = '/';
  document.body.dataset.component = 'MobileResize';

  const documentReady = document.readyState === 'complete'
    ? Promise.resolve()
    : new Promise<void>((resolve) => window.addEventListener('load', () => resolve(), { once: true }));

  window.__verminobleLegacyRuntime = Promise.all([documentReady, loadLegacyStyles()])
    .then(() => new Promise<void>((resolve, reject) => {
      const existingScript = document.getElementById(legacyScriptId) as HTMLScriptElement | null;
      if (existingScript) {
        if (existingScript.dataset.loaded === 'true') {
          resolve();
          return;
        }
        existingScript.addEventListener('load', () => resolve(), { once: true });
        existingScript.addEventListener('error', () => reject(new Error('旧体验运行时加载失败。')), { once: true });
        return;
      }

      const script = document.createElement('script');
      script.id = legacyScriptId;
      script.src = '/wp-content/themes/davidwhyte/app.js';
      script.async = true;
      script.addEventListener('load', () => {
        script.dataset.loaded = 'true';
        resolve();
      }, { once: true });
      script.addEventListener('error', () => reject(new Error('旧体验运行时加载失败。')), { once: true });
      document.body.append(script);
    }));

  return window.__verminobleLegacyRuntime;
}

export function syncLegacyBootState(boot: BootState): void {
  window.loaderProgress = boot.progress;
}
