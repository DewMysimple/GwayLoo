import './style.css';
import { WlopNapExperience } from './wlopNapExperience';

const root = document.querySelector<HTMLDivElement>('#app');

if (!root) {
  throw new Error('WlopNap app root is missing.');
}

root.innerHTML = `
  <main class="experience-shell">
    <canvas class="experience-canvas" aria-label="WLOP Nap watercolor reveal canvas"></canvas>
    <div class="vignette" aria-hidden="true"></div>
    <header class="intro-copy">
      <p class="eyebrow">Mouse-driven local fluid simulation</p>
      <h1>WLOP — Nap</h1>
      <p class="description">Move across the image. Pigment follows the cursor and lets the original color bloom through the cool gray wash.</p>
    </header>
    <aside class="legend" aria-live="polite">
      <span class="status-dot" data-status="loading"></span>
      <span data-status-label>Loading source image…</span>
      <button type="button" data-reset>Reset wash</button>
    </aside>
    <footer class="pipeline-note">
      <span>input</span><i>→</i><span>fluid dye</span><i>→</i><span>reveal shader</span>
    </footer>
  </main>
`;

const canvas = root.querySelector<HTMLCanvasElement>('.experience-canvas');
const resetButton = root.querySelector<HTMLButtonElement>('[data-reset]');
const statusDot = root.querySelector<HTMLSpanElement>('[data-status]');
const statusLabel = root.querySelector<HTMLSpanElement>('[data-status-label]');

if (!canvas || !resetButton || !statusDot || !statusLabel) {
  throw new Error('WlopNap interface is incomplete.');
}

const experience = new WlopNapExperience(canvas, () => {
  statusDot.dataset.status = 'ready';
  statusLabel.textContent = 'Move to reveal the pigment';
});

resetButton.addEventListener('click', () => experience.reset());
window.addEventListener('beforeunload', () => experience.dispose(), { once: true });
