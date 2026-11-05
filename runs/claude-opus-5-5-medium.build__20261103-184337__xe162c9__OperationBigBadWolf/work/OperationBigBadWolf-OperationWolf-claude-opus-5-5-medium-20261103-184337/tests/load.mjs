// Loads the engine and the game's sources (manifest order) into a node:vm context, as the handoff's game/test.mjs does.
import vm from 'node:vm';
import { readFileSync, readdirSync } from 'node:fs';
const root = new URL('../', import.meta.url);
export function load(o = {}) {
  const store = {};
  const ctx = { console, setTimeout, clearTimeout, performance: { now: () => 0 }, ...o.globals };
  vm.createContext(ctx);
  const man = JSON.parse(readFileSync(new URL('manifest.json', root), 'utf8'));
  const files = o.files || man.scripts.filter(f => !f.startsWith('hub/'));
  for (const f of files) {
    if (o.stopAt && f.includes(o.stopAt)) break;
    vm.runInContext(readFileSync(new URL(f, root), 'utf8'), ctx, { filename: f });
  }
  return ctx;
}
