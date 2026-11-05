// The headless loader: the engine and the built game run in a vm context with no screen, sound or DOM (new E.Game is
// headless in Node). It returns the engine, the game, the game's BZ namespace (through game.debug.BZ) and the context.
// loadWithHub(mock) does the same with an AI Hub client (the mock stands in for session.js) present before the game loads.
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const root = new URL('../../', import.meta.url);

function make(extra = {}) {
  const ctx = Object.assign({
    console, Math, Date, JSON, Promise, setTimeout: () => 0, clearTimeout: () => 0,
    location: { hash: '', href: 'file:///dev/index.html' }, navigator: { maxTouchPoints: 0 }
  }, extra);
  vm.createContext(ctx);
  for (const f of ['engine/my-3d2dge.js', 'build/game.js']) vm.runInContext(readFileSync(new URL(f, root), 'utf8'), ctx, { filename: f });
  const E = ctx.My3D2dge, game = E.current;
  return { ctx, E, game, BZ: game.debug.BZ, snap: () => game.debug.snapshot() };
}

export function load() { return make(); }

export function loadWithHub(mock) { return make({ AIHub: mock }); }
