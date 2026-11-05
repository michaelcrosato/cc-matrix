import { load } from '../tests/lib/vm.mjs';
const { SN } = load();
const cls = process.argv[2] || 'SPARK', weapons = process.argv[3] !== 'nw';
for (const id of SN.TRACK_ORDER) {
  const T = SN.getTrack(id);
  const ent = SN.field({ humans: [] , size: 8 });
  const R = new SN.Race({ track: T, mode: 'race', cls, laps: 2, seed: 7, entrants: ent, intro: false, rules: { weapons, rubberBand: false } });
  const ev = {}; let steps = 0, rescues = {}, walls = 0;
  const t0 = Date.now();
  while (R.state !== 'results' && steps < 120 * 400) { R.step(1/120); steps++; for (const e of R.events) { ev[e.t] = (ev[e.t]||0)+1; if (e.t==='rescue') rescues[e.why]=(rescues[e.why]||0)+1; } if (R.state==='countdown') {} 
    if (R.state === 'racing' && R.ships.every(s => s.finished || s.dnf)) R.seal(); }
  const res = R.results();
  const laps = R.ships.map(s => s.laps.map(l=>l.toFixed(1)).join('/')).join(' ');
  console.log(id, cls, 'state', R.state, 't', R.t.toFixed(1), 'ms', Date.now()-t0, 'ideal', T.idealLap(cls).toFixed(1), 'laps', laps);
  console.log('  ev', JSON.stringify(ev), 'rescues', JSON.stringify(rescues), 'dnf', res.filter(r=>r.dnf).length, 'est', res.filter(r=>r.estimated).length);
}
