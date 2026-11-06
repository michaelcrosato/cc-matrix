// Browser boot only: hub connect, touch check, Engine.start.
import { Engine, withUrlOptions } from '../pixel-engine.js';
import { createGame, LOOK } from './game.js';
import { hubSession } from './net/hubSession.js';
const OPTIONS = () => withUrlOptions({ container: document.getElementById('app'), camera: { preset: 'first', fov: 62 }, look: LOOK, touch: false, debugKeys: false, settings: { button: false, key: false }, quality: 'medium' });
const hub = window.AIHub;
const info = hub && hub.active ? await hub.connect({ mode: 'shared-world', seats: [1, 4], card: true }) : null;
window.__PIXEL_READY__?.catch?.((e) => { if (info) hub.fail(String(e?.message ?? e)); });
if (info) {
  const session = hubSession(info);
  if (info.server) {
    const game = createGame({ session, serverCopy: true });
    const e = await Engine.headless(game, {});
    hub.ready();
    setInterval(() => e.step(6, 1 / 60), 100);
  } else if (!navigator.gpu) hub.fail('This game needs WebGPU');
  else {
    try { await Engine.start(createGame({ session }), { ...OPTIONS(), seed: info.seed }); } catch (e) { hub.fail(String(e?.message ?? e)); }
  }
} else {
  await Engine.start(createGame(), OPTIONS());
}
