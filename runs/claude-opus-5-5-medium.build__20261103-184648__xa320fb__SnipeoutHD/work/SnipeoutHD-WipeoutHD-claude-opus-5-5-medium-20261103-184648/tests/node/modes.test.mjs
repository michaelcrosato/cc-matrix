import { load } from '../lib/vm.mjs';
import { test, check, done, runRace, errs, academyBot } from '../lib/t.mjs';
const ctx = load(), SN = ctx.SN, g = ctx.My3D2dge.current, I = g.input;
g.advance(.5);
const start = (setup) => { g.go('loading', { setup: Object.assign({ team: 'kestrel', pilot: 'ingrid', intro: false }, setup) }); g.advance(1.2); return SN.scenes.race.race; };
await test('time trial and its ghost', () => {
  const R = start({ mode: 'timetrial', track: 'karakum', cls: 'spark', laps: 3 }); check(R && R.mode === 'timetrial' && R.ships.length === 1, 'solo, three laps');
  runRace(ctx, 300); g.advance(.5); check(g.sceneName === 'results', 'reaches the results'); const key = 'karakum/spark/timetrial'; check(!!SN.save.data.ghosts[key], 'a ghost saved on a new best');
  const R2 = start({ mode: 'timetrial', track: 'karakum', cls: 'spark', laps: 3 }); runRace(ctx, 20); const gl = SN.scenes.race.vw.ghostList; check(SN.scenes.race.ghost && SN.scenes.race.ghost.data.length > 100, 'the ghost loads on the next run');
  const me = R2.humans[0], gp = SN.scenes.race.ghostPose; check(gp && Math.abs(gp.p - me.p) < 40 * 16, 'the ghost plays back near the bot (same line)', gp && [gp.p, me.p]);
  g.go('menu'); g.advance(.5);
});
await test('hot lap', () => { const R = start({ mode: 'hotlap', track: 'meridian', cls: 'flare' }); check(SN.Ship.speed(R.humans[0]) > 1000, 'a flying start'); runRace(ctx, 50); check(R.humans[0].bestLap < 60, 'a lap counts', R.humans[0].bestLap); R.endRun(); g.advance(4); check(g.sceneName === 'results', 'End run finishes'); });
await test('snipeout', () => { const R = start({ mode: 'snipeout', track: 'solenne', cls: 'flare', target: 5 }); runRace(ctx, 300); check(R.ships.some(s => s.points >= 5) || R.t >= 299, 'someone reaches the target', R.ships.map(s => s.points)); check(g.sceneName === 'results', 'ends'); });
await test('overclock', () => { const R = start({ mode: 'overclock', track: 'solenne', cls: 'spark' }); const zs = []; runRace(ctx, 40, { until: () => { for (const e of R.events) if (e.t === 'zone') zs.push(e.n); return false; } }); check(zs.length >= 2 && R.zone >= 3, 'zones advance every 12 s', zs); const me = R.humans[0]; SN.Ship.damage(me, 500, 'wall', null, R); g.advance(4); check(g.sceneName === 'results', 'the run ends at 0 energy'); });
await test('academy: the bot passes the drills', () => {
  const R = start(Object.assign(SN.Academy.setup(), {})), A = SN.Academy, bot = academyBot(ctx);
  for (let k = 0; k < 400 && g.sceneName === 'race'; k++) { if (A.phase === 'card') { I.tap('confirm'); g.advance(.05); } runRace(ctx, 1, bot); }
  check(A.passed === 11, 'all 11 drills passed', { passed: A.passed, at: A.d && A.d.id, retries: A.retries });
  check(A.retries <= 6, 'few retries', A.retries);
});
await test('versus split screen', () => {
  g.go('menu'); g.advance(.5); if (g.players.length < 2) g.addPlayer({ keys: 'right' });
  const R = start({ mode: 'versus', vmode: 'race', track: 'solenne', cls: 'spark', laps: 1, players: [{ team: 'kestrel', pilot: 'ingrid' }, { team: 'volta', pilot: 'luca' }] });
  check(R.humans.length === 2 && g.viewports.length === 2, 'two humans, two viewports', g.viewports.length);
  runRace(ctx, 120); check(R.humans.every(h => h.finished), 'both finish', R.humans.map(h => h.lap));
  check(g.players[1].label('thrust', 'keyboard') !== g.players[0].label('thrust', 'keyboard'), 'half-keyboards: different keys', [g.players[0].label('thrust', 'keyboard'), g.players[1].label('thrust', 'keyboard')]);
  g.advance(5); g.go('menu'); g.advance(.5); g.removePlayer(g.players[1]);
});
check(!g.errors.length, 'no errors', errs(g));
done();
