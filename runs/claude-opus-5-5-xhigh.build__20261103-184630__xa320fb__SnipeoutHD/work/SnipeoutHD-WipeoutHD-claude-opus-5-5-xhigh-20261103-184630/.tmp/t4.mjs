import { load } from '../tests/lib/vm.mjs';
const { SN } = load();
const cls = process.argv[2] || 'FLARE';
const used = {}, picked = {}; let elims = 0, races = 0;
for (const id of SN.TRACK_ORDER) for (const seed of [1, 2]) {
  const T = SN.getTrack(id);
  const R = new SN.Race({ track: T, mode: 'race', cls, laps: 3, seed, entrants: SN.field({ humans: [] }), intro: false, rules: { rubberBand: false } });
  let steps = 0; const hitsBy = {};
  while (R.state !== 'results' && steps < 120 * 400) { R.step(1/120); steps++; for (const e of R.events) { if (e.t === 'fire') used[e.weapon] = (used[e.weapon] || 0) + 1; if (e.t === 'pickup') picked[e.weapon] = (picked[e.weapon] || 0) + 1; if (e.t === 'elim') elims++; if (e.t==='hit') hitsBy[e.weapon]=(hitsBy[e.weapon]||0)+1; } if (R.state === 'racing' && R.ships.every(s => s.finished || s.dnf)) R.seal(); }
  races++;
  const res = R.results();
  console.log(id, seed, 't', R.t.toFixed(1), 'dnf', res.filter(r => r.dnf).length, 'est', res.filter(r=>r.estimated).length, 'hits', JSON.stringify(hitsBy), 'energy', R.ships.map(s=>Math.round(s.energy)).join(','));
}
console.log('fired', JSON.stringify(used)); console.log('picked', JSON.stringify(picked)); console.log('elims', elims, 'races', races);
