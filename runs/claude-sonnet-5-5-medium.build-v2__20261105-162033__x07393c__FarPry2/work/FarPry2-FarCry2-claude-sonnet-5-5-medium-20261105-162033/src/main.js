// Browser boot only: hub connect, touch check, Engine.start.
import { Engine, withUrlOptions } from '../pixel-engine.js';
import { createGame, LOOK } from './game.js';
import { hubSession } from './net/session.js';

const OPTIONS = () => withUrlOptions({ container: document.getElementById('app'), camera: { preset: 'first', fov: 62 }, look: LOOK, touch: false, debugKeys: false, settings: { button: false, key: false } });

async function boot() {
  const A = window.AIHub;
  const info = A && A.active ? await A.connect({ mode: 'shared-world', seats: [1, 4], card: true }) : null;
  if (info) {
    const game = createGame({ session: hubSession(info) });
    if (info.server) {
      const e = await Engine.headless(game, {});
      A.ready();
      setInterval(() => e.step(6, 1 / 60), 100);
    } else if (!navigator.gpu) A.fail('This game needs WebGPU');
    else await Engine.start(game, { ...OPTIONS(), seed: info.seed });
  } else {
    await Engine.start(createGame({}), OPTIONS());
  }
}
boot().catch((err) => { console.error(err); window.AIHub?.active && window.AIHub.fail(String(err && err.message || err)); });
