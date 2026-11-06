// Browser boot only: hub connect, touch check, Engine.start. See PLAN section 19 for why the order matters.
import { Engine, withUrlOptions } from '../pixel-engine.js';
import { createGame, LOOK } from './game.js';
import { hubSession } from './net/hubSession.js';

const hub = window.AIHub;
const makeOptions = (extra = {}) => withUrlOptions({
  container: document.getElementById('app'),
  camera: { preset: 'first', fov: 62 },
  look: LOOK, touch: false, debugKeys: false,
  settings: { button: false, key: false },
  ...extra,
});

async function boot() {
  const info = (hub && hub.active) ? await hub.connect({ mode: 'shared-world', seats: [1, 4], card: true }) : null;
  if (info) {
    const game = createGame({ session: hubSession(info) });
    if (info.server) {
      const e = await Engine.headless(game, {});
      setInterval(() => e.step(6, 1 / 60), 100);
    } else if (!navigator.gpu) {
      hub.fail('This game needs WebGPU');
    } else {
      const started = Engine.start(game, makeOptions({ seed: info.seed }));
      started.catch((err) => hub.fail(String(err && err.message || err)));
      await started;
    }
    return;
  }
  await Engine.start(createGame({}), makeOptions());
}

boot().catch((err) => {
  if (hub && hub.active) hub.fail(String(err && err.message || err));
  else console.error(err);
});
