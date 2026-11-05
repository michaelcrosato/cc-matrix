// The headless harness: the engine and every game file in manifest order, in one vm context (as game/test.mjs does).
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
const root = new URL('../../', import.meta.url);
export function boot(o = {}) {
  const ctx = { console: o.quiet === false ? console : { log() {}, warn() {}, error: console.error, info() {} }, setTimeout, clearTimeout, setInterval, clearInterval, performance, URL, TextEncoder };
  ctx.window = ctx; ctx.addEventListener = () => {}; ctx.removeEventListener = () => {}; ctx.location = { hash: o.hash || '', search: o.search || '', href: 'file:///test/index.html', pathname: '/test/index.html' };
  const mem = new Map(); ctx.localStorage = { getItem: k => mem.has(k) ? mem.get(k) : null, setItem: (k, v) => { mem.set(k, String(v)); }, removeItem: k => mem.delete(k), key: i => [...mem.keys()][i] || null, get length() { return mem.size; }, clear: () => mem.clear() };
  if (o.aihub) ctx.AIHub = o.aihub;
  if (o.env) Object.assign(ctx, o.env);
  vm.createContext(ctx);
  vm.runInContext(readFileSync(new URL('engine/my-3d2dge.js', root), 'utf8'), ctx, { filename: 'my-3d2dge.js' });
  const files = JSON.parse(readFileSync(new URL('src/manifest.json', root), 'utf8'));
  for (const f of files) vm.runInContext(readFileSync(new URL('src/' + f, root), 'utf8'), ctx, { filename: f });
  const E = ctx.My3D2dge, OB = ctx.OB, game = OB.game;
  return { ctx, E, OB, game, I: game.input, snap: () => game.debug.snapshot && game.debug.snapshot() };
}
/** a race in a fresh context: returns { OB, game, race } with the scene running */
export function raceIn(cfg, o = {}) {
  const B = boot(o); const { OB, game } = B;
  game.advance(.1);
  const race = OB.Race.create(Object.assign({ mode: 'arcade', noIntro: true, seed: 5 }, cfg));
  if (o.go !== false) { race.phase = 'race'; race.phaseT = 0; for (const d of race.drivers) d.stageT0 = 0; }
  return Object.assign(B, { race });
}
/** step a race (not the scene) for s seconds of 1/120 steps, or until fn() is true */
export function run(race, s, until) { const n = Math.round(s * 120); for (let i = 0; i < n; i++) { race.step(1 / 120); if (until && until()) return i / 120; if (race.phase === 'done') return i / 120; } return s; }
