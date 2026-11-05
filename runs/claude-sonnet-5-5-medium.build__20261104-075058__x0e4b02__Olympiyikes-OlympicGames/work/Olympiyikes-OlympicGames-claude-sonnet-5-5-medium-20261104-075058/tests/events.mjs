// bot-plays every event headless; prints scores when OLY_VERBOSE=1
import { load } from './lib.mjs';
const ctx = load(); const O = ctx.OLY, game = O.game, I = game.input;
const verbose = !!process.env.OLY_VERBOSE;
const out = []; let fails = 0, checks = 0;
const check = (name, ok, detail = '') => { checks++; if (!ok) { fails++; out.push('FAIL ' + name + (detail ? ': ' + detail : '')); } };
game.advance(.5);
O.cheat.perfect = true;
for (const id of O.SCHEDULE_ALL()) {
  O.newMeet('single', [{ p: 0, nat: 'SUN' }], [], { qual: false, seed: 77 });
  O.go('play', { ev: id, humans: [0] }, { fade: 0 }); game.advance(.2);
  check(id + ' enters play', O.cur === 'play', O.cur);
  let n = 0; const ev = O.EV[id];
  while (O.cur === 'play' && n < 400) { game.advance(.5); n++; const sn = O.playRun; if (sn && sn.done && O.curDef.state === 'end') break; }
  const run = O.playRun; check(id + ' finishes', run && run.done, run ? 't=' + run.t.toFixed(1) : 'no run');
  if (run) { if (verbose) console.log(id.padEnd(9), 'score', run.score, 'qual', ev.qual, 'wr', ev.wr, 'cpu', ev.cpu.mean, 'note', run.note); check(id + ' beats qualifying', O.Records.better(ev, run.score, ev.qual), run.score + ' vs ' + ev.qual); }
  check(id + ' no errors', game.errors.length === 0, game.errors.map(e => e.message).slice(0, 2).join(' | '));
  game.errors.length = 0;
}
if (out.length) console.log(out.join('\n')); console.log(fails ? `${fails} of ${checks} checks FAILED` : `all ${checks} event checks passed`); process.exit(fails ? 1 : 0);
