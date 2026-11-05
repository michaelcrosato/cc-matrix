// The headless loader: the engine and the game run in a Node vm context with no screen (game.advance drives them).
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
export function boot() {
  const errors = [];
  const con = { log: (...a) => {}, warn: (...a) => errors.push('warn: ' + a.join(' ')), error: (...a) => errors.push(a.map(x => (x && x.stack) || String(x)).join(' ')) };
  // an in-memory localStorage, so saved records (the table) work headless as they do in a browser
  const mem = new Map();
  const localStorage = { getItem: k => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: k => mem.delete(k) };
  const ctx = { console: con, Math, localStorage };
  vm.createContext(ctx);
  for (const f of [join(root, 'my-3d2dge.js'), join(root, 'game', 'game.js')]) vm.runInContext(readFileSync(f, 'utf8'), ctx, { filename: f });
  const E = ctx.My3D2dge, game = E.current;
  return { ctx, E, game, I: game.input, errors, snap: () => game.debug.snapshot() };
}
