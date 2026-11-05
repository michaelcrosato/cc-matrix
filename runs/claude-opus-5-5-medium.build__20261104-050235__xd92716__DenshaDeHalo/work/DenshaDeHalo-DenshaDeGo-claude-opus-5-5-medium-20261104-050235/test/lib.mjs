// Loads the engine, rail.js and the game's src/*.js into a Node vm with stand-ins for the page's globals.
import vm from 'node:vm';
import { readFileSync, readdirSync } from 'node:fs';
const root = new URL('../', import.meta.url);
export const SRC = () => readdirSync(new URL('src/', root)).filter(f => f.endsWith('.js')).sort();
export function load(o = {}) {
  const mem = new Map();
  const ctx = {
    console: { log: o.quiet === false ? console.log : () => {}, info() {}, warn: o.warn ? console.warn : () => {}, error: console.error },
    location: { hash: o.hash || '', search: o.search || '' }, addEventListener() {}, removeEventListener() {},
    navigator: { maxTouchPoints: o.touch ? 5 : 0, getGamepads: () => [], userAgent: 'node' },
    localStorage: { getItem: k => mem.has(k) ? mem.get(k) : null, setItem: (k, v) => mem.set(k, String(v)), removeItem: k => mem.delete(k) },
    setTimeout, clearTimeout, performance: { now: () => 0 }
  };
  if (o.touch) ctx.matchMedia = q => ({ matches: q.includes('coarse') ? true : q.includes('fine') ? false : false, addEventListener() {} });
  if (o.hub) ctx.AIHub = o.hub;
  ctx.window = ctx; vm.createContext(ctx);
  const files = ['engine/my-3d2dge.js', 'engine/modules/rail.js', ...SRC().map(f => 'src/' + f)];
  for (const f of files) vm.runInContext(readFileSync(new URL(f, root), 'utf8'), ctx, { filename: f });
  const E = ctx.My3D2dge, DH = ctx.DH, game = DH.game;
  return { E, DH, game, I: game && game.input, ctx, mem };
}
