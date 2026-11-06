import { Engine, withUrlOptions } from '../pixel-engine.js';
import { LOOK } from './core/look.js';
import { createGame } from './game.js';
import { hubSession } from './net/session.js';

const OPTIONS = {
  camera: { preset: 'first', fov: 62 },
  look: LOOK,
  touch: false,
  debugKeys: false,
  settings: { button: false, key: false },
};

if (typeof window !== 'undefined') {
  window.addEventListener('keydown', (ev) => {
    const answer = window.__cardAnswer;
    if (!answer) return;
    if (ev.key === 'Enter') answer('ready');
    if (ev.key === 'm' || ev.key === 'M') answer('more');
  });
  window.addEventListener('pointerup', () => {
    const game = window.__GAME__;
    if (!game || (game.mode !== 'play' && game.mode !== 'round')) return;
    const canvas = document.querySelector('#app canvas');
    if (!canvas || document.pointerLockElement) return;
    const pending = canvas.requestPointerLock?.();
    if (pending && typeof pending.catch === 'function') pending.catch(() => {});
  });
}

async function boot() {
  const hub = typeof window !== 'undefined' ? window.AIHub : null;
  let info = null;
  if (hub && hub.active) {
    try {
      info = await hub.connect({ mode: 'shared-world', seats: [1, 4], card: true });
    } catch (err) {
      hub.fail(String(err && err.message || err));
      return;
    }
  }
  if (info) {
    const session = hubSession(info);
    window.__cardAnswer = (what) => session.answer(what);
    const game = createGame({ session });
    if (info.server) {
      const engine = await Engine.headless(game, { seed: info.seed });
      setInterval(() => engine.step(6, 1 / 60), 100);
      return;
    }
    if (!navigator.gpu) {
      hub.fail('This game needs WebGPU');
      return;
    }
    try {
      await Engine.start(game, withUrlOptions({ ...OPTIONS, container: document.getElementById('app'), seed: info.seed }));
    } catch (err) {
      hub.fail(String(err && err.message || err));
    }
    return;
  }
  const game = createGame();
  await Engine.start(game, withUrlOptions({ ...OPTIONS, container: document.getElementById('app') }));
}

boot();
