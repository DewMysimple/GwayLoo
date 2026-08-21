const legacyScriptId = 'verminoble-legacy-runtime';

declare global {
  interface Window {
    ADMIN_AJAX_URL?: string;
    loaderProgress?: number;
    __verminobleLegacyRuntime?: Promise<void>;
  }
}

export function loadLegacyRuntime(): Promise<void> {
  if (window.__verminobleLegacyRuntime) return window.__verminobleLegacyRuntime;

  window.ADMIN_AJAX_URL = '/';
  document.body.dataset.component = 'MobileResize';

  const documentReady = document.readyState === 'complete'
    ? Promise.resolve()
    : new Promise<void>((resolve) => window.addEventListener('load', () => resolve(), { once: true }));

  window.__verminobleLegacyRuntime = documentReady.then(() => new Promise<void>((resolve, reject) => {
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
