import { load } from '../tests/lib/vm.mjs';
const ctx = load(), SN = ctx.SN;
const agg = {}, dmg = {};
let elims = 0;
for (const tr of SN.TRACK_IDS) for (const seed of [1, 2]) {
  const R = new SN.Race({ track: tr, mode: 'race', cls: 'flare', laps: 3, seed, entrants: SN.field([]), intro: false });
  let n = 0; while (R.state !== 'results' && n < 120 * 400) { R.step(1 / 120); n++; }
  for (const e of R.log) { if (e.t === 'hit') { agg[e.weapon] = (agg[e.weapon] || 0) + 1; dmg[e.weapon] = (dmg[e.weapon] || 0) + e.dmg; } if (e.t === 'elim') elims++; }
  console.log(tr, seed, R.order.map(s => s.dnf ? 'X' : s.lap).join(''), 'resc', R.ships.reduce((a, s) => a + s.rescues, 0), 'pit?', R.ships.map(s=>s.energy.toFixed(0)).join(','));
}
console.log(agg, Object.fromEntries(Object.entries(dmg).map(([k, v]) => [k, Math.round(v)])), 'elims', elims);
