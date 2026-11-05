import { load } from '../tests/lib/vm.mjs';
import { runRace, errs } from '../tests/lib/t.mjs';
const ctx = load(), SN = ctx.SN, g = ctx.My3D2dge.current;
g.settings.set('difficulty', process.argv[2] || 'Easy'); g.advance(.5);
for (const seed of [1, 2, 3, 4]) {
  g.go('loading', { setup: { mode: 'race', track: 'solenne', cls: 'spark', laps: 3, team: process.argv[3] || 'kestrel', pilot: process.argv[4] || 'ingrid', intro: false, seed } }); g.advance(1.5);
  const R = SN.scenes.race.race; runRace(ctx, 400);
  const me = R.humans[0]; console.log('seed', seed, 'place', me.place, 'dnf', me.dnf, 'energy', me.energy.toFixed(0), 'hits taken', R.log.filter(e => e.t === 'hit' && e.ship === me).length, 'walls', me.stats.wallHits, 'rescues', me.rescues, 'best', me.bestLap.toFixed(1), 'ai best', Math.min(...R.ships.filter(s => s !== me).map(s => s.bestLap)).toFixed(1));
}
