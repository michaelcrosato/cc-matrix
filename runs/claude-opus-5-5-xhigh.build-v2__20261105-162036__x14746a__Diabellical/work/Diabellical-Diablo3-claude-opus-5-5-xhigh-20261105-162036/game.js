// Diabellical: a gothic co-op action RPG. Entry point.
// Controls: stick or WASD or click to move; Cross or click to attack; face buttons, R1, R2 or right
// click and 1-4 for skills; L2 or Space to roll; L1 or Q to drink; E or Cross to use things.
import { Engine, LOOK_PRESETS, withUrlOptions } from './pixel-engine.js';
import { TITLE } from './src/data/meta.js';
import { DiabellicalGame, VIGNETTE_LOOK } from './src/modes/game.js';

export const createGame = (opts = {}) => new DiabellicalGame({ fixedSeed: 12345, noAutoStart: true, ...opts });

const isTouchOnly = () => typeof matchMedia !== 'undefined' && !matchMedia('(any-pointer: fine)').matches && (navigator.maxTouchPoints ?? 0) > 0;

export const ENGINE_OPTIONS = (touchOnly) => withUrlOptions({
  container: document.getElementById('app'),
  camera: { preset: 'iso', viewHeight: 11.5, pitch: 42, yaw: 45, minZoom: 0.5, maxZoom: 1.6 },
  aspect: 'fill', quality: 'high', touch: false,
  look: VIGNETTE_LOOK(0.3),
  settings: { button: touchOnly ? 'top-right' : false },
});

function fatal(message) {
  const app = document.getElementById('app');
  const el = document.createElement('div');
  el.style.cssText = 'position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#1a1c2c;color:#ffcd75;font:20px monospace;text-align:center;padding:24px';
  const h = document.createElement('h1');
  h.textContent = TITLE;
  const p = document.createElement('p');
  p.textContent = message;
  el.append(h, p);
  (app ?? document.body).appendChild(el);
}

async function boot() {
  const hub = typeof AIHub !== 'undefined' && AIHub.active;
  if (hub) {
    const { runHubSession } = await import('./src/net/hubflow.js');
    await runHubSession(ENGINE_OPTIONS);
    return;
  }
  const touchOnly = isTouchOnly();
  try {
    await Engine.start(new DiabellicalGame({ touchOnly }), ENGINE_OPTIONS(touchOnly));
  } catch (e) {
    fatal('This game needs WebGPU: a recent Chrome or Edge, Safari 26, or Firefox on Windows');
    if (typeof window !== 'undefined') window.__BOOT_ERROR__ = String(e?.message ?? e);
  }
}

if (typeof document !== 'undefined') await boot();

export { LOOK_PRESETS };
