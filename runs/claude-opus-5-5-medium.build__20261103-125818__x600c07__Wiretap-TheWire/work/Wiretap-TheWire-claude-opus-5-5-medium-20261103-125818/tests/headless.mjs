// Headless: boot, every beat for a few seconds, the attract reel, a bots-only versus round, rule checks. One line each.
import vm from 'node:vm'; import { readFileSync } from 'node:fs';
let ERR = 0, LASTERR = '';
const ctx = { console: { log: console.log, info() {}, warn() {}, error: (...a) => { ERR++; LASTERR = String(a[0]).split('\n').slice(0, 2).join(' '); } }, addEventListener() {}, location: { hash: '' }, setTimeout: (f) => f(), clearTimeout() {}, performance: { now: () => Date.now() } };
ctx.window = ctx; vm.createContext(ctx);
vm.runInContext(readFileSync('engine/my-3d2dge.js', 'utf8'), ctx);
vm.runInContext(readFileSync('dev-bundle.js', 'utf8'), ctx, { filename: 'game.js' });
const D = ctx.__wt, game = ctx.My3D2dge.current; let fails = 0;
const ok = (name, cond, extra = '') => { console.log((cond ? 'ok   ' : 'FAIL ') + name + (extra ? ' · ' + extra : '')); if (!cond) fails++; };
const errs = () => LASTERR + ' :: ' + game.errors.map(e => (e.where || '') + ' ' + (e.message || e)).slice(0, 3).join(' | ');
game.advance(1);
ok('boot to title', game.sceneName === 'title' && !game.errors.length, game.sceneName + ' ' + errs());
const only = process.argv[2];
for (const b of D.BEATS) {
  if (only && !b.id.startsWith(only)) continue;
  const n0 = ERR;
  D.Director.preset(b.ep); D.Director.start(b.id); game.advance(.2);
  for (let i = 0; i < 40; i++) { game.input.tap('confirm'); game.advance(.1); }
  ok('beat ' + b.id, ERR === n0, game.sceneName + ' ' + (ERR > n0 ? LASTERR : ''));
  D.UI.closeAll();
}
if (!only) {
  const n0 = ERR; game.go('title', {}); game.advance(.5); game.advance(10.5);
  ok('idle 10 s -> attract', D.Attract.on, game.sceneName);
  for (let i = 0; i < 95; i++) game.advance(1);
  ok('attract reel loops without errors', ERR === n0 && D.Attract.on, 'reel item ' + D.Attract.i + ' ' + errs());
  game.input.tap('confirm'); game.advance(.5); ok('any input exits attract', !D.Attract.on && game.sceneName === 'title', game.sceneName);
  const n1 = ERR;
  game.go('versus', { mode: 'local', seats: [{ id: 0, name: 'T', side: 'corner', role: 'lt' }, { id: 1, name: 'A', side: 'detail', role: 'det' }, { id: 2, name: 'B', side: 'detail', role: 'det' }, { id: 3, name: 'M', side: 'corner', role: 'lookout' }], len: 300, seed: 3 });
  for (let i = 0; i < 310; i++) game.advance(1);
  const s = D.Versus.sim; ok('versus bots round ends', !!s.over && ERR === n1, 'outcome ' + s.over + ' ev ' + s.ev + ' count ' + (s.corner.led.banked + s.corner.led.cash) + ' ledger ' + s.corner.ledgerOk() + ' ' + errs());
  ok('snapshot under 1100 bytes', JSON.stringify(s.snap()).length < 1100, JSON.stringify(s.snap()).length + ' bytes');
}
ok('no errors overall', !ERR, ERR + ' ' + errs());
process.exit(fails ? 1 : 0);
