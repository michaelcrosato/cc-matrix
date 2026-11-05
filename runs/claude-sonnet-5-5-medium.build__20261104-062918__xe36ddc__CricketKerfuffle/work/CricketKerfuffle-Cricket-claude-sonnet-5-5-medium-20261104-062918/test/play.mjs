import vm from 'node:vm';
import { readFileSync } from 'node:fs';
const ctx = { console, setTimeout, clearTimeout }; vm.createContext(ctx);
for (const f of ['../engine/my-3d2dge.js', '../dist/game.js']) vm.runInContext(readFileSync(new URL(f, import.meta.url), 'utf8'), ctx, { filename: f });
const E = ctx.My3D2dge, game = E.current, I = game.input, D = game.debug;
const fails = []; let n = 0;
const check = (what, ok, detail = '') => { n++; if (!ok) fails.push(what + (detail ? ': ' + detail : '')); };
const adv = s => game.advance(s);
adv(.5); check('title', D.snapshot().scene === 'title');
// quick match: p1 plays a few balls with scripted input
D.startMatch({ mode: 'quick', overs: 1, wickets: 2, diff: 1, opp: 'witt', ground: 'green', chaos: 'all', seed: 99 }); adv(1);
check('match scene', D.snapshot().scene === 'match', JSON.stringify(D.snapshot()));
let guard = 0;
while (D.snapshot().scene === 'match' && guard++ < 4000) {
  const M = D.match(); const ph = M.ph;
  if (ph === 'flight' && M.ball.phase === 'delivery' && !M.swing) {
    const pr = ctx.__noop; // swing when the ball is near
    if (M.ball.y < 410) { I.hold('down', true); I.tap(M.ball.y % 2 > 1 ? 'ground' : 'loft'); }
  } else I.hold('down', false);
  if (ph === 'setup' && M.sideBowl().ctrl === 'p1') I.tap('ground');
  if (ph === 'runup' && M.sideBowl().ctrl === 'p1') { const R = M.runup, tm = R.t - R.meterStart, p = 0.5 - 0.5 * Math.cos(2 * Math.PI * D.T('meterSpeed') * tm); if (tm > 0 && p > .44 && p < .56) I.tap('ground'); }
  if (ph === 'inplay') { I.tap('run'); I.hold('run', true); } else I.hold('run', false);
  if (ph === 'between' || ph === 'done') adv(.3); else adv(1 / 30);
  if (guard % 150 === 0) console.log(guard, M.ph, JSON.stringify(D.snapshot().m.score), JSON.stringify(D.snapshot().m.balls), M.t.toFixed(1)); if (D.snapshot().scene !== "match") break;
}
I.hold('down', false); I.hold('run', false);
adv(1);
console.log('scene after match:', D.snapshot().scene, JSON.stringify(D.snapshot().m && D.snapshot().m.score));
check('match ended into results', ['results'].includes(D.snapshot().scene), D.snapshot().scene);
check('no errors', !game.errors.length, game.errors.slice(0, 3).map(e => e.message).join(' | '));
console.log(fails.length ? fails.join('\n') : 'ok', n);
