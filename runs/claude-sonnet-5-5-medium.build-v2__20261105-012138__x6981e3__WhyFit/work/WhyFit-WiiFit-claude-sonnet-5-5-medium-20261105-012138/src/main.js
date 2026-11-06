// Boot: session check, Engine.start, first scene.
import { Engine, withUrlOptions, PALETTE } from '../pixel-engine.js';
import { app } from './app.js';
import { registerAll } from './scenes/index.js';
import { TITLE } from './data/title.js';
import { Net } from './core/net.js';
import creditsText from '../CREDITS.md';

async function main() {
  registerAll(app);
  const AIHub = globalThis.AIHub;
  let info = null;
  if (AIHub?.active) info = await AIHub.connect({ mode: 'ghost', seats: [1, 4], card: true });
  app.session = info;
  if (info) app.net = new Net(app);
  app.creditsText = creditsText;
  const hasPad = typeof navigator !== 'undefined' && navigator.getGamepads ? [...navigator.getGamepads()].some(Boolean) : false;
  const touchOnly = !info && typeof matchMedia !== 'undefined' && matchMedia('(hover: none) and (pointer: coarse)').matches && !hasPad;
  app.touchOnly = touchOnly;
  const first = app.make(info ? 'card' : 'title', {});
  try {
    const engine = await Engine.start(first, withUrlOptions({
      container: document.getElementById('app'), aspect: 'fill', touch: false,
      settings: { button: touchOnly ? 'top-right' : false }, quality: info ? 'medium' : 'high',
      seed: info ? info.seed : 1, background: PALETTE.sky, camera: first.camera ?? first.constructor.camera,
    }));
    app.attach(engine);
    if (info) AIHub.ready();
  } catch (e) {
    const msg = String(e?.message ?? e);
    if (info && AIHub) AIHub.fail(msg);
    console.error('Failed to start: ' + msg);
  }
}
if (typeof document !== 'undefined') main();
export { TITLE };
