// Boot: session check, Engine.start, first scene.
import { applyDeadzone, Engine, PALETTE, withUrlOptions } from '../pixel-engine.js';
import { App } from './app.js';
import { firstScene } from './scenes/boot.js';

const touchOnly = typeof matchMedia === 'function' && matchMedia('(hover: none) and (pointer: coarse)').matches && !(navigator.getGamepads && [...navigator.getGamepads()].some(Boolean));

function installDomListeners() {
  const mark = () => { App.device.domInput = true; };
  window.addEventListener('keydown', mark, { passive: true });
  window.addEventListener('pointerdown', mark, { passive: true });
  window.addEventListener('wheel', mark, { passive: true });
  window.addEventListener('contextmenu', (e) => e.preventDefault());
  window.addEventListener('gamepadconnected', () => { App.gamepadSeen = true; });
}

let info = null;
if (window.AIHub?.active) info = await window.AIHub.connect({ mode: 'ghost', seats: [1, 4], card: true });

App.boot({ session: info, touchOnly });
App.deadzone = (x, y) => { const v = applyDeadzone(x, y, 0.12); return Array.isArray(v) ? v : [v.x, v.y]; };
installDomListeners();

const first = firstScene(info);
const camera = first.cameraConfig?.();
try {
  const engine = await Engine.start(first, withUrlOptions({
    container: document.getElementById('app'),
    aspect: 'fill',
    touch: false,
    settings: { button: touchOnly ? 'top-right' : false },
    quality: info ? 'medium' : 'high',
    seed: info ? info.seed : 7,
    background: PALETTE.sky,
    camera,
  }));
  App.ensureInit(engine);
  if (info) window.AIHub.ready();
} catch (err) {
  if (info) window.AIHub.fail(String(err?.message ?? err));
  console.warn('[We Fit In]', err?.message ?? err);
}
