import { load } from '../tests/lib/vm.mjs';
const ctx = load(), SN = ctx.SN;
const tracks = process.argv[2] ? process.argv[2].split(',') : SN.TRACK_IDS, classes = process.argv[3] ? process.argv[3].split(',') : ['spark'];
for (const tr of tracks) for (const cls of classes) {
  const t0 = Date.now();
  const R = new SN.Race({ track: tr, mode: 'race', cls, laps: 3, seed: 7, entrants: SN.field([]).map(e => e), intro: false });
  let n = 0; while (R.state !== 'results' && n < 120 * 400) { R.step(1 / 120); n++; }
  const ev = {}; for (const e of R.log) ev[e.t] = (ev[e.t] || 0) + 1;
  console.log(tr, cls, 'state', R.state, 't', R.t.toFixed(1), 'steps', n, (Date.now() - t0) + 'ms');
  for (const sh of R.order) console.log('  ', sh.place, sh.name.padEnd(16), 'lap', sh.lap, 'time', sh.finishTime.toFixed(1), sh.estimated ? 'EST' : '', 'best', sh.bestLap.toFixed(1), 'resc', sh.rescues, 'walls', sh.stats.wallHits, 'E', sh.energy.toFixed(0), sh.dnf ? 'DNF' : '');
  console.log('  events', JSON.stringify(ev));
}
