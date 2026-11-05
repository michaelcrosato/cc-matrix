// The headless loader: the engine, the new modules and the game in one vm context, with stand-ins for the page.
import vm from 'node:vm';
import { gameSource, engineFiles, where } from '../../build/lib.mjs';
let cached = null;
const compiled = () => cached || (cached = { eng: engineFiles().map(([f, s]) => new vm.Script(s, { filename: f })), game: (() => { const g = gameSource(); return { script: new vm.Script(g.code, { filename: 'game.js' }), map: g.map }; })() });
/** load({ hash, touchOnly, hub, storage, quiet }) -> { E, game, D, I, step, until, ctx } */
export function load(o = {}) {
  const C = compiled(), storage = o.storage || new Map();
  const ls = { getItem: k => storage.has(k) ? storage.get(k) : null, setItem: (k, v) => storage.set(k, String(v)), removeItem: k => storage.delete(k), clear: () => storage.clear(), key: i => [...storage.keys()][i] || null, get length() { return storage.size; } };
  const mq = q => ({ matches: o.touchOnly ? /coarse/.test(q) && !/any-pointer: fine/.test(q) : /fine/.test(q), addEventListener() {}, removeEventListener() {} });
  const ctx = { console: o.quiet === false ? console : { log() {}, warn() {}, error: (...a) => (ctx.__errors = ctx.__errors || []).push(a.join(' ')), info() {} }, localStorage: ls,
    location: { hash: o.hash || '', search: o.search || '', pathname: '/bbho.html', href: 'file:///bbho.html' + (o.hash || '') }, matchMedia: mq, navigator: { userAgent: 'node', maxTouchPoints: o.touchOnly ? 5 : 0, getGamepads: () => [] },
    setTimeout, clearTimeout, performance: { now: () => 0 }, structuredClone, __TEST__: true };
  if (o.hub) ctx.AIHub = o.hub;
  vm.createContext(ctx);
  for (const s of C.eng) s.runInContext(ctx);
  C.game.script.runInContext(ctx);
  const E = ctx.My3D2dge, game = E.current, D = game.debug, I = game.input;
  const step = s => game.advance(s);
  const until = (fn, max = 60, dt = .1) => { for (let t = 0; t < max; t += dt) { if (fn()) return true; game.advance(dt); } return !!fn(); };
  const errs = () => game.errors.map(e => e.where + ': ' + e.message + (e.stack ? ' @ ' + mapStack(e.stack, C.game.map) : '')).concat(ctx.__errors || []);
  return { E, game, D, I, step, until, ctx, errs, storage };
}
function mapStack(st, map) { const m = /game\.js:(\d+)/.exec(String(st)); return m ? where(map, +m[1]) : String(st).split('\n')[1] || ''; }
