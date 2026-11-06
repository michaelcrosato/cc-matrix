// Boot: session check, Engine.start, first scene.
import { Engine, LOOK_PRESETS, PALETTE, withUrlOptions } from '../pixel-engine.js';
import { App } from './app.js';
import { MedleyScene, registerScenes, TitleScene } from './scenes/index.js';

registerScenes();
const hasPad = () => { try { return [...(navigator.getGamepads?.() ?? [])].some(Boolean); } catch { return false; } };
const touchOnly = !!globalThis.matchMedia?.('(hover: none) and (pointer: coarse)').matches && !hasPad();
let info = null;
if (window.AIHub?.active) info = await window.AIHub.connect({ mode: 'ghost', seats: [1, 4], card: true });
App.boot = { session: info, touchOnly };
window.addEventListener('keydown', () => { App.domInput = true; if (App.touchOnly) App.touchOnly = false; });
window.addEventListener('pointerdown', () => { App.domInput = true; });
window.addEventListener('wheel', () => { App.domInput = true; }, { passive: true });
window.addEventListener('contextmenu', (e) => e.preventDefault());
const first = info ? new MedleyScene({ session: info }) : new TitleScene();
const seed = info ? info.seed : 1;
try {
  await Engine.start(first, withUrlOptions({ container: document.getElementById('app'), aspect: 'fill', touch: false, settings: { button: touchOnly ? 'top-right' : false }, quality: info ? 'medium' : 'high', seed, background: PALETTE.sky, camera: first.camera?.() }));
  if (info) window.AIHub.ready();
} catch (err) {
  console.warn('Failed to start', err?.message ?? err);
  if (info) window.AIHub.fail(String(err?.message ?? err));
}
void LOOK_PRESETS;
