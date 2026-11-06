// Trauma Central: Second Stitch. Boot: a hub session if the hub opened us, the normal game otherwise.
// Controls: stick or mouse moves the instrument; R2 or left click uses it; right stick or 1-8 picks a tool;
// L1 or Shift steadies; L2 or Space is the gift; Options or Esc pauses.
import { Engine, PALETTE, withUrlOptions } from './pixel-engine.js';
import { App } from './src/app.js';
import { SLUG } from './src/core/meta.js';
import { TitleStage } from './src/stages/title.js';
import { routeFromUrl } from './src/stages/router.js';

export const createGame = () => new TitleStage();

const BASE_OPTIONS = { aspect: 'fill', touch: false, background: PALETTE.ink, camera: { preset: 'fixed', position: [0, 6, 8], target: [0, 1, 0], fov: 40, minZoom: 1, maxZoom: 1 } };

async function runStandalone() {
  const touchOnly = typeof matchMedia === 'function' && !matchMedia('(any-pointer: fine)').matches && navigator.maxTouchPoints > 0 && !Array.from(navigator.getGamepads?.() ?? []).some(Boolean);
  if (!navigator.gpu) {
    const div = document.getElementById('app');
    div.innerHTML = '<div style="color:#f4f4f4;font:20px monospace;padding:40px">This game needs a browser with WebGPU (a recent Chrome or Edge, Safari 26, or Firefox 141 on Windows).</div>';
    return;
  }
  const first = routeFromUrl() ?? createGame();
  App.touchOnly = touchOnly;
  await Engine.start(first, withUrlOptions({ ...BASE_OPTIONS, container: document.getElementById('app'), settings: { button: touchOnly ? 'top-right' : false, key: SLUG }, camera: first.cameraConfig ?? BASE_OPTIONS.camera }));
  if (touchOnly) (await import('./src/ui/touchgate.js')).showTouchGate(App);
}

async function main() {
  if (window.AIHub?.active) {
    const info = await window.AIHub.connect({ mode: 'shared-world', seats: [1, 4], card: true });
    if (info) {
      const { runSession } = await import('./src/net/session.js');
      runSession(info, { Engine, BASE_OPTIONS });
      return;
    }
  }
  await runStandalone();
}

if (typeof document !== 'undefined') main();
