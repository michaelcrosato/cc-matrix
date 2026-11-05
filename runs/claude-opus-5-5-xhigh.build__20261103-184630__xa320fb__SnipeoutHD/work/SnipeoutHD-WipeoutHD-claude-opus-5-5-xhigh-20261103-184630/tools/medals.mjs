// Measures the medal times: the player bot (the AI at skill 1, no rubber band) in TIME TRIAL (3 laps) and HOT LAP (the
// best lap of 3) on every circuit and class, three craft each (Kestrel, Sora-Tek, Volta Nero); gold = best x 1.04,
// silver x 1.10, bronze x 1.20, rounded to 0.1 s. Writes them into src/07-data-tracks.js (SN.MEDAL_TIMES).
import { load } from '../tests/lib/vm.mjs';
import { readFileSync, writeFileSync } from 'node:fs';
const { SN, game } = load({ quiet: true }); await game.booted;
const dt = 1 / 120, out = {};
for (const id of SN.TRACK_ORDER) for (const cls of SN.CLASS_ORDER) for (const mode of ['timetrial', 'hotlap']) {
  let best = Infinity;
  for (const [team, pilot] of [['kestrel', 'vale'], ['soratek', 'takahara'], ['volta', 'ferrante']]) {
    const R = new SN.Race({ track: SN.getTrack(id), mode, cls, laps: mode === 'hotlap' ? 3 : 3, seed: 1, entrants: [{ pilot, team, control: 'human', pi: 0 }], intro: false, record: false });
    let n = 0;
    while (n < 120 * 400) { R.setControls(0, SN.AI.controls(R.player, R, { skill: 1, brain: 'medal' })); if (R.state === 'countdown') R.controls[0].thrust = R.stateT > 1.75 ? 1 : 0; R.step(dt); n++; if (R.player.finished || (mode === 'hotlap' && R.player.laps.length >= 3)) break; }
    const t = mode === 'hotlap' ? R.player.bestLap : R.player.finishT;
    if (isFinite(t) && t > 0) best = Math.min(best, t);
  }
  out[id + '/' + cls + '/' + mode] = [+(best * 1.04).toFixed(1), +(best * 1.10).toFixed(1), +(best * 1.20).toFixed(1)];
  console.log(id, cls, mode, best.toFixed(2), out[id + '/' + cls + '/' + mode].join(' / '));
}
const f = new URL('../src/07-data-tracks.js', import.meta.url), src = readFileSync(f, 'utf8');
const line = 'SN.MEDAL_TIMES = ' + JSON.stringify(out).replace(/\],/g, '],\n  ').replace('{', '{\n  ').replace(/\}$/, '\n}') + ';';
writeFileSync(f, src.replace(/SN\.MEDAL_TIMES = [\s\S]*?\};|SN\.MEDAL_TIMES = \{\};/, line));
console.log('wrote', Object.keys(out).length, 'medal sets');
