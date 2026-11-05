import { load } from '../tests/lib/vm.mjs';
const ctx = load(), SN = ctx.SN, DT = 1 / 120;
const R = new SN.Race({ track: 'solenne', mode: 'race', cls: 'spark', seed: 1, entrants: [{ pilot: 'ingrid', team: 'kestrel', control: 'human', player: 0 }, { pilot: 'tomas', team: 'kestrel', control: 'ai' }], intro: false, cheats: { freezeAI: true } });
R.state = 'racing'; R.t = 0; const A = R.ships[0], B = R.ships[1];
SN.Ship.place(A, R, 20 * 16, 0, 900); SN.Ship.place(B, R, 170 * 16, 0, 860); A._lastS = A.s; B._lastS = B.s; R.weapons.give(A, 'rail'); A.pickT = 0;
let k = 0; R.getHuman = () => { k++; return { thrust: 1, analog: true, fire: k < 100, firePressed: k === 1, fireReleased: k === 100 }; };
for (let i = 0; i < 120; i++) { R.step(DT); if (i > 95 && i < 102) console.log(i, 'w', A.weapon, 'charge', A.charge.toFixed(2), 'tg', !!R.weapons.railTarget(A, 48), 'ds', SN.wrapDiff(A.s, B.s, R.track.L).toFixed(0), 'beams', R.weapons.beams.length, R.events.map(e => e.t).join(',')); }
const W = R.weapons; console.log('heading', W.heading(A), 'Au', A.u, 'Bu', B.u, 'B elim', B.elim, B.rescueT, B.ghost, 'track', W.race.track === R.track, 'ships', W.race.ships.length);
