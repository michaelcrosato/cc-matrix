// shared test helpers: a fresh game in a node:vm context (the page's scripts in its order), a seeded Math.random,
// fixed-step advancing, a bot that plays a human seat through the real input actions
import vm from 'node:vm'; import { readFileSync } from 'node:fs';
const root = new URL('../', import.meta.url);
export const read = f => readFileSync(new URL(f, root), 'utf8');
const SRC = { client: read('vendor/aihub-session.js'), engine: read('engine/my-3d2dge.js'), game: read('build/game.js') };
export function fresh(o = {}) {
  const store = {}, log = [];
  const ctx = { console: { log() {}, info() {}, warn: (...a) => log.push(a.join(' ')), error: (...a) => log.push(a.join(' ')) }, addEventListener() {}, removeEventListener() {}, location: { hash: o.hash || '' },
    navigator: { maxTouchPoints: o.touch ? 5 : 0, getGamepads: () => [] }, matchMedia: q => ({ matches: o.touch ? false : true, addEventListener() {} }),
    localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } }, setTimeout, clearTimeout };
  ctx.window = ctx; vm.createContext(ctx);
  if (o.hub) ctx.AIHub = o.hub; else vm.runInContext(SRC.client, ctx, { filename: 'session.js' });
  vm.runInContext(SRC.engine, ctx, { filename: 'engine.js' });
  vm.runInContext('Math.random = My3D2dge.rng(' + (o.seed || 7) + ')', ctx);
  vm.runInContext(SRC.game, ctx, { filename: 'game.js' });
  const bb = ctx.__bb, game = bb.game;
  game.advance(.5);
  const T = { ctx, bb, game, S: bb.S, I: game.input, log, store,
    step: (s = 1 / 120) => game.advance(s),
    until(fn, max = 60, dt = .05) { for (let t = 0; t < max; t += dt) { if (fn()) return true; game.advance(dt); } return !!fn(); },
    tap(a, I = game.input) { I.tap(a); game.advance(1 / 60); },
    scene: () => game.sceneName, snap: () => game.debug.snapshot(), errors: () => game.errors.map(e => e.message + ' @ ' + String(e.stack || '').split('\n')[1]) };
  return T;
}
/** a bot holding a human's seat: each step it asks a brain what it would do and presses the real actions */
export function botStep(T, slot = 0) {
  const { bb, S } = T, p = S.players[slot], I = p && p.human; if (!p || !I) return;
  if (!p.botBrain) p.botBrain = bb.newBrain(p, 'allstar');
  const save = p.cmd, br = p.brain; p.cmd = bb.emptyCmd(); p.brain = p.botBrain; p.brain.diff = 'allstar';
  bb.brainStep(p, false); const c = p.cmd; p.cmd = save; p.brain = br;
  const hold = (a, on) => { if (!!I.down(a) !== !!on) I.hold(a, !!on); };
  hold('right', c.mx > .35); hold('left', c.mx < -.35); hold('down', c.my > .35); hold('up', c.my < -.35);
  hold('turbo', c.tD); hold('shoot', c.sD || c.sP);
  if (c.pP) I.tap('pass'); if (c.vP) I.tap('shove'); if (c.oP) I.tap('oop');
}
export function release(T) { for (const a of ['right', 'left', 'up', 'down', 'turbo', 'shoot', 'pass', 'shove', 'oop', 'confirm']) T.I.hold(a, false); }
