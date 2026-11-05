// Loads the engine and the built game in Node (headless: no screen, sound or DOM), with the page's globals stubbed.
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
const root = new URL('../', import.meta.url);
export function load(hash = '', o = {}) {
  const logs = [];
  const ctx = { console: { log: (...a) => logs.push(a.join(' ')), info() {}, warn: (...a) => logs.push('WARN ' + a.join(' ')), error: (...a) => logs.push('ERR ' + a.join(' ')) }, addEventListener() {}, location: { hash, search: '' } };
  ctx.window = ctx;
  if (o.hub) ctx.AIHub = o.hub;
  if (o.navigator) ctx.navigator = o.navigator;
  if (o.matchMedia) ctx.matchMedia = o.matchMedia;
  vm.createContext(ctx);
  vm.runInContext(readFileSync(new URL('vendor/my-3d2dge.js', root), 'utf8'), ctx, { filename: 'my-3d2dge.js' });
  vm.runInContext(readFileSync(new URL('dist/game.js', root), 'utf8'), ctx, { filename: 'game.js' });
  const E = ctx.My3D2dge, game = E.current, I = game.input, dbg = game.debug;
  const t = {
    E, game, I, dbg, ctx, logs,
    snap: () => dbg.snapshot(),
    adv: s => game.advance(s),
    tap: (a, s = .05) => { I.tap(a); game.advance(s); },
    hold: (a, s) => { I.hold(a); game.advance(s); I.hold(a, false); },
    // close every dialog page by pressing confirm until it is gone
    talkThrough: (max = 200) => { let n = 0; while ((dbg.talk.open || n < 2) && n < max) { I.tap('confirm'); game.advance(.06); if (dbg.talk.typing) { I.tap('confirm'); game.advance(.06); } n++; } return n; },
    walkTo: (x, y, max = 12) => { const h = dbg.level().hero; let k = 0; while (Math.hypot(h.x - x, h.y - y) > 8 && k < max * 120) { const dx = x - h.x, dy = y - h.y; h.ctl; dbg.teleport(h.x + Math.sign(dx) * Math.min(Math.abs(dx), 2), h.y + Math.sign(dy) * Math.min(Math.abs(dy), 2)); game.advance(1 / 120); k++; } },
    errors: () => game.errors.map(e => (e.where || '') + ': ' + (e.message || e)),
  };
  return t;
}
let failed = 0, passed = 0;
export function check(what, ok, detail = '') { console.log((ok ? 'ok   ' : 'FAIL ') + what + (ok ? '' : ': ' + detail)); if (ok) passed++; else failed++; }
export function done() { console.log(failed ? `${failed} failed, ${passed} passed` : `all ${passed} checks passed`); process.exit(failed ? 1 : 0); }
