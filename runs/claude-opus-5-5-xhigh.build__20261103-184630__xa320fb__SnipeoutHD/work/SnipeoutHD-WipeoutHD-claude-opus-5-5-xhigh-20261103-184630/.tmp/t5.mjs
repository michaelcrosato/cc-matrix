import { load } from '../tests/lib/vm.mjs';
const { SN } = load();
const tot = {}, elimCause = {}; let pitT = 0, absorbs = 0;
const orig = SN.Ship.damage;
let cur;
SN.Ship.damage = (ship, a, cause, by, race) => { const d = orig(ship, a, cause, by, race); cur[ship.idx][cause] = (cur[ship.idx][cause] || 0) + d; tot[cause] = (tot[cause]||0) + d; return d; };
for (const id of SN.TRACK_ORDER) for (const seed of [1, 2]) {
  const T = SN.getTrack(id);
  const R = new SN.Race({ track: T, mode: 'race', cls: 'FLARE', laps: 3, seed, entrants: SN.field({ humans: [] }), intro: false, rules: { rubberBand: false } });
  cur = R.ships.map(() => ({})); let steps = 0;
  while (R.state !== 'results' && steps < 120 * 400) { R.step(1/120); steps++; for (const s of R.ships) if (s.pitting) pitT += 1/120; for (const e of R.events) { if (e.t==='absorb') absorbs++; if (e.t === 'elim') { const c = Object.entries(cur[e.ship.idx]).sort((a,b)=>b[1]-a[1])[0][0]; elimCause[c]=(elimCause[c]||0)+1; } } if (R.state === 'racing' && R.ships.every(s => s.finished || s.dnf)) R.seal(); }
}
console.log('total damage by cause', JSON.stringify(Object.fromEntries(Object.entries(tot).map(([k,v])=>[k,Math.round(v)]))));
console.log('top cause per elim', JSON.stringify(elimCause), 'pit seconds', pitT.toFixed(0), 'absorbs', absorbs);
