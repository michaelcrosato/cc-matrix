// Loads the engine and every game module into a fresh vm context (headless: no DOM), the way the bundle runs them.
import vm from 'node:vm';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const DEV = join(dirname(fileURLToPath(import.meta.url)), '../..');
const cache = new Map();
const src = p => { if (!cache.has(p)) cache.set(p, new vm.Script(readFileSync(p, 'utf8'), { filename: p })); return cache.get(p); };

export function memStorage(init = {}) {
  const m = new Map(Object.entries(init));
  return { getItem: k => m.has(k) ? m.get(k) : null, setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), clear: () => m.clear(), key: i => [...m.keys()][i] ?? null, get length() { return m.size; }, _m: m };
}

/** o: { storage, AIHub, matchMedia, test: {...flags the game reads as DQ_TEST}, noStart } */
export function load(o = {}) {
  const ctx = { console, performance, setTimeout, clearTimeout, setInterval, clearInterval, queueMicrotask, structuredClone, TextEncoder, TextDecoder, URL };
  ctx.localStorage = o.storage || memStorage();
  if (o.AIHub) ctx.AIHub = o.AIHub;
  if (o.matchMedia) ctx.matchMedia = o.matchMedia;
  ctx.DQ_TEST = Object.assign({ headless: true }, o.test || {});
  const ei = join(DEV, '../exit-interview.json');
  ctx.DQ_ABOUT = existsSync(ei) ? JSON.parse(readFileSync(ei, 'utf8')) : null;
  vm.createContext(ctx);
  src(join(DEV, 'engine/my-3d2dge.js')).runInContext(ctx);
  for (const f of readdirSync(join(DEV, 'src')).filter(f => f.endsWith('.js')).sort()) src(join(DEV, 'src', f)).runInContext(ctx);
  const DQ = ctx.DQ, E = ctx.My3D2dge;
  return { E, DQ, game: DQ.game, ctx };
}

/** helpers bound to one loaded game */
export function helpers(L) {
  const { game, DQ } = L, I = game.input;
  return {
    run: s => game.advance(s),
    tap: (a, s = .05) => { I.tap(a); game.advance(s); },
    hold: (a, s) => { I.hold(a, true); game.advance(s); I.hold(a, false); game.advance(1 / 120); },
    snap: () => game.debug.snapshot(),
    errs: () => game.errors.map(e => e.where + ': ' + e.message).join(' | ')
  };
}
