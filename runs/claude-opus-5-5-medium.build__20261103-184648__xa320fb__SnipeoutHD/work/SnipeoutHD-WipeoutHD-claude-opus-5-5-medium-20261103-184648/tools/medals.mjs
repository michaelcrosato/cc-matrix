// Measures the player bot's times (skill 1, no rubber band, solo) per track and class and writes the medal targets:
// gold = best x 1.04, silver x 1.10, bronze x 1.20 (TIME TRIAL: 3 laps; HOT LAP: 1 lap) -> src/12-data-medals.js
import { load } from '../tests/lib/vm.mjs';
import { writeFileSync } from 'node:fs';
const ctx = load(), SN = ctx.SN, DT = 1 / 120, out = {};
for (const id of SN.TRACK_IDS) { out[id] = {}; for (const c of SN.CLASSES) {
  let bestT = 1e9, bestL = 1e9;
  for (const seed of [1, 2]) {
    const R = new SN.Race({ track: id, mode: 'timetrial', cls: c.id, laps: 3, seed, entrants: [{ pilot: 'ingrid', team: 'kestrel', control: 'human', player: 0 }], intro: false });
    R.getHuman = sh => SN.AI.controls(sh, R, { skill: 1, weapons: false });
    for (let i = 0; i < 120 * 400 && !R.humans[0].finished; i++) R.step(DT);
    const me = R.humans[0]; if (me.finished) bestT = Math.min(bestT, me.finishTime); bestL = Math.min(bestL, me.bestLap);
  }
  const f = [1.04, 1.10, 1.20], r = x => Math.round(x * 10) / 10;
  out[id][c.id] = { tt: f.map(k => r(bestT * k)), lap: f.map(k => r(bestL * k)), bot: [r(bestT), r(bestL)] };
  console.log(id, c.id, 'bot', bestT.toFixed(1), bestL.toFixed(1));
} }
writeFileSync(new URL('../src/12-data-medals.js', import.meta.url), '// Medal targets measured by tools/medals.mjs (the player bot at skill 1: gold = its best x 1.04, silver x 1.10, bronze x 1.20)\n(() => { globalThis.SN.MEDAL_TIMES = ' + JSON.stringify(out) + '; })();\n');
console.log('wrote src/12-data-medals.js');
