import { load } from '../tests/lib/vm.mjs';
import { bot, drive } from '../tests/lib/bot.mjs';
const { SN, game } = load({ quiet: true }); await game.booted;
for (const god of [true, false]) for (const seed of [1, 2]) {
  SN.cheats.god = god;
  SN.flow.start({ mode: 'race', track: 'solenne', cls: 'SPARK', laps: 3, team: 'soratek', pilot: 'takahara', intro: false, seed }); game.advance(1.2);
  const R = game.debug.race(), b = bot(SN, game); let t = 0, places = [];
  while (game.debug.snapshot().scene !== 'results' && t < 300) { drive(game, [b], .5); t += .5; if (t % 15 === 0) places.push(R.player.place); }
  b.stop();
  const hits = R.player.stats; console.log('god', god, 'seed', seed, 'place', R.player.place, 'over time', places.join(','), 'dnf', R.player.dnf, 'hitsTaken dmg', Math.round(hits.damage), 'rescues', hits.rescues, 'walls', hits.walls, 'laps', R.player.laps.map(l => l.toFixed(1)).join('/'), 'AI laps', R.ships.filter(s=>s.control==='ai').map(s=>s.bestLap.toFixed(1)).join(' '));
}
