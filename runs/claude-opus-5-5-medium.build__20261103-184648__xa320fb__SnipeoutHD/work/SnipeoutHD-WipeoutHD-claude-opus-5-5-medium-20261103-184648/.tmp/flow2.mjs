import { load } from '../tests/lib/vm.mjs';
const ctx = load(), E = ctx.My3D2dge, g = E.current, SN = ctx.SN, I = g.input;
const err = () => g.errors.map(e => e.message + ' @' + (e.stack || '').split('\n').slice(1, 3).join(' ')).join('\n');
const bot = () => { const R = SN.scenes.race.race; if (!R || g.sceneName !== 'race') return; for (const h of R.humans) { const c = SN.AI.controls(h, R, { skill: 1 }); Object.assign(SN.vpad[h.player], c); } };
const run = (secs) => { for (let k = 0; k < 120 * secs && g.sceneName === 'race'; k++) { bot(); g.advance(1 / 120); } };
g.advance(1);
for (const setup of [{ mode: 'timetrial', track: 'karakum', cls: 'spark', laps: 3 }, { mode: 'hotlap', track: 'meridian', cls: 'flare' }, { mode: 'snipeout', track: 'solenne', cls: 'flare', target: 6 }, { mode: 'overclock', track: 'solenne', cls: 'spark' }, { mode: 'academy', track: 'solenne', cls: 'spark' }]) {
  g.go('loading', { setup: Object.assign({ team: 'kestrel', pilot: 'ingrid', intro: false }, setup) }); g.advance(1.5);
  const R = SN.scenes.race.race;
  if (setup.mode === 'hotlap') { run(60); R.endRun(); }
  if (setup.mode === 'academy') { for (let k = 0; k < 40 && g.sceneName === 'race'; k++) { if (SN.Academy.phase === 'card') { I.tap('confirm'); g.advance(.1); } run(5); } }
  else run(setup.mode === 'overclock' ? 30 : 400);
  if (setup.mode === 'overclock' && g.sceneName === 'race') { R.endRun(); run(5); }
  g.advance(3);
  console.log(setup.mode, '->', g.sceneName, 'state', R.state, 'zone', R.zone, 'pts', R.humans[0].points, 'lap', R.humans[0].lap, 'best', R.humans[0].bestLap.toFixed(1), setup.mode === 'academy' ? 'drill ' + SN.Academy.i + ' passed ' + SN.Academy.passed + ' retries ' + SN.Academy.retries : '', 'errors', g.errors.length);
}
console.log(err());
