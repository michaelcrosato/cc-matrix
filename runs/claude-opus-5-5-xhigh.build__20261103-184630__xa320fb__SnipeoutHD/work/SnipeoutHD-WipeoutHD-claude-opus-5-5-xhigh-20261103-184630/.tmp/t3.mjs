import { load } from '../tests/lib/vm.mjs';
const { SN } = load();
const id = process.argv[2] || 'borealis', cls = process.argv[3] || 'SPARK';
const T = SN.getTrack(id);
const R = new SN.Race({ track: T, mode: 'race', cls, laps: 2, seed: 7, entrants: SN.field({ humans: [] }), intro: false, rules: { weapons: false, rubberBand: false } });
const dmg = R.ships.map(() => ({}));
const orig = SN.Ship.damage;
SN.Ship.damage = (ship, a, cause, by, race) => { const d = orig(ship, a, cause, by, race); dmg[ship.idx][cause] = (dmg[ship.idx][cause] || 0) + d; if (cause==='wall' && d>3) console.log('wall', ship.name, 's', Math.round(ship.s/16), 'dmg', d.toFixed(1), 'kmh', ship.kmh.toFixed(0)); return d; };
const scr = {};
let steps = 0;
while (R.state !== 'results' && steps < 120 * 300) { R.step(1/120); steps++; for (const e of R.events) if (e.t === 'scrape' && !e.bottom) { const k = Math.round(e.ship.s / 16 / 50) * 50; scr[k] = (scr[k] || 0) + 1; } if (R.events.some(e => e.t==='elim')) console.log('ELIM', R.events.filter(e=>e.t==='elim').map(e=>e.ship.name+' s'+Math.round(e.ship.s/16))); }
R.ships.forEach((s, i) => console.log(s.name.padEnd(18), 'energy', s.energy.toFixed(0), JSON.stringify(Object.fromEntries(Object.entries(dmg[i]).map(([k,v])=>[k, +v.toFixed(1)])))));
console.log('scrape by s(m):', JSON.stringify(Object.entries(scr).sort((a,b)=>b[1]-a[1]).slice(0,12)));
