// Page entry: a Hub session opens straight into the round; otherwise the normal start.
import { Engine, withUrlOptions, PALETTE } from './engine.js';
import { createGame } from './game.js';

const touchOnly = typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0 && !matchMedia('(any-pointer: fine)').matches;
function failure(message) {
  const el = document.createElement('div');
  el.style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:#1a1c2c;color:#f4f4f4;font:20px monospace;text-align:center;padding:24px';
  el.textContent = message;
  el.id = 'no-webgpu';
  document.body.appendChild(el);
}
async function start() {
  const hub = globalThis.AIHub;
  if (hub?.active) {
    const { startRound } = await import('./net/hubStart.js');
    const started = await startRound(hub, { touchOnly });
    if (started) return;
  }
  const realNow = Date.now();
  const game = createGame({ touchOnly, realNow });
  window.addEventListener('keydown', (e) => {
    if (e.target?.tagName === 'TEXTAREA') return; // the Gate Pass box types for itself
    if (e.key === 'Tab' || e.key === 'Escape' || e.key === 'Backspace') e.preventDefault();
    window.__PIXEL_ENGINE__?.input.send({ t: 'key', key: e.key });
  });
  window.addEventListener('contextmenu', (e) => e.preventDefault());
  window.addEventListener('pointerdown', () => window.__PIXEL_ENGINE__?.input.send({ t: 'tap' }));
  try {
    const engine = await Engine.start(game, withUrlOptions({
      container: document.getElementById('app'),
      aspect: 'fixed',
      quality: 'high',
      camera: { preset: 'iso', yaw: 45, pitch: 35, zoom: 1.6, minZoom: 1.6, maxZoom: 1.6 },
      settings: { button: touchOnly ? 'top-right' : false, key: 'honk-if-you-owe' },
      touch: false, touchBar: false, background: PALETTE.ink,
    }));
    setInterval(() => engine.input.send({ t: 'now', ms: Date.now() }), 20000);
    engine.input.send({ t: 'now', ms: Date.now() });
    window.addEventListener('beforeunload', () => { game.autosave?.(); });
  } catch (err) {
    console.warn(err);
    failure(`Honk If You Owe needs WebGPU: a recent Chrome or Edge, Safari 26, or Firefox 141 on Windows. (${err?.message ?? err})`);
  }
}
if (typeof document !== 'undefined') start();
