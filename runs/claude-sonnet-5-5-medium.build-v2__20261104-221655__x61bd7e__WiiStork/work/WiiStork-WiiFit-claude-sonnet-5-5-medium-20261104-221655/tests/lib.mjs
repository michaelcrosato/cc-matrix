import vm from 'node:vm'; import { readFileSync, existsSync } from 'node:fs';
import { FILES } from '../build.mjs';
const R = f => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
export function loadGame(o) {
  o = o || {};
  const store = {};
  const ctx = { console: { log() {}, info() {}, warn() {}, error: console.error }, addEventListener() {}, removeEventListener() {}, location: { hash: o.hash || '' }, setTimeout: (f, t) => 0, clearTimeout() {}, __noStart: true, localStorage: { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } } };
  ctx.window = ctx; ctx.self = ctx; ctx.G = { ABOUT: JSON.parse(R('exit-interview.json')) }; vm.createContext(ctx);
  if (o.fake) ctx.AIHub = o.fake;
  const files = FILES.filter(f => existsSync(new URL('../' + f, import.meta.url)));
  for (const f of files) {
    vm.runInContext(R(f), ctx, { filename: f });
    if (f === 'engine/my-3d2dge.js') vm.runInContext('{ const G0 = My3D2dge.Game; My3D2dge.Game = class extends G0 { constructor(op) { super(Object.assign({}, op, { draw: ' + (o.draw !== false) + ', loop: false })); } }; }', ctx);
  }
  const E = ctx.My3D2dge, G = ctx.G; E.store && E.store.clear && E.store.clear();
  ctx.__noStart = false; G.start(); const game = E.current || G.game; game.fadeTime = 0;
  return { ctx, E, G, game, store };
}
export const adv = (game, s) => game.advance(s);
